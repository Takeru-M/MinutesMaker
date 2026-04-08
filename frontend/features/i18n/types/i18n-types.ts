export type Locale = "ja" | "en";

export type TranslationNode = {
  [key: string]: TranslationNode | string;
};
