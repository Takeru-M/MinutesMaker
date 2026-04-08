import { enMessages } from "@/features/i18n/messages/en";
import { jaMessages } from "@/features/i18n/messages/ja";
import { Locale, TranslationNode } from "@/features/i18n/types/i18n-types";

export const messagesByLocale: Record<Locale, TranslationNode> = {
  ja: jaMessages,
  en: enMessages,
};
