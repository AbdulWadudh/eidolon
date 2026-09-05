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
