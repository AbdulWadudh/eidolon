import { AUTH_ROUTES, apiPath } from "@eidolon/config";
import { auth } from "@/auth";
import { listAccounts } from "@/auth/roles";
import { app } from "@/index";

const password = "fresh-boot-password";

async function signUp(email: string, name: string): Promise<string | null> {
  const response = await app.request(`${AUTH_ROUTES.base}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const body = (await response.json()) as { token?: string };
  return body.token ?? null;
}

const firstToken = await signUp("first@fresh.local", "First");
const secondToken = await signUp("second@fresh.local", "Second");

const session = await app.request(apiPath("session"), {
  headers: { Authorization: `Bearer ${firstToken ?? ""}` },
});

console.log(
  JSON.stringify({
    accounts: listAccounts().map((account) => ({ email: account.email, role: account.role })),
    firstTokenIssued: typeof firstToken === "string" && firstToken.length > 0,
    secondTokenIssued: typeof secondToken === "string" && secondToken.length > 0,
    sessionStatus: session.status,
    sessionBody: await session.json(),
    signInWorks: Boolean(
      (
        await auth.api.signInEmail({
          body: { email: "first@fresh.local", password },
        })
      ).token,
    ),
  }),
);

process.exit(0);
