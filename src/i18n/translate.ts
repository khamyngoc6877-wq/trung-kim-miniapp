import { translations } from "./translations";
import type { Language } from "@/state/language";

function currentLanguage(): Language {
  try {
    const raw = localStorage.getItem("app-language");
    const parsed = raw ? JSON.parse(raw) : "vi";
    return parsed === "zh" || parsed === "en" ? parsed : "vi";
  } catch { return "vi"; }
}

export function translate(section: string, key: string): string {
  const language = currentLanguage();
  const dictionary = translations[language] as Record<string, Record<string, string>>;
  const fallback = translations.vi as Record<string, Record<string, string>>;
  return dictionary[section]?.[key] ?? fallback[section]?.[key] ?? `${section}.${key}`;
}
