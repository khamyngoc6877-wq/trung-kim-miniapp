import { keywordState } from "@/state";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "zmp-ui";
import type { InputProps, InputRef } from "zmp-ui/input";
import { useTranslation } from "@/hooks/use-translation";

const SearchBar = (props: InputProps) => {
  const [localKeyword, setLocalKeyword] = useState("");
  const [, setKeyword] = useAtom(keywordState);
  const inputRef = useRef<InputRef>(null);
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    if (location.pathname === "/search" && inputRef.current) {
      inputRef.current.input?.focus();
    }

    return () => {
      setKeyword("");
    };
  }, [location.pathname, setKeyword]);

  return (
    <Input.Search
      ref={inputRef}
      size="small"
      placeholder={t("header", "searchPlaceholder")}
      className="m-0 border-none outline-none"
      style={{
        viewTransitionName: "search-bar",
      }}
      value={localKeyword}
      onChange={(event) =>
        setLocalKeyword(event.currentTarget.value)
      }
      onKeyUp={(event) => {
        if (event.key === "Enter") {
          setKeyword(localKeyword);
        }
      }}
      onBlur={() => setKeyword(localKeyword)}
      clearable
      {...props}
    />
  );
};

export default SearchBar;
