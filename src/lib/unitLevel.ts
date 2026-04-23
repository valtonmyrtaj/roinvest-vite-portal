const LEVEL_VALUES = [
  "Garazhë",
  "Përdhesa",
  "Kati 1",
  "Kati 2",
  "Kati 3",
  "Kati 4",
  "Kati 5",
  "Kati 6",
  "Kati 7",
  "Penthouse",
] as const;

export type Level = (typeof LEVEL_VALUES)[number];

export const LEVELS: Level[] = [...LEVEL_VALUES];
