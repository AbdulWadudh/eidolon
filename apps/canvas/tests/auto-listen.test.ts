import { describe, expect, it } from "bun:test";
import { SPEECH } from "@eidolon/config";

describe("the gating thresholds", () => {
  it("waits long enough after a pause that thinking mid-sentence does not send", () => {
    expect(SPEECH.endpointSilenceMs).toBeGreaterThanOrEqual(700);
  });

  it("does not wait so long that a finished turn feels stalled", () => {
    expect(SPEECH.endpointSilenceMs).toBeLessThanOrEqual(1500);
  });

  it("leaves a gap after she stops before reopening the microphone", () => {
    expect(SPEECH.reopenDelayMs).toBeGreaterThan(0);
    expect(SPEECH.reopenDelayMs).toBeLessThan(SPEECH.endpointSilenceMs);
  });

  it("gives up on a turn that never ends well before the watchdog fires", () => {
    expect(SPEECH.endpointSilenceMs).toBeLessThan(SPEECH.commitWatchdogMs);
  });

  it("keeps the session open so gating, not the recogniser, decides the turn", () => {
    expect(SPEECH.continuous).toBe(true);
    expect(SPEECH.autoListen).toBe(true);
  });

  it("asks for the recogniser that actually streams partial results", () => {
    expect(SPEECH.interimResults).toBe(true);
    expect(SPEECH.preferOnDevice).toBe(true);
  });
});
