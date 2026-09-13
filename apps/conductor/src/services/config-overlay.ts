let overlay = new Map<string, unknown>();
let generation = 0;

export function applyOverlay(next: Map<string, unknown>): number {
  overlay = next;
  generation += 1;
  return generation;
}

export function overlaySize(): number {
  return overlay.size;
}

export function overlayGeneration(): number {
  return generation;
}

export function overlayValue(path: string): unknown {
  return overlay.get(path);
}

export function overlayEntries(): Record<string, unknown> {
  return Object.fromEntries(overlay);
}

export function resolvedGroup<T extends object>(name: string, shipped: T): T {
  return new Proxy(shipped, {
    get(target, key, receiver) {
      if (typeof key !== "string") return Reflect.get(target, key, receiver);
      const override = overlay.get(`${name}.${key}`);
      return override === undefined ? Reflect.get(target, key, receiver) : override;
    },
  });
}
