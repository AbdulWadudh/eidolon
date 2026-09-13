import { AUTH } from "@eidolon/config";
import { auth } from "@/auth";
import { setUserRole } from "@/auth/roles";
import { sqlite } from "@/db";

export const TEST_EMAIL = "tests@eidolon.local";
const EMAIL = TEST_EMAIL;
const PASSWORD = "tests-account-password";
const NAME = "Test Owner";

function accountId(): string | null {
  return (
    sqlite.query<{ id: string }, [string]>("SELECT id FROM user WHERE email = ? LIMIT 1").get(EMAIL)
      ?.id ?? null
  );
}

async function openOwnerSession(): Promise<{ id: string; token: string }> {
  if (!accountId()) {
    await auth.api.signUpEmail({ body: { email: EMAIL, password: PASSWORD, name: NAME } });
  }

  const id = accountId();
  if (!id) throw new Error("Could not provision the test account.");

  setUserRole(id, AUTH.ownerRole);

  const signedIn = await auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } });
  if (!signedIn.token) throw new Error("Could not open a test session.");

  return { id, token: signedIn.token };
}

const session = await openOwnerSession();

export const TEST_OWNER_ID = session.id;
export const TEST_TOKEN = session.token;

export const OWNER_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${TEST_TOKEN}`,
};
