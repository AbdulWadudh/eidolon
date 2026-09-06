import { CHAT } from "@eidolon/config";

export interface ScrollFrame {
  contentHeight: number;
  viewportHeight: number;
  offsetY: number;
}

export function distanceFromBottom(frame: ScrollFrame): number {
  return frame.contentHeight - frame.viewportHeight - frame.offsetY;
}

export function isWithinLiveEdge(frame: ScrollFrame): boolean {
  return distanceFromBottom(frame) <= CHAT.liveEdgeThresholdPx;
}

export function nextLiveEdge(frame: ScrollFrame, isDragging: boolean, current: boolean): boolean {
  if (isWithinLiveEdge(frame)) return true;
  return isDragging ? false : current;
}

export interface LiveEdgeInput {
  /** True from the moment a finger starts dragging. */
  isDragging: boolean;
  /** True while the list is being driven to an older message by code. */
  isFocusing: boolean;
  current: boolean;
}

/**
 * Whether the feed should still follow new content.
 *
 * A jump to an older message starts at the bottom, so the opening frames of its
 * animation are inside the live edge. Reading those re-armed the follow and
 * carried the reader back down a moment after arriving, which is why a scroll
 * driven by code is ignored entirely rather than merely discounted.
 */
export function trackLiveEdge(frame: ScrollFrame, input: LiveEdgeInput): boolean {
  if (input.isFocusing) return input.current;
  return nextLiveEdge(frame, input.isDragging, input.current);
}
