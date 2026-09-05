#!/usr/bin/env bun
/**
 * Prints the storage settings for the local S3 container.
 *
 * The values are not constant: `S3_PUBLIC_URL` has to be the machine's LAN
 * address, because the phone resolves it, and a handset pointed at 127.0.0.1 is
 * looking at itself. That address changes with the network, so it is derived
 * here rather than written down once and quietly going stale.
 */
import { networkInterfaces } from "node:os";

const S3_PORT = 9000;
const CONSOLE_PORT = 9001;

/** First non-internal IPv4 address, i.e. the one a phone on the LAN can reach. */
function getLocalIp(): string {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }
  return "127.0.0.1";
}

const ip = getLocalIp();

console.log(`
  Object storage is up.

    S3 API   http://127.0.0.1:${S3_PORT}
    Console  http://127.0.0.1:${CONSOLE_PORT}   (eidolon / eidolon_local_dev)

  apps/conductor/.env should read:

    S3_ENDPOINT="http://127.0.0.1:${S3_PORT}"
    S3_BUCKET="eidolon-media"
    S3_ACCESS_KEY="eidolon"
    S3_SECRET_KEY="eidolon_local_dev"
    S3_PUBLIC_URL="http://${ip}:${S3_PORT}/eidolon-media"
    S3_FORCE_PATH_STYLE="true"

  S3_PUBLIC_URL is what the phone fetches media from, so it carries this
  machine's LAN address (${ip}). If you change networks, re-run this and
  update that one line.
`);
