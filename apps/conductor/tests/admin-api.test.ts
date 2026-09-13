import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { AUTH, AUTH_ROUTES, adminApiPath, apiPath, PROMPT_KEYS } from "@eidolon/config";
import {
  AdminAccountListSchema,
  AdminCharacterViewSchema,
  AdminPromptListSchema,
  AdminThemeViewSchema,
} from "@eidolon/protocol";
import { DEFAULT_THEME_TOKENS } from "@eidolon/tokens";
import { isLastOwner } from "@/api/admin/users";
import { countOwners, deleteAccount } from "@/auth/roles";
import { clearAudit } from "@/db/audit";
import { getCharacter } from "@/db/characters";
import { removeOverridesUnder } from "@/db/overrides";
import { app } from "@/index";
import { loadPrompts } from "@/prompts/store";
import { THEME_PREFIX } from "@/services/theme";
import { TEST_TOKEN } from "./support/session";

const MEMBER_EMAIL = "admin-api-member@eidolon.test";
const MEMBER_PASSWORD = "admin-api-password";

const OWNER = { "Content-Type": "application/json", Authorization: `Bearer ${TEST_TOKEN}` };

let memberHeaders: Record<string, string> = {};
const madeAccounts = new Set<string>();
const madeCharacters = new Set<string>();

