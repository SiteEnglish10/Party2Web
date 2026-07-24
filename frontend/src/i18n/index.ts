import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import zh from "./zh.json";

export const savedLang = (): "zh" | "en" =>
  (localStorage.getItem("lang") as "zh" | "en") || "zh";

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: savedLang(),
  fallbackLng: "zh",
  interpolation: { escapeValue: false },
});

export default i18n;
