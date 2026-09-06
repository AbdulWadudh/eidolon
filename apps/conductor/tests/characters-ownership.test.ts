import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ensureLocalOwner } from "@/auth/session";
import { createCharacter, getCharacter, listCharacters } from "@/db/characters";
import { getLoreEntries, upsertLoreEntry } from "@/db/lorebook";
import { app } from "@/index";
import { loadPrompts } from "@/prompts/store";
import { AUTHED, BASE, remember, wipe } from "./support/characters";

beforeEach(async () => {
  await loadPrompts();
});

afterEach(wipe);

describe("ownership", () => {
  it("refuses an edit from nobody", async () => {
    const created = remember(createCharacter({ name: "Unowned Guard" }));

    const res = await app.request(`${BASE}/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: "x" }),
    });

    expect(res.status).toBe(401);
  });

  it("edits in place what the owner authored", async () => {
    const owner = await ensureLocalOwner();
    const created = remember(createCharacter({ name: "Mine", ownerId: owner?.id ?? null }));

    const res = await app.request(`${BASE}/${created.id}`, {
      method: "PATCH",
      headers: AUTHED,
      body: JSON.stringify({ rules: "Never lie." }),
    });
    const body = (await res.json()) as { character: { id: string }; forked: boolean };

    expect(res.status).toBe(200);
    expect(body.forked).toBe(false);
    expect(body.character.id).toBe(created.id);
  });

  it("forks what somebody else authored, and leaves theirs alone", async () => {
    const created = remember(
      createCharacter({ name: "Someone Elses", rules: "Original", ownerId: "another-account" }),
    );
    upsertLoreEntry(created.id, {
      keys: ["secret"],
      content: "carried over",
      requiredAffinity: 20,
    });

    const res = await app.request(`${BASE}/${created.id}`, {
      method: "PATCH",
      headers: AUTHED,
      body: JSON.stringify({ rules: "Changed" }),
    });
    const body = (await res.json()) as {
      character: { id: string; rules: string; forkedFrom: string | null };
      forked: boolean;
    };

    remember(body.character);
    expect(res.status).toBe(201);
    expect(body.forked).toBe(true);
    expect(body.character.id).not.toBe(created.id);
    expect(body.character.rules).toBe("Changed");
    expect(body.character.forkedFrom).toBe(created.id);

    // The original is untouched, and the fork carries her lore.
    expect(getCharacter(created.id)?.rules).toBe("Original");
    expect(getLoreEntries(body.character.id)).toHaveLength(1);
  });

  it("tells the caller whether an edit would change or fork a character", async () => {
    const owner = await ensureLocalOwner();
    const mine = remember(createCharacter({ name: "Answer Mine", ownerId: owner?.id ?? null }));
    const theirs = remember(createCharacter({ name: "Answer Theirs", ownerId: "another-account" }));
    const unclaimed = remember(createCharacter({ name: "Answer Unclaimed" }));

    const read = async (id: string, headers?: Record<string, string>) => {
      const res = await app.request(`${BASE}/${id}`, { headers });
      return (await res.json()) as { isMine: boolean };
    };

    expect((await read(mine.id, AUTHED)).isMine).toBe(true);
    expect((await read(theirs.id, AUTHED)).isMine).toBe(false);
    // Nobody has claimed her, so the first person to edit adopts her.
    expect((await read(unclaimed.id, AUTHED)).isMine).toBe(true);
    // Without a token there is no owner to compare against.
    expect((await read(mine.id)).isMine).toBe(false);
  });

  it("forks a published character into a private copy, which its new owner may publish", async () => {
    const theirs = remember(
      createCharacter({ name: "Published Stranger", ownerId: "another-account", isPublic: true }),
    );

    const forkRes = await app.request(`${BASE}/${theirs.id}`, {
      method: "PATCH",
      headers: AUTHED,
      body: JSON.stringify({ rules: "Mine now" }),
    });
    const fork = (await forkRes.json()) as {
      character: { id: string; isPublic: boolean };
      forked: boolean;
    };
    remember(fork.character);

    expect(fork.forked).toBe(true);
    // Anyone may edit what they can see, but the copy starts private whatever
    // the original's visibility was.
    expect(fork.character.isPublic).toBe(false);
    expect(getCharacter(theirs.id)?.isPublic).toBe(true);

    const publishRes = await app.request(`${BASE}/${fork.character.id}/publish`, {
      method: "POST",
      headers: AUTHED,
      body: JSON.stringify({ isPublic: true }),
    });

    expect(publishRes.status).toBe(200);
    expect(getCharacter(fork.character.id)?.isPublic).toBe(true);
  });

  it("publishes only what the owner authored", async () => {
    const owner = await ensureLocalOwner();
    const mine = remember(createCharacter({ name: "Publishable", ownerId: owner?.id ?? null }));
    const theirs = remember(createCharacter({ name: "Not Mine", ownerId: "another-account" }));

    const ok = await app.request(`${BASE}/${mine.id}/publish`, {
      method: "POST",
      headers: AUTHED,
      body: JSON.stringify({ isPublic: true }),
    });
    expect(ok.status).toBe(200);
    expect(getCharacter(mine.id)?.isPublic).toBe(true);

    const refused = await app.request(`${BASE}/${theirs.id}/publish`, {
      method: "POST",
      headers: AUTHED,
      body: JSON.stringify({ isPublic: true }),
    });
    expect(refused.status).toBe(403);
  });

  it("shows the owner their own, anything published, and nothing else", async () => {
    const owner = await ensureLocalOwner();
    const mine = remember(createCharacter({ name: "Roster Mine", ownerId: owner?.id ?? null }));
    const published = remember(
      createCharacter({ name: "Roster Public", ownerId: "another-account", isPublic: true }),
    );
    const hidden = remember(createCharacter({ name: "Roster Hidden", ownerId: "another-account" }));

    const ids = listCharacters(owner?.id).map((entry) => entry.id);
    expect(ids).toContain(mine.id);
    expect(ids).toContain(published.id);
    expect(ids).not.toContain(hidden.id);
  });
});
