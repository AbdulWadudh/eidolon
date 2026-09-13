# Signing the app in to the conductor

The app stores a **host** and a **session token**, then holds an authenticated
WebSocket open. There is no pairing step and no shared secret: you sign in with
an email and a password like anything else.

## Flow

1. Start the gateway: `bun run dev:conductor`. It prints the address to sign in
   at, and says so plainly when no account exists yet.
2. In the app, set the address once. It is remembered, and after that it sits on
   the sign-in screen as a single line you can tap to change. A build made with
   `EXPO_PUBLIC_CONDUCTOR_HOST` set already knows it.
3. Sign in, or create an account. **The first account on a conductor becomes its
   owner**; everyone after is a member.
4. On success the app stores the session token and opens
   `ws://<host>/api/v1/ws?token=<session>`. The status line only goes green when
   that socket is actually open.

## What the token gets you

`ownerFor()` resolves a token to an account by looking it up in the `session`
table. Nothing else is accepted — a token that belongs to no live session is
refused, whatever it is.

Every `/api/v1/characters` route sits behind `requireUser`, as does the socket.
Admin routes additionally require the owner role.

Data is scoped to the account behind the token, not to the character id:
messages, chronicles, affinity, mood and the photos in a gallery are all yours
alone. Two people talking to the same public character do not see each other's
conversations.

## If the app cannot reach the conductor

The sign-in screen checks the address when you leave the field and tells you
what it found. If the check fails, the address field reopens and stays open,
because it is then the only thing worth looking at.

- **Same network?** The phone and the machine running the conductor have to be
  able to see each other. `HOST=0.0.0.0` in `apps/conductor/.env` makes the
  gateway listen beyond localhost.
- **Right address?** The gateway prints it on boot. `PUBLIC_URL` overrides what
  it advertises, for a tunnel or a domain.
- **Already signed in elsewhere?** Sessions are per-device. Signing in on a
  second device does not disturb the first.

## If a session stops working

A credential the conductor refuses is not retried forever. After the socket's
backoff runs out the app asks `/api/v1/session` who the token belongs to; if the
answer is nobody, it signs out and returns you to the sign-in screen rather than
sitting there issuing 401s.

Changing `BETTER_AUTH_SECRET` invalidates every session and password hash at
once, so everybody signs in again.
