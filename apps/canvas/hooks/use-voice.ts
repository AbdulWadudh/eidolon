import { pronounsFor, render } from "@eidolon/config";
import * as React from "react";
import { useAffinityStore } from "@/store/affinity-store";

export type Say = (template: string) => string;

export function useVoice(): Say {
  const pronouns = useAffinityStore((state) => state.pronouns);

  return React.useCallback(
    (template: string) => {
      const set = pronounsFor(pronouns);
      return render(template, {
        they: set.subject,
        them: set.object,
        their: set.possessive,
        They: capitalise(set.subject),
        Them: capitalise(set.object),
        Their: capitalise(set.possessive),
        s: set.s,
        es: set.es,
        has: set.has,
        is: set.is,
        was: set.was,
      });
    },
    [pronouns],
  );
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
