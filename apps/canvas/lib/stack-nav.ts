export interface StackRoute {
  name: string;
  params?: Record<string, unknown> | undefined;
}

export type OpenMode = "dismissTo" | "replace";

function matches(route: StackRoute, name: string, id: string): boolean {
  return route.name.includes(name) && route.params?.id === id;
}

/**
 * How to open a screen that is already reachable another way.
 *
 * A profile is a detail of a chat, not a step on the way to one. Pushing the
 * chat on top of it left the reader three deep, so the back gesture walked them
 * through everywhere they had been instead of out to the roster. If the target
 * is already in the stack the screens above it are dismissed; if it is not, it
 * takes the current screen's place rather than sitting on top of it.
 */
export function openMode(routes: StackRoute[], name: string, id: string): OpenMode {
  // The last route is the screen doing the asking, so it cannot be the target.
  const below = routes.slice(0, -1);
  return below.some((route) => matches(route, name, id)) ? "dismissTo" : "replace";
}
