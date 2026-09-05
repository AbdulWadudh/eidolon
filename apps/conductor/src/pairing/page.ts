import { apiPath, EASING, STATIC_ROUTES, UI_MS } from "@eidolon/config";
import { COLORS, GEOMETRY, TYPOGRAPHY } from "@eidolon/tokens";
import { buildQrMatrix, escapeHtml, renderQrSvg } from "@/pairing/qr";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600&display=swap";

function styles(): string {
  return `
:root {
  --canvas: ${COLORS.canvas};
  --card: ${COLORS.card};
  --border: ${COLORS.cardBorder};
  --accent: ${COLORS.accentAmber};
  --accent-deep: ${COLORS.accentAmberHover};
  --text: ${COLORS.textPrimary};
  --muted: ${COLORS.textMuted};
  --success: ${COLORS.success};
  --radius: ${GEOMETRY.cardRadius}px;
  --radius-sm: ${GEOMETRY.buttonRadius}px;
  --hairline: ${GEOMETRY.hairlineBorderWidth}px;
  --sans: "${TYPOGRAPHY.fonts.sans}", system-ui, sans-serif;
  --serif: "${TYPOGRAPHY.fonts.serif}", Georgia, serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --ease-out: ${EASING.out};
  --reveal: ${UI_MS.reveal}ms;
  --press: ${UI_MS.pressFeedback}ms;
}
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 32px 20px;
  background: var(--canvas); color: var(--text); font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}
body::before {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(680px 420px at 50% -8%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%),
    radial-gradient(520px 380px at 92% 105%, color-mix(in srgb, var(--accent-deep) 11%, transparent), transparent 72%);
}
body::after {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: .35;
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--border) 55%, transparent) var(--hairline), transparent var(--hairline)),
    linear-gradient(to bottom, color-mix(in srgb, var(--border) 55%, transparent) var(--hairline), transparent var(--hairline));
  background-size: 46px 46px;
  mask-image: radial-gradient(760px 520px at 50% 38%, #000 0%, transparent 78%);
}
.shell { position: relative; z-index: 1; width: 100%; max-width: 400px; }
.brand {
  display: flex; align-items: center; gap: 10px; margin: 0 0 18px; padding-left: 2px;
}
.brand img { width: 26px; height: 26px; display: block; }
.brand span {
  font-weight: 700; font-size: ${TYPOGRAPHY.sizes.sm}px; letter-spacing: .16em; text-transform: uppercase;
}
.brand .ver {
  margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--muted);
  border: var(--hairline) solid var(--border); border-radius: 999px; padding: 3px 9px;
}
.card {
  background: var(--card); border: var(--hairline) solid var(--border); border-radius: var(--radius);
  padding: 24px; box-shadow: 0 22px 60px -28px rgba(0,0,0,.9);
}
h1 {
  font-family: var(--serif); font-weight: 600; font-size: 25px; line-height: 1.15;
  margin: 0 0 6px; letter-spacing: -.01em;
}
.sub { color: var(--muted); font-size: ${TYPOGRAPHY.sizes.sm}px; line-height: 1.55; margin: 0 0 20px; }
.stage { position: relative; padding: 14px; width: max-content; max-width: 100%; margin: 0 auto; }
.stage::before, .stage::after {
  content: ""; position: absolute; width: 26px; height: 26px; pointer-events: none;
  border: 2px solid var(--accent); border-radius: 3px;
}
.stage::before { top: 0; left: 0; border-right: 0; border-bottom: 0; }
.stage::after { bottom: 0; right: 0; border-left: 0; border-top: 0; }
.qr {
  background: #fff; border-radius: var(--radius-sm); padding: 10px; line-height: 0; display: block;
}
.qr svg { width: 216px; max-width: 100%; height: auto; display: block; }
.status {
  display: flex; align-items: center; gap: 9px; margin: 18px 0 0;
  border: var(--hairline) solid var(--border); border-radius: var(--radius-sm);
  padding: 10px 12px; font-size: ${TYPOGRAPHY.sizes.sm}px;
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex: none; position: relative; }
.dot::after {
  content: ""; position: absolute; inset: -4px; border-radius: 50%;
  border: var(--hairline) solid var(--accent); opacity: .55;
  animation: halo 2.2s var(--ease-out) infinite;
}
.status[data-state="paired"] .dot { background: var(--success); }
.status[data-state="paired"] .dot::after { border-color: var(--success); animation: none; opacity: 0; }
.status[data-state="offline"] .dot { background: var(--muted); }
.status[data-state="offline"] .dot::after { animation: none; opacity: 0; }
@keyframes halo { 0% { transform: scale(.7); opacity: .6; } 70%, 100% { transform: scale(1.5); opacity: 0; } }
.status-text { color: var(--muted); }
.status[data-state="paired"] .status-text { color: var(--text); }
.rows { margin: 14px 0 0; display: grid; gap: 8px; }
.row {
  display: flex; align-items: center; gap: 12px;
  border: var(--hairline) solid var(--border); border-radius: var(--radius-sm); padding: 10px 10px 10px 12px;
}
.row .k { color: var(--muted); font-size: ${TYPOGRAPHY.sizes.xs}px; width: 52px; flex: none; }
.row .v {
  font-family: var(--mono); font-size: ${TYPOGRAPHY.sizes.sm}px; color: var(--text);
  overflow-wrap: anywhere; min-width: 0; flex: 1;
}
.copy {
  flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-width: 44px; min-height: 32px; padding: 0 10px; cursor: pointer;
  background: transparent; color: var(--muted); font: inherit; font-size: ${TYPOGRAPHY.sizes.xs}px;
  border: var(--hairline) solid var(--border); border-radius: var(--radius-sm);
  transition: color var(--press) var(--ease-out), border-color var(--press) var(--ease-out),
              transform var(--press) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .copy:hover { color: var(--text); border-color: color-mix(in srgb, var(--accent) 55%, var(--border)); }
  summary:hover { color: var(--text); }
}
.copy:active { transform: scale(.96); }
.copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.copy svg { width: 14px; height: 14px; }
.copy .done { display: none; }
.copy[data-copied="true"] { color: var(--success); border-color: color-mix(in srgb, var(--success) 55%, var(--border)); }
.copy[data-copied="true"] .idle { display: none; }
.copy[data-copied="true"] .done { display: inline; }
details { margin: 14px 0 0; }
summary {
  list-style: none; cursor: pointer; color: var(--muted); font-size: ${TYPOGRAPHY.sizes.xs}px;
  display: inline-flex; align-items: center; gap: 6px; min-height: 32px;
  transition: color var(--press) var(--ease-out);
}
summary::-webkit-details-marker { display: none; }
summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
summary svg { width: 13px; height: 13px; transition: transform var(--press) var(--ease-out); }
details[open] summary svg { transform: rotate(90deg); }
.help {
  margin: 10px 0 0; padding: 12px 14px; color: var(--muted);
  font-size: ${TYPOGRAPHY.sizes.xs}px; line-height: 1.7;
  border: var(--hairline) solid var(--border); border-radius: var(--radius-sm);
}
.help ol { margin: 0; padding-left: 18px; }
.help li + li { margin-top: 5px; }
details[open] .help { animation: disclose ${UI_MS.disclosure}ms var(--ease-out) both; }
@keyframes disclose { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.reveal { opacity: 0; transform: translateY(10px); animation: reveal var(--reveal) var(--ease-out) forwards; }
@keyframes reveal { to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .reveal { transform: none; animation-name: fade; animation-duration: ${UI_MS.revealReduced}ms; }
  details[open] .help { animation-name: fade; }
  .dot::after { animation: none; opacity: .4; }
  .copy:active { transform: none; }
}
@keyframes fade { to { opacity: 1; } }
`;
}

