import { useTranslation } from "@/hooks/use-translation";
import type { Language } from "@/state";
import { Select } from "zmp-ui";

const languageOptions = [
  {
    value: "vi",
    label: "🇻🇳 Tiếng Việt",
  },
  {
    value: "zh",
    label: "🇨🇳 中文",
  },
  {
    value: "en",
    label: "🇬🇧 English",
  },
];

export default function LanguageSelector() {
  const {
    language,
    setLanguage,
  } = useTranslation();

  return (
    <Select
      value={language}
      onChange={(value) =>
        setLanguage(
          value as Language,
        )
      }
    >
      {languageOptions.map(
        (option) => (
          <Select.Option
            key={option.value}
            value={option.value}
            title={option.label}
          />
        ),
      )}
    </Select>
  );
}