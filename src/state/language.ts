import { atomWithStorage } from "jotai/utils";

export type Language = "vi" | "zh" | "en";

export const languageState =
  atomWithStorage<Language>(
    "app-language",
    "vi",
  );