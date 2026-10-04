import { createContext, useContext, ReactNode } from "react";
import { Language } from "@common/types";
import { useConfig } from "@/shared/api/queries";
import { useSaveConfig } from "@/shared/api/mutations";
import { TRANSLATIONS } from "./translations";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language: Language = useConfig().data?.language ?? "en";
  const saveConfig = useSaveConfig();

  const setLanguage = (next: Language) => saveConfig.mutate({ language: next });

  const t = (key: string, params?: Record<string, string | number>): string => {
    const template = TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key] ?? key;
    return interpolate(template, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within a LanguageProvider");
  return ctx;
}
