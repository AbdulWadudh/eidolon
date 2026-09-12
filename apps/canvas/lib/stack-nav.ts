export interface StackRoute {
  name: string;
  params?: Record<string, unknown> | undefined;
}

export type OpenMode = "dismissTo" | "replace";

function matches(route: StackRoute, name: string, id: string): boolean {
  return route.name.includes(name) && route.params?.id === id;
}

export function openMode(routes: StackRoute[], name: string, id: string): OpenMode {
  const below = routes.slice(0, -1);
  return below.some((route) => matches(route, name, id)) ? "dismissTo" : "replace";
}
