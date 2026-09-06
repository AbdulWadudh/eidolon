import { API_PREFIX, adminUrl, apiPath } from "@eidolon/config";
import {
  getLocalIp,
  getPairingHost,
  getServerConfig,
  getServicesConfig,
  getStorageConfig,
} from "@eidolon/config/server";
import { buildQrMatrix, qrTerminalColumns, renderQrTerminal } from "@/pairing/qr";

const RULE_WIDTH = 63;
const LABEL_WIDTH = 16;
const UNSET = "not configured";

function rule(): string {
  return "=".repeat(RULE_WIDTH);
}

function row(label: string, value: string): string {
  return `${label.padEnd(LABEL_WIDTH)}: ${value}`;
}

export interface BannerFacts {
  origin: string;
  apiPrefix: string;
  queues: string;
  storage: string;
  voice: string;
  pairing: string;
}

export function bannerFacts(pairingPayload: string): BannerFacts {
  const { port } = getServerConfig();
  const origin = `http://localhost:${port}`;

  return {
    origin,
    apiPrefix: API_PREFIX,
    queues: adminUrl(`localhost:${port}`, "queues"),
    storage: getStorageConfig().publicUrl || UNSET,
    voice: getServicesConfig().ttsApiUrl || UNSET,
    pairing: pairingPayload,
  };
}

export function renderBanner(pairingPayload: string): string {
  const facts = bannerFacts(pairingPayload);

  return [
    "",
    rule(),
    "EIDOLON CONDUCTOR GATEWAY ACTIVE",
    row("API & WebSocket", `${facts.origin}${facts.apiPrefix}`),
    row("Bull-Board", facts.queues),
    row("RustFS S3", facts.storage),
    row("Kokoro voice", facts.voice),
    row("Pairing URI", facts.pairing),
    rule(),
    "",
  ].join("\n");
}

export function renderPairingQr(pairingPayload: string, columns: number): string {
  const matrix = buildQrMatrix(pairingPayload);
  const quiet = Math.max(0, Math.min(4, Math.floor((columns - qrTerminalColumns(matrix)) / 4)));
  const { port } = getServerConfig();

  const lines = [
    renderQrTerminal(matrix, quiet),
    "",
    row("Server", getPairingHost()),
    row("Scannable page", `http://${getLocalIp()}:${port}${apiPath("pairingQr")}`),
  ];

  if (quiet < 2) {
    lines.push(
      "",
      `This terminal is ${columns} columns wide; a reliable quiet zone needs ${qrTerminalColumns(
        matrix,
        4,
      )}.`,
      "Widen it, open the page above, or type the server and token by hand.",
    );
  }

  return `${lines.join("\n")}\n`;
}
