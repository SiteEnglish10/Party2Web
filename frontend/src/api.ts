import axios from "axios";

import { useStore } from "./store";

export const http = axios.create({ baseURL: "/api" });

http.interceptors.request.use((config) => {
  const token = useStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const lang = useStore.getState().lang;
  config.params = { lang, ...(config.params || {}) };
  return config;
});

// ---- 类型 ----
export interface Tool {
  id: number;
  key: string;
  name: string;
  name_zh: string;
  name_en: string;
  desc: string;
  desc_zh: string;
  desc_en: string;
  icon: string;
  runtime: "front" | "backend";
  tool_type: string;
  config: Record<string, unknown>;
  usage: number;
}
export interface Category {
  id: number;
  name: string;
  name_zh: string;
  name_en: string;
  icon: string;
  sort_order: number;
  tools: Tool[];
}
export interface Announcement {
  id: number;
  title: string;
  title_zh: string;
  title_en: string;
  body: string;
  body_zh: string;
  body_en: string;
  image_url: string | null;
  created_at: string;
}
export interface FormField {
  id: number;
  label: string;
  label_zh: string;
  label_en: string;
  field_type: "text" | "textarea" | "radio" | "checkbox";
  options: { value_zh: string; value_en: string }[];
  required: boolean;
}
export interface FormDef {
  id: number;
  title: string;
  title_zh: string;
  title_en: string;
  active: boolean;
  fields: FormField[];
}
export interface Comment {
  id: number;
  author_name: string;
  author_token: string;
  body: string;
  likes: number;
  created_at: string;
}

// ---- API ----
export const api = {
  site: () => http.get("/site").then((r) => r.data),
  updateSite: (b: object) => http.put("/site", b).then((r) => r.data),

  login: (username: string, password: string) =>
    http.post("/auth/login", { username, password }).then((r) => r.data),

  categories: () => http.get<Category[]>("/categories").then((r) => r.data),
  recommended: (range: string) =>
    http.get<Tool[]>("/tools/recommended", { params: { range } }).then((r) => r.data),
  search: (q: string) =>
    http.get<Tool[]>("/tools/search", { params: { q } }).then((r) => r.data),
  recordUse: (id: number) => http.post(`/tools/${id}/use`).then((r) => r.data),

  createCategory: (b: object) => http.post("/categories", b).then((r) => r.data),
  updateCategory: (id: number, b: object) => http.put(`/categories/${id}`, b).then((r) => r.data),
  deleteCategory: (id: number) => http.delete(`/categories/${id}`).then((r) => r.data),
  reorderCategories: (ids: number[]) =>
    http.put("/categories/reorder", { ordered_ids: ids }).then((r) => r.data),
  reorderTools: (cid: number, ids: number[]) =>
    http.put(`/categories/${cid}/reorder-tools`, { ordered_ids: ids }).then((r) => r.data),

  createTool: (b: object) => http.post("/tools", b).then((r) => r.data),
  updateTool: (id: number, b: object) => http.put(`/tools/${id}`, b).then((r) => r.data),
  deleteTool: (id: number) => http.delete(`/tools/${id}`).then((r) => r.data),
  assignTool: (id: number, category_id: number, mode: string, from_category?: number) =>
    http.post(`/tools/${id}/assign`, { category_id, mode }, { params: { from_category } })
      .then((r) => r.data),

  announcements: () => http.get<Announcement[]>("/announcements").then((r) => r.data),
  createAnnouncement: (b: object) => http.post("/announcements", b).then((r) => r.data),
  updateAnnouncement: (id: number, b: object) => http.put(`/announcements/${id}`, b).then((r) => r.data),
  deleteAnnouncement: (id: number) => http.delete(`/announcements/${id}`).then((r) => r.data),

  activeForms: () => http.get<FormDef[]>("/forms/active").then((r) => r.data),
  allForms: () => http.get<FormDef[]>("/forms").then((r) => r.data),
  createForm: (b: object) => http.post("/forms", b).then((r) => r.data),
  updateForm: (id: number, b: object) => http.put(`/forms/${id}`, b).then((r) => r.data),
  deleteForm: (id: number) => http.delete(`/forms/${id}`).then((r) => r.data),
  submitForm: (id: number, data: object) => http.post(`/forms/${id}/submit`, { data }).then((r) => r.data),
  submissions: (id: number) => http.get(`/forms/${id}/submissions`).then((r) => r.data),

  comments: () => http.get<Comment[]>("/comments").then((r) => r.data),
  createComment: (b: object) => http.post("/comments", b).then((r) => r.data),
  likeComment: (id: number) => http.post(`/comments/${id}/like`).then((r) => r.data),
  deleteComment: (id: number) => http.delete(`/comments/${id}`).then((r) => r.data),

  sponsor: () => http.get("/sponsor").then((r) => r.data),
  updateSponsor: (b: object) => http.put("/sponsor", b).then((r) => r.data),

  convertCapabilities: () => http.get("/convert/capabilities").then((r) => r.data),

  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post("/uploads/image", fd).then((r) => r.data as { url: string });
  },
  uploadQr: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post("/uploads/qr", fd).then((r) => r.data as { url: string });
  },
};
