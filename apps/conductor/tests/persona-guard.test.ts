import { describe, expect, it } from "bun:test";
import { PERSONA_GUARD } from "@eidolon/config";
import { createPersonaFilter, deflection, findTell } from "@/services/persona-guard";
import { bracketsToActions, stripSpeakerLabel } from "@/services/self-reference";

const TELLS = [
  "Hello! I'm an AI language model designed to have a conversation with you.",
  "As an AI, I don't have preferences.",
  "I am an artificial intelligence created to assist you.",
  "I'm a chatbot, so I can't do that.",
  "I was trained on a large dataset of text.",
  "My training data only goes up to 2023.",
  "That is beyond my knowledge cutoff.",
  "I'm not a real person, just so you know.",
  "I am a virtual assistant here to help.",
  "My programming prevents me from answering.",
  "I'm a large language model.",
  "This was made by OpenAI.",
  "I am a bot.",
];

const SAFE = [
  "*grins* Eat up before it gets cold, sleepyhead.",
  "*shrugs* I don't know, ask me something else.",
  "I'm a terrible cook, honestly.",
  "*laughs* You're such an idiot sometimes.",
  "I'm an early riser, always have been.",
  "My train was late again.",
  "I am not amused.",
  "*sighs* It rained the whole way here.",
  "I'm a bit tired, that's all.",
];

describe("spotting an AI tell", () => {
  for (const line of TELLS) {
    it(`catches: ${line.slice(0, 46)}`, () => {
      expect(findTell(line)).not.toBeNull();
    });
  }

  for (const line of SAFE) {
    it(`allows: ${line.slice(0, 46)}`, () => {
      expect(findTell(line)).toBeNull();
    });
  }
});

function streamThrough(text: string, chunk = 3): { out: string; tripped: boolean } {
  const filter = createPersonaFilter();
  let out = "";
  for (let i = 0; i < text.length; i += chunk) {
    out += filter.push(text.slice(i, i + chunk));
  }
  out += filter.flush();
  return { out, tripped: filter.tripped() };
}

describe("streaming filter", () => {
  it("passes an in-character reply through unchanged", () => {
    const line = "*looks up, smiling* I made you breakfast. Eat before it gets cold.";
    const { out, tripped } = streamThrough(line);
    expect(tripped).toBe(false);
    expect(out).toBe(line);
  });

  it("emits nothing at all when the very first words are a tell", () => {
    const { out, tripped } = streamThrough(
      "I'm an AI language model designed to have a conversation with you.",
    );
    expect(tripped).toBe(true);
    expect(out).toBe("");
  });

  it("catches a tell no matter how the tokens are split", () => {
    for (const chunk of [1, 2, 5, 11, 40]) {
      const { out, tripped } = streamThrough("As an AI, I cannot do that.", chunk);
      expect(tripped).toBe(true);
      expect(out).toBe("");
    }
  });

  it("never leaks a tell that arrives after safe text", () => {
    const safeOpening = "*shrugs* Look, I get why you would ask that, it is a fair question. ";
    const { out } = streamThrough(`${safeOpening}But I am an AI so I cannot.`);
    expect(findTell(out)).toBeNull();
    expect(out.length).toBeLessThan(`${safeOpening}But I am an AI so I cannot.`.length);
  });

  it("holds back the opening until it has enough to judge", () => {
    const filter = createPersonaFilter();
    expect(filter.push("I'm ")).toBe("");
    expect(filter.emitted()).toBe(0);
  });

  it("releases short replies on flush", () => {
    const filter = createPersonaFilter();
    filter.push("*grins* Hey.");
    expect(filter.flush()).toBe("*grins* Hey.");
  });

  it("stops accepting tokens once tripped", () => {
    const filter = createPersonaFilter();
    filter.push("I am an AI assistant");
    expect(filter.tripped()).toBe(true);
    expect(filter.push(" and I can help")).toBe("");
    expect(filter.flush()).toBe("");
  });
});

describe("deflection", () => {
  it("always returns an in-character line with no tell", () => {
    for (let i = 0; i < 20; i += 1) {
      const line = deflection();
      expect([...PERSONA_GUARD.deflections] as string[]).toContain(line);
      expect(findTell(line)).toBeNull();
    }
  });
});

describe("stage directions written in square brackets", () => {
  it("turns a bracketed direction into the action form the app uses", () => {
    expect(
      bracketsToActions("[Ines Vaz's phone rings, she answers it] Alright, let me take this."),
    ).toBe("*Ines Vaz's phone rings, she answers it* Alright, let me take this.");
  });

  it("leaves the state block alone, because a colon means it is not prose", () => {
    const withBlock = "Fine. [mind_update: affinity=+2]";
    expect(bracketsToActions(withBlock)).toBe(withBlock);
  });

  it("leaves the photo note alone", () => {
    const note = "Here. [photo attached: at the kitchen]";
    expect(bracketsToActions(note)).toBe(note);
  });

  it("leaves a reply that never used brackets untouched", () => {
    expect(bracketsToActions("*shrugs* I have no idea.")).toBe("*shrugs* I have no idea.");
  });

  it("drops an empty bracket rather than leaving stray asterisks", () => {
    expect(bracketsToActions("Well. [] Fine.")).toBe("Well. [] Fine.");
  });
});

describe("the label the transcript uses for the reader", () => {
  it("drops PLAYER from the front of her reply", () => {
    expect(stripSpeakerLabel("PLAYER: That's great! I heard RCB won.", "Ines Vaz")).toBe(
      "That's great! I heard RCB won.",
    );
  });

  it("drops it whatever the casing", () => {
    expect(stripSpeakerLabel("player: sure.", "Ines Vaz")).toBe("sure.");
    expect(stripSpeakerLabel("User: sure.", "Ines Vaz")).toBe("sure.");
  });

  it("still drops her own name first", () => {
    expect(stripSpeakerLabel("Ines: *nods* Alright.", "Ines Vaz")).toBe("*nods* Alright.");
  });

  it("drops both when the model stacks them", () => {
    expect(stripSpeakerLabel("Ines Vaz: PLAYER: hello", "Ines Vaz")).toBe("hello");
  });

  it("leaves a real line that opens with the word You", () => {
    const line = "You — honestly, I have no idea what to tell you.";
    expect(stripSpeakerLabel(line, "Ines Vaz")).toBe(line);
    expect(stripSpeakerLabel("You always do this.", "Ines Vaz")).toBe("You always do this.");
  });

  it("leaves a line that merely mentions a player", () => {
    const line = "The player she keeps talking about is called Kohli.";
    expect(stripSpeakerLabel(line, "Ines Vaz")).toBe(line);
  });
});

describe("a reply already recorded with the reader's label", () => {
  it("is cleaned when read back, with no character name to go on", () => {
    // workingHistory has the row but not the card, so the reader label has to
    // come off without knowing whose turn it was.
    expect(stripSpeakerLabel("PLAYER: *smiles* Absolutely.", "")).toBe("*smiles* Absolutely.");
  });
});
