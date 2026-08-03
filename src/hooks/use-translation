import { useAtom } from "jotai";
import { languageState } from "@/state";
import { translations } from "@/i18n/translations";

type TranslationObject =
  typeof translations.vi;

type Section = keyof TranslationObject;

export function useTranslation() {
  const [language, setLanguage] =
    useAtom(languageState);

  const dictionary =
    translations[language];

  function t<
    S extends Section,
    K extends keyof TranslationObject[S],
  >(
    section: S,
    key: K,
  ): string {
    return String(
      dictionary[section][key],
    );
  }

  return {
    language,
    setLanguage,
    t,
  };
}