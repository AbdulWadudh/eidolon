import qrcode from "qrcode-terminal";

const ESC = String.fromCharCode(27);
/** Built at runtime so no literal control character appears in the source. */
const MODULE_PATTERN = new RegExp(`${ESC}\\[(40|47)m {2}`, "g");

/**
 * Recovers the QR module matrix from qrcode-terminal's rendered output.
 *
 * The package exposes no matrix API, but its non-small renderer emits exactly
 * one `ESC[40m  ` (dark) or `ESC[47m  ` (light) run per module, which is a
 * stable, parseable contract and avoids pulling in a second QR encoder.
 */
export function buildQrMatrix(payload: string): boolean[][] {
  let raw = "";
  qrcode.generate(payload, { small: false }, (out: string) => {
    raw = out;
  });

  return raw
    .split("\n")
    .map((line) => [...line.matchAll(MODULE_PATTERN)].map((match) => match[1] === "40"))
    .filter((row) => row.length > 0);
}

/**
 * Renders the matrix as an SVG with the 4-module quiet zone the spec requires.
 *
 * A terminal cannot do this for a payload this size: at two columns per module
 * the code alone needs 78 columns, and a correct quiet zone would need 94, so
 * on a standard 80-column terminal the code is emitted with effectively no
 * margin and many scanners reject it.
 */
export function renderQrSvg(matrix: boolean[][], moduleSize = 10, quietModules = 4): string {
  const size = matrix.length;
  const total = (size + quietModules * 2) * moduleSize;

  let rects = "";
  for (let y = 0; y < size; y++) {
    const row = matrix[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const px = (x + quietModules) * moduleSize;
      const py = (y + quietModules) * moduleSize;
      rects += `<rect x="${px}" y="${py}" width="${moduleSize}" height="${moduleSize}"/>`;
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}"`,
    ` viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">`,
    `<rect width="${total}" height="${total}" fill="#ffffff"/>`,
    `<g fill="#000000">${rects}</g>`,
    "</svg>",
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPairingPage(payload: string, server: string, token: string): string {
  const svg = renderQrSvg(buildQrMatrix(payload));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Eidolon pairing</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0D0E11; color:#fff; font-family:system-ui,sans-serif; }
  .card { background:#18191E; border:1px solid #2A2C37; border-radius:14px; padding:28px; text-align:center; }
  .qr { background:#fff; border-radius:10px; padding:8px; display:inline-block; line-height:0; }
  h1 { font-size:18px; margin:0 0 4px; }
  p  { color:#8E95A5; font-size:13px; margin:0 0 20px; }
  dl { display:grid; grid-template-columns:auto 1fr; gap:6px 12px; margin:22px 0 0; text-align:left; font-size:13px; }
  dt { color:#8E95A5; }
  dd { margin:0; font-family:ui-monospace,monospace; word-break:break-all; }
</style>
</head>
<body>
  <div class="card">
    <h1>Scan to pair</h1>
    <p>Open Eidolon on your phone and scan this code.</p>
    <div class="qr">${svg}</div>
    <dl>
      <dt>Server</dt><dd>${escapeHtml(server)}</dd>
      <dt>Token</dt><dd>${escapeHtml(token)}</dd>
    </dl>
  </div>
</body>
</html>`;
}

const CELL_LIGHT = "\u001b[47m  \u001b[0m";
const CELL_DARK = "\u001b[40m  \u001b[0m";

/** Columns a matrix needs at two terminal cells per module. */
export function qrTerminalColumns(matrix: boolean[][], quietModules = 0): number {
  return (matrix.length + quietModules * 2) * 2;
}

/**
 * Renders the code with as much extra quiet zone as the terminal width allows.
 * qrcode-terminal only emits a single module of margin, which many scanners
 * reject against a dark terminal background.
 */
export function renderQrTerminal(matrix: boolean[][], extraQuietModules: number): string {
  const width = matrix.length + extraQuietModules * 2;
  const blankRow = CELL_LIGHT.repeat(width);
  const pad = CELL_LIGHT.repeat(extraQuietModules);

  const rows: string[] = [];
  for (let i = 0; i < extraQuietModules; i++) rows.push(blankRow);
  for (const row of matrix) {
    rows.push(pad + row.map((dark) => (dark ? CELL_DARK : CELL_LIGHT)).join("") + pad);
  }
  for (let i = 0; i < extraQuietModules; i++) rows.push(blankRow);
  return rows.join("\n");
}
