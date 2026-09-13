import { UI_MS } from "@eidolon/config";
import { FadeIn, FadeInDown } from "react-native-reanimated";

export function revealAt(index: number, reduced: boolean) {
  if (reduced) return FadeIn.duration(UI_MS.revealReduced);

  const step = Math.min(index, UI_MS.revealStaggerCap);
  return FadeInDown.duration(UI_MS.reveal).delay(step * UI_MS.revealStagger);
}

export function disclose(reduced: boolean) {
  return reduced ? FadeIn.duration(UI_MS.revealReduced) : FadeIn.duration(UI_MS.disclosure);
}