const ICON_COPY = `<svg class="idle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;
const ICON_DONE = `<svg class="done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const ICON_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

function copyRow(label: string, value: string, delay: number): string {
  const safe = escapeHtml(value);
  return `<div class="row reveal" style="animation-delay:${delay}ms">
  <span class="k">${escapeHtml(label)}</span>
  <span class="v" id="v-${label.toLowerCase()}">${safe}</span>
  <button class="copy" type="button" data-copy="${safe}" aria-label="Copy ${escapeHtml(label)}">
    ${ICON_COPY}${ICON_DONE}
  </button>
</div>`;
}

function script(): string {
  return `
for (const b of document.querySelectorAll(".copy")) {
  b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { return; }
    b.dataset.copied = "true";
    b.setAttribute("aria-live", "polite");
    clearTimeout(b._t);
    b._t = setTimeout(() => { b.dataset.copied = "false"; }, ${UI_MS.copyFeedback});
  });
}
const el = document.getElementById("status");
const label = document.getElementById("status-text");
async function poll() {
  try {
    const r = await fetch("${apiPath("pairingStatus")}", { cache: "no-store" });
    const { devices } = await r.json();
    el.dataset.state = devices > 0 ? "paired" : "waiting";
    label.textContent = devices > 0
      ? devices + (devices === 1 ? " device paired" : " devices paired")
      : "Waiting for a device to scan";
  } catch {
    el.dataset.state = "offline";
    label.textContent = "Conductor unreachable";
  }
}
poll();
setInterval(poll, ${UI_MS.pairingStatusPoll});
`;
}

export function renderPairingPage(payload: string, server: string, token: string): string {
  const svg = renderQrSvg(buildQrMatrix(payload));
  const s = UI_MS.revealStagger;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<title>Pair a device &middot; Eidolon</title>
<link rel="icon" href="${STATIC_ROUTES.logo}"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="${FONT_HREF}"/>
<style>${styles()}</style>
</head>
<body>
<main class="shell">
  <header class="brand reveal">
    <img src="${STATIC_ROUTES.logo}" alt="Eidolon"/>
    <span>Eidolon</span>
    <span class="ver">conductor</span>
  </header>

  <section class="card reveal" style="animation-delay:${s}ms">
    <h1>Scan to pair</h1>
    <p class="sub">Open Eidolon on your phone and point the camera here. The code carries the server address and token.</p>

    <div class="stage reveal" style="animation-delay:${s * 2}ms">
      <div class="qr">${svg}</div>
    </div>

    <div class="status reveal" id="status" data-state="waiting" style="animation-delay:${s * 3}ms">
      <span class="dot" aria-hidden="true"></span>
      <span class="status-text" id="status-text" role="status">Waiting for a device to scan</span>
    </div>

    <div class="rows">
      ${copyRow("Server", server, s * 4)}
      ${copyRow("Token", token, s * 5)}
    </div>

    <details class="reveal" style="animation-delay:${s * 6}ms">
      <summary>${ICON_CHEVRON}Camera not working?</summary>
      <div class="help">
        <ol>
          <li>Open Eidolon and choose <strong>Enter manually</strong> on the pairing screen.</li>
          <li>Type the Server and Token values above &mdash; use the copy buttons if the phone is on this machine.</li>
          <li>Both devices must be on the same network for the server address to resolve.</li>
        </ol>
      </div>
    </details>
  </section>
</main>
<script>${script()}</script>
</body>
</html>`;
}