async function signInMember(): Promise<string> {
  const attempt = async (path: string, body: Record<string, string>) =>
    app.request(`${AUTH_ROUTES.base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const created = await attempt("/sign-up/email", {
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    name: "Admin API Member",
  });

  const source = created.ok
    ? created
    : await attempt("/sign-in/email", { email: MEMBER_EMAIL, password: MEMBER_PASSWORD });

  const body = (await source.json()) as { token?: string; user?: { id?: string } };
  if (body.user?.id) madeAccounts.add(body.user.id);
  return body.token ?? "";
}

beforeAll(async () => {
  await loadPrompts();
  const token = await signInMember();
  memberHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
});

afterAll(() => {
  for (const id of madeCharacters) {
    void app.request(adminApiPath("characters", id), { method: "DELETE", headers: OWNER });
  }
  for (const id of madeAccounts) deleteAccount(id);
  removeOverridesUnder(THEME_PREFIX);
  clearAudit();
  madeAccounts.clear();
  madeCharacters.clear();
});

const SURFACES = ["prompts", "characters", "users", "theme"] as const;

describe("the admin gate", () => {
  it("refuses every surface without a credential", async () => {
    for (const surface of SURFACES) {
      const response = await app.request(adminApiPath(surface));
      expect(response.status).toBe(401);
    }
  });

  it("answers a member 403 on every surface, never a 200 over empty data", async () => {
    for (const surface of SURFACES) {
      const response = await app.request(adminApiPath(surface), { headers: memberHeaders });
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(403);
      expect(body.error).toBe("This needs the owner account.");
      expect(Object.keys(body)).toEqual(["error"]);
    }
  });

  it("refuses a member's writes too, not only its reads", async () => {
    const writes = [
      app.request(adminApiPath("characters"), {
        method: "POST",
        headers: memberHeaders,
        body: JSON.stringify({ name: "Should Not Exist" }),
      }),
      app.request(adminApiPath("theme"), {
        method: "PATCH",
        headers: memberHeaders,
        body: JSON.stringify({ primary: "#000000" }),
      }),
      app.request(adminApiPath("prompts", PROMPT_KEYS[0] ?? "x"), {
        method: "PUT",
        headers: memberHeaders,
        body: JSON.stringify({ value: "nope" }),
      }),
    ];

    for (const response of await Promise.all(writes)) {
      expect(response.status).toBe(403);
    }
  });

  it("lets the owner through on every surface", async () => {
    for (const surface of SURFACES) {
      const response = await app.request(adminApiPath(surface), { headers: OWNER });
      expect(response.status).toBe(200);
    }
  });
});

describe("admin prompts", () => {
  it("lists prompts in a protocol shape", async () => {
    const response = await app.request(adminApiPath("prompts"), { headers: OWNER });
    const parsed = AdminPromptListSchema.safeParse(await response.json());

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.prompts.length).toBe(PROMPT_KEYS.length);
  });

  it("answers 404 on an unknown key rather than a cheerful 200", async () => {
    const read = await app.request(adminApiPath("prompts", "not-a-prompt"), { headers: OWNER });
    const written = await app.request(adminApiPath("prompts", "not-a-prompt"), {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify({ value: "anything" }),
    });
    const reset = await app.request(adminApiPath("prompts", "not-a-prompt"), {
      method: "DELETE",
      headers: OWNER,
    });

    expect(read.status).toBe(404);
    expect(written.status).toBe(404);
    expect(reset.status).toBe(404);
  });

  it("writes a prompt and resets it back to the shipped default", async () => {
    const key = PROMPT_KEYS[0] ?? "";

    const written = await app.request(adminApiPath("prompts", key), {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify({ value: "A deliberately odd value." }),
    });
    const afterWrite = (await written.json()) as { prompt: { value: string; isCustom: boolean } };

    expect(written.status).toBe(200);
    expect(afterWrite.prompt.value).toBe("A deliberately odd value.");
    expect(afterWrite.prompt.isCustom).toBe(true);

    const reset = await app.request(adminApiPath("prompts", key), {
      method: "DELETE",
      headers: OWNER,
    });
    const afterReset = (await reset.json()) as { prompt: { isCustom: boolean } };

    expect(reset.status).toBe(200);
    expect(afterReset.prompt.isCustom).toBe(false);
  });
});

describe("admin characters", () => {
  it("creates, reads back, edits and removes one", async () => {
    const created = await app.request(adminApiPath("characters"), {
      method: "POST",
      headers: OWNER,
      body: JSON.stringify({ name: "Admin Api Fixture", tagline: "made by a test" }),
    });
    const view = AdminCharacterViewSchema.safeParse(await created.json());

    expect(created.status).toBe(201);
    expect(view.success).toBe(true);
    if (!view.success) return;

    const id = view.data.character.id;
    madeCharacters.add(id);

    const patched = await app.request(adminApiPath("characters", id), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ rules: "Never lie." }),
    });
    const afterPatch = (await patched.json()) as { character: { rules: string } };

    expect(patched.status).toBe(200);
    expect(afterPatch.character.rules).toBe("Never lie.");

    const removed = await app.request(adminApiPath("characters", id), {
      method: "DELETE",
      headers: OWNER,
    });

    expect(removed.status).toBe(200);
    expect(getCharacter(id)).toBeNull();
    madeCharacters.delete(id);
  });

  it("answers 404 on a miss instead of writing nothing and reporting success", async () => {
    const patched = await app.request(adminApiPath("characters", "ghost-character"), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ rules: "x" }),
    });
    const removed = await app.request(adminApiPath("characters", "ghost-character"), {
      method: "DELETE",
      headers: OWNER,
    });

    expect(patched.status).toBe(404);
    expect(removed.status).toBe(404);
  });
});

describe("admin users", () => {
  it("lists accounts in a protocol shape", async () => {
    const response = await app.request(adminApiPath("users"), { headers: OWNER });
    const parsed = AdminAccountListSchema.safeParse(await response.json());

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.accounts.length).toBeGreaterThan(0);
  });

  it("promotes and demotes a member", async () => {
    const id = [...madeAccounts][0] ?? "";

    const promoted = await app.request(adminApiPath("users", id), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ role: AUTH.ownerRole }),
    });
    expect(((await promoted.json()) as { account: { role: string } }).account.role).toBe(
      AUTH.ownerRole,
    );

    const demoted = await app.request(adminApiPath("users", id), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ role: AUTH.memberRole }),
    });
    expect(((await demoted.json()) as { account: { role: string } }).account.role).toBe(
      AUTH.memberRole,
    );
  });

  it("refuses to demote or delete the last owner", async () => {
    const owners = await app.request(adminApiPath("users"), { headers: OWNER });
    const { accounts } = (await owners.json()) as { accounts: { id: string; role: string }[] };
    const owning = accounts.filter((account) => account.role === AUTH.ownerRole);

    expect(owning.length).toBeGreaterThan(0);
    expect(countOwners()).toBe(owning.length);

    if (owning.length > 1) {
      expect(isLastOwner(owning[0]?.id ?? "")).toBe(false);
      return;
    }

    const lastOwner = owning[0]?.id ?? "";
    expect(isLastOwner(lastOwner)).toBe(true);

    const demoted = await app.request(adminApiPath("users", lastOwner), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ role: AUTH.memberRole }),
    });
    const removed = await app.request(adminApiPath("users", lastOwner), {
      method: "DELETE",
      headers: OWNER,
    });

    expect(demoted.status).toBe(409);
    expect(removed.status).toBe(403);
  });

  it("answers 404 for an account that is not there", async () => {
    const response = await app.request(adminApiPath("users", "no-such-account"), {
      headers: OWNER,
    });
    expect(response.status).toBe(404);
  });
});

describe("admin theme", () => {
  it("knows exactly the tokens the package ships", async () => {
    const response = await app.request(adminApiPath("theme"), { headers: OWNER });
    const parsed = AdminThemeViewSchema.safeParse(await response.json());

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(Object.keys(parsed.data.tokens).sort()).toEqual(
      Object.keys(DEFAULT_THEME_TOKENS).sort(),
    );
  });

  it("overrides a token, reports it, and resets it", async () => {
    const patched = await app.request(adminApiPath("theme"), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ primary: "#123456", radius: 22 }),
    });
    const afterPatch = (await patched.json()) as {
      tokens: { primary: string; radius: number; canvas: string };
      overrides: Record<string, unknown>;
    };

    expect(patched.status).toBe(200);
    expect(afterPatch.tokens.primary).toBe("#123456");
    expect(afterPatch.tokens.radius).toBe(22);
    expect(afterPatch.tokens.canvas).toBe(DEFAULT_THEME_TOKENS.canvas);
    expect(afterPatch.overrides).toEqual({ primary: "#123456", radius: 22 });

    const reset = await app.request(adminApiPath("theme", "primary"), {
      method: "DELETE",
      headers: OWNER,
    });
    const afterReset = (await reset.json()) as { tokens: { primary: string } };

    expect(afterReset.tokens.primary).toBe(DEFAULT_THEME_TOKENS.primary);

    const cleared = await app.request(adminApiPath("theme"), { method: "DELETE", headers: OWNER });
    const afterClear = (await cleared.json()) as { overrides: Record<string, unknown> };

    expect(afterClear.overrides).toEqual({});
  });

  it("refuses a token it does not ship", async () => {
    const unknownToken = await app.request(adminApiPath("theme", "notAToken"), {
      method: "DELETE",
      headers: OWNER,
    });
    const notOverridden = await app.request(adminApiPath("theme", "canvas"), {
      method: "DELETE",
      headers: OWNER,
    });

    expect(unknownToken.status).toBe(404);
    expect(notOverridden.status).toBe(404);
  });

  it("ignores a key that is not a theme token in a patch", async () => {
    const response = await app.request(adminApiPath("theme"), {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify({ primary: "#abcdef", somethingElse: "nope" }),
    });
    const body = (await response.json()) as { overrides: Record<string, unknown> };

    expect(Object.keys(body.overrides)).toEqual(["primary"]);

    await app.request(adminApiPath("theme"), { method: "DELETE", headers: OWNER });
  });
});

describe("the older prompts routes", () => {
  it("no longer answers anyone without an owner credential", async () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await signInMember()}`,
    };

    const anonymous = await app.request(apiPath("prompts"));
    const member = await app.request(apiPath("prompts"), { headers });

    expect(anonymous.status).toBe(401);
    expect(member.status).toBe(403);
  });

  it("still answers the owner exactly as it used to", async () => {
    const response = await app.request(apiPath("prompts"), { headers: OWNER });
    const body = (await response.json()) as { prompts: { key: string }[] };

    expect(response.status).toBe(200);
    expect(body.prompts.length).toBe(PROMPT_KEYS.length);
  });

  it("guards writing a single prompt too", async () => {
    const key = PROMPT_KEYS[0] ?? "";
    const refused = await app.request(`${apiPath("prompts")}/${key}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await signInMember()}`,
      },
      body: JSON.stringify({ value: "nope" }),
    });

    expect(refused.status).toBe(403);
  });
});
