import { TranslationNode } from "@/features/i18n/types/i18n-types";

export const getMessageByKey = (messages: TranslationNode, key: string): string => {
  const value = key.split(".").reduce<unknown>((acc, current) => {
    if (typeof acc === "object" && acc !== null && current in acc) {
      return (acc as Record<string, unknown>)[current];
    }
    return undefined;
  }, messages);

  return typeof value === "string" ? value : key;
};
