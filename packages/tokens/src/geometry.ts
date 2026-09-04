export const GEOMETRY = {
  cardRadius: 10,
  buttonRadius: 8,
  inputRadius: 8,
  hairlineBorderWidth: 1,
} as const;

export type GeometryKey = keyof typeof GEOMETRY;
export type GeometryValue = (typeof GEOMETRY)[GeometryKey];
