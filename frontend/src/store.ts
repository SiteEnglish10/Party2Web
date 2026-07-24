import { create } from "zustand";

export type Lang = "zh" | "en";

export interface Site {
  site_name: string;
  location: string;
  sponsor_text: string;
  sponsor_text_zh: string;
  sponsor_text_en: string;
  sponsor_qr_url: string | null;
  traffic_limit_gb: number;
}

interface AppState {
  token: string | null;
  isAdmin: boolean;
  lang: Lang;
  site: Site | null;
  setToken: (t: string | null) => void;
  setLang: (l: Lang) => void;
  setSite: (s: Site) => void;
}

// 匿名身份 token（用于留言作者标识；本期不做删除，仍预留）
export function anonToken(): string {
  let t = localStorage.getItem("anon_token");
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem("anon_token", t);
  }
  return t;
}

const initToken = localStorage.getItem("admin_token");

export const useStore = create<AppState>((set) => ({
  token: initToken,
  isAdmin: !!initToken,
  lang: (localStorage.getItem("lang") as Lang) || "zh",
  site: null,
  setToken: (t) => {
    if (t) localStorage.setItem("admin_token", t);
    else localStorage.removeItem("admin_token");
    set({ token: t, isAdmin: !!t });
  },
  setLang: (l) => {
    localStorage.setItem("lang", l);
    set({ lang: l });
  },
  setSite: (s) => set({ site: s }),
}));
