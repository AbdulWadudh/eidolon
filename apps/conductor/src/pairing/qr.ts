import qrcode from "qrcode-terminal";

const ESC = String.fromCharCode(27);
const MODULE_PATTERN = new RegExp(`${ESC}\\[(40|47)m {2}`, "g");

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

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CELL_LIGHT = "\u001b[47m  \u001b[0m";
const CELL_DARK = "\u001b[40m  \u001b[0m";

export function qrTerminalColumns(matrix: boolean[][], quietModules = 0): number {
  return (matrix.length + quietModules * 2) * 2;
}

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
