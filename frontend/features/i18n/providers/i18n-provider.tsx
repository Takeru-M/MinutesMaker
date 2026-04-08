"use client";

import { createContext, useMemo, useState } from "react";

import { messagesByLocale } from "@/features/i18n/messages";
import { Locale } from "@/features/i18n/types/i18n-types";
import { getMessageByKey } from "@/features/i18n/utils/get-message-by-key";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  children: React.ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>("ja");

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, vars?: Record<string, string>) => {
      const raw = getMessageByKey(messagesByLocale[locale], key);

      if (!vars) {
        return raw;
      }

      return Object.entries(vars).reduce((acc, [varKey, varValue]) => {
        return acc.replaceAll(`{{${varKey}}}`, varValue);
      }, raw);
    };

    return {
      locale,
      setLocale,
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
