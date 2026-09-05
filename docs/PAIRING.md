# Pairing the phone with the conductor

The phone stores a **host** and a **token**, verifies them against the gateway,
then holds an authenticated WebSocket open.

## Flow

1. Start the gateway: `bun run dev:conductor`. It prints the LAN IP, the token,
   a deep link, and a QR code.
2. On the phone, scan the QR — or open the manual form and type the Server and
   Token exactly as printed.
3. The app calls `GET /api/pair/verify` with the token. On 401 it refuses to pair
   and says so.
4. On success it stores the credentials and opens
   `ws://<host>/ws?token=<token>`. The status pill turns green only when that
   socket is actually open.

The deep link is:

```
eidolon://pair?server=<lan-ip>:<port>&token=<PAIRING_SECRET>
```

## If the QR won't scan

**Use the browser page:** `http://<lan-ip>:3000/api/pairing/qr`

That page always renders correctly. The terminal often cannot, and the reason is
arithmetic rather than a bug: at two columns per module this payload needs **78
columns**, and the 4-module quiet zone the QR spec requires needs **94**. On a
standard 80-column terminal the code is emitted with effectively no margin, and
scanners routinely reject a code with no quiet zone against a dark background.

The boot banner detects this, prints how many columns you have versus how many
are needed, and points at the page. Widening the terminal past 94 columns also
works. `EIDOLON_QR_SMALL=1` gives the compact half-block rendering, which is
half the width but relies on terminal fonts drawing `▀`/`▄` contiguously — many
don't, and it comes out striped.

Manual entry is always available: the Server and Token are printed on their own
lines in the banner precisely so they can be typed.

## Endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | none | service health; deliberately open for monitoring |
| `GET /api/pairing` | none | pairing payload as JSON |
| `GET /api/pairing/qr` | none | browser-rendered QR page |
| `GET /api/pair/verify` | **Bearer** | confirms a token before the client stores it |
| `GET /ws?token=…` | **query token** | the authenticated socket |

`/health` is unauthenticated on purpose, which is why `/api/pair/verify` exists.
Pairing used to check `/health`, so it only ever proved the host was reachable —
any token at all "paired" successfully and then failed later at the WebSocket
upgrade with nothing explaining why.

## Reconnection

The client reconnects with backoff (1s → 2s → 5s → 10s → 30s).

A rejected token is **not** distinguishable from a downed server at the socket
level: `/ws` returns HTTP 401 *before* the upgrade, so the client only sees a
generic abnormal close. After two consecutive failures it re-checks
`/api/pair/verify` over HTTP; if the token is now refused it stops retrying and
surfaces that, instead of looping forever.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Conductor host unreachable" | phone and machine on different networks; or a firewall blocking the port |
| "This pairing code was rejected" | `PAIRING_SECRET` changed since the QR was generated — restart the gateway and rescan |
| Pill amber and never green | host reachable, socket not — check the gateway log for the upgrade request |
| Pill red immediately | verify passed but the socket failed; usually a firewall allowing HTTP but not WebSocket |

## Security

`PAIRING_SECRET` is the **only** thing gating the WebSocket, and it defaults to a
committed development placeholder. Set a real value before the gateway is
reachable from anywhere you don't control. It is printed in the boot banner and
encoded in the QR, so treat that terminal output as sensitive.
