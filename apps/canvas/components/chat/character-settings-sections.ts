import { CHARACTER_COPY } from "@eidolon/config";
import type { SegmentedOption } from "@/components/ui/segmented";
import type { FieldKey } from "@/store/character-draft";

export type SectionKey = "identity" | "mind" | "voice" | "sharing";

export const SECTION_OPTIONS: SegmentedOption<SectionKey>[] = [
  { value: "identity", label: CHARACTER_COPY.sectionIdentity },
  { value: "mind", label: CHARACTER_COPY.sectionMind },
  { value: "voice", label: CHARACTER_COPY.sectionVoice },
  { value: "sharing", label: CHARACTER_COPY.sectionSharing },
];

interface SectionSpec {
  fields: FieldKey[];
}

/**
 * Nine fields in one scroll is what made the sheet read as a form dump. They
 * are grouped by what you would come here to change: her name and opening line,
 * the writing that shapes her, how she sounds, and who else can meet her.
 */
export const SECTIONS: Record<SectionKey, SectionSpec> = {
  identity: { fields: ["name", "tagline", "greeting"] },
  mind: { fields: ["personality", "scenario", "rules", "exampleDialogue", "systemPrompt"] },
  voice: { fields: [] },
  sharing: { fields: [] },
};

const BLURBS: Record<SectionKey, string> = {
  identity: CHARACTER_COPY.identityBlurb,
  mind: CHARACTER_COPY.mindBlurb,
  voice: CHARACTER_COPY.voiceBlurb,
  sharing: CHARACTER_COPY.sharingBlurb,
};

export function sectionBlurb(section: SectionKey): string {
  return BLURBS[section];
}
