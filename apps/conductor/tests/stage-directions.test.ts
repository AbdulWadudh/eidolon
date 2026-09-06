import { describe, expect, it } from "bun:test";
import { STAGE_DIRECTIONS } from "@eidolon/config";
import {
  createActionGate,
  hasAction,
  isActionChunk,
  limitActions,
  stripActions,
} from "@/services/stage-directions";

function stream(chunks: string[]): string {
  const gate = createActionGate();
  return `${chunks.map((chunk) => gate.push(chunk)).join("")}${gate.flush()}`;
}

describe("holding actions back while a reply streams", () => {
  it("lets a short beat through once it closes", () => {
    expect(stream(["*sm", "iles*", " Morning."])).toBe("*smiles* Morning.");
  });

  it("emits nothing until the action closes", () => {
    const gate = createActionGate();
    expect(gate.push("*leans")).toBe("");
    expect(gate.push(" in*")).toBe("*leans in*");
  });

  it("drops a paragraph of prose wearing asterisks", () => {
    const prose = "*My heart skips a beat as you lean in closer, your breath on my skin*";
    expect(stream([prose, " Say it again."])).toBe(" Say it again.");
  });

  it("keeps only the first action in a reply", () => {
    expect(stream(["*grins* Sure. *winks*"])).toBe("*grins* Sure. ");
  });

  it("keeps a short action the model never closed", () => {
    expect(stream(["*shrugs"])).toBe("*shrugs*");
  });

  it("drops a long action the model never closed", () => {
    expect(stream([`*${"word ".repeat(STAGE_DIRECTIONS.maxWords + 2)}`])).toBe("");
  });

  it("leaves a reply with no action alone", () => {
    expect(stream(["Morning. ", "How did you sleep?"])).toBe("Morning. How did you sleep?");
  });
});

describe("reading actions in finished text", () => {
  it("trims a line down to its budget", () => {
    expect(limitActions("*grins* Sure thing. *waits for an answer*")).toBe("*grins* Sure thing.");
  });

  it("takes the asterisks off entirely", () => {
    expect(stripActions("*grins* Sure thing.")).toBe("Sure thing.");
  });

  it("spots an action and a chunk that is only an action", () => {
    expect(hasAction("*grins* Sure.")).toBe(true);
    expect(hasAction("Sure.")).toBe(false);
    expect(isActionChunk("*grins*")).toBe(true);
    expect(isActionChunk("*grins* Sure.")).toBe(false);
  });
});
