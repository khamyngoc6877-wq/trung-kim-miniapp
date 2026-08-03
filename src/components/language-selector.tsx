import { useState } from "react";
import { useAtom } from "jotai";
import { Button, Sheet } from "zmp-ui";

import {
  languageState,
  type Language,
} from "@/state";

const LANGUAGE_OPTIONS: Array<{
  value: Language;
  label: string;
}> = [
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
  const [language, setLanguage] =
    useAtom(languageState);

  const [visible, setVisible] =
    useState(false);

  const currentLanguage =
    LANGUAGE_OPTIONS.find(
      (item) =>
        item.value === language,
    ) ?? LANGUAGE_OPTIONS[0];

  return (
    <>
      <Button
        size="small"
        variant="tertiary"
        onClick={() =>
          setVisible(true)
        }
      >
        {currentLanguage.label}
      </Button>

      <Sheet
        visible={visible}
        autoHeight
        title="Ngôn ngữ"
        onClose={() =>
          setVisible(false)
        }
      >
        <div className="space-y-2 p-4">
          {LANGUAGE_OPTIONS.map(
            (item) => (
              <button
                key={item.value}
                type="button"
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left ${
                  language ===
                  item.value
                    ? "border-primary text-primary"
                    : "border-gray-200"
                }`}
                onClick={() => {
                  setLanguage(
                    item.value,
                  );

                  setVisible(false);
                }}
              >
                <span>
                  {item.label}
                </span>

                {language ===
                  item.value && (
                  <span>✓</span>
                )}
              </button>
            ),
          )}
        </div>
      </Sheet>
    </>
  );
}