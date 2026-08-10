import { useAtom } from "jotai";
import { languageState } from "@/state/language";
import { translations } from "@/i18n/translations";

export function useTranslation() {
  const [language, setLanguage] = useAtom(languageState);
  const dictionary = translations[language] ?? translations.vi;

  function t(section: string, key: string): string {
    const sectionValue = (dictionary as Record<string, Record<string, string>>)[section];
    const fallbackSection = (translations.vi as Record<string, Record<string, string>>)[section];
    return sectionValue?.[key] ?? fallbackSection?.[key] ?? `${section}.${key}`;
  }

  return { language, setLanguage, t };
}
