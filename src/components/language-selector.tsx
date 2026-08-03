import { useAtom } from "jotai";
import { languageState, type Language } from "@/state";

const languages: Array<{
  value: Language;
  label: string;
}> = [
  { value: "vi", label: "VI" },
  { value: "zh", label: "中文" },
  { value: "en", label: "EN" },
];

export default function LanguageSelector() {
  const [language, setLanguage] =
    useAtom(languageState);

  return (
    <select
      value={language}
      onChange={(event) =>
        setLanguage(
          event.target.value as Language,
        )
      }
      className="rounded border border-white/50 bg-transparent px-2 py-1 text-sm text-white"
      aria-label="Chọn ngôn ngữ"
    >
      {languages.map((item) => (
        <option
          key={item.value}
          value={item.value}
          className="text-black"
        >
          {item.label}
        </option>
      ))}
    </select>
  );
}