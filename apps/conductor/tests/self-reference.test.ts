import { describe, expect, it } from "bun:test";
import { firstName, narratesInThirdPerson, stripSpeakerLabel } from "@/services/self-reference";

describe("firstName", () => {
  it("takes the given name off a full one", () => {
    expect(firstName("Halima Osei")).toBe("Halima");
    expect(firstName("Cass")).toBe("Cass");
  });
});

describe("stripSpeakerLabel", () => {
  it("removes the label the model copied from the examples", () => {
    expect(stripSpeakerLabel("Halima: *nods* That sounds rough.", "Halima Osei")).toBe(
      "*nods* That sounds rough.",
    );
  });

  it("removes a full name label too", () => {
    expect(stripSpeakerLabel("Dr Wren Abara - Forty seconds.", "Dr Wren Abara")).toBe(
      "Forty seconds.",
    );
  });

  it("ignores case", () => {
    expect(stripSpeakerLabel("CASS: hello", "Cass Delaney")).toBe("hello");
  });

  it("leaves an ordinary reply alone", () => {
    expect(stripSpeakerLabel("That sounds rough.", "Halima Osei")).toBe("That sounds rough.");
  });

  it("does not eat a name used inside the sentence", () => {
    const line = "Halima said the same thing yesterday.";
    expect(stripSpeakerLabel(line, "Nadia Kerr")).toBe(line);
  });
});

describe("narratesInThirdPerson", () => {
  it("catches a reply written as a stage script", () => {
    expect(narratesInThirdPerson("Cass leans against the bar, arms crossed.", "Cass Delaney")).toBe(
      true,
    );
  });

  it("catches the character writing about herself as she", () => {
    expect(narratesInThirdPerson("Halima nods, then she looks away.", "Halima Osei")).toBe(true);
  });

  it("leaves a first person reply alone", () => {
    expect(narratesInThirdPerson("*leans on the bar* Rough one?", "Cass Delaney")).toBe(false);
    expect(narratesInThirdPerson("I missed you today.", "Cass Delaney")).toBe(false);
  });

  it("allows the character to say her own name", () => {
    expect(narratesInThirdPerson("Cass. That is what everyone calls me.", "Cass Delaney")).toBe(
      false,
    );
  });

  it("does not trip on a name inside an action", () => {
    expect(narratesInThirdPerson("*Cass waves* hey you", "Cass Delaney")).toBe(false);
  });

  it("is quiet on an empty reply", () => {
    expect(narratesInThirdPerson("", "Cass Delaney")).toBe(false);
  });
});
