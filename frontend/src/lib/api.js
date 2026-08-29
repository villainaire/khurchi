import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("khurchi_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const setAuthToken = (token) => {
  if (token) localStorage.setItem("khurchi_token", token);
  else localStorage.removeItem("khurchi_token");
};

export const getAuthToken = () => localStorage.getItem("khurchi_token");

export const fileUrl = (path) => `${API}/files/${path}`;

export const errMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((x) => {
        if (typeof x === "string") return x;
        const field = Array.isArray(x?.loc) ? x.loc.filter((p) => p !== "body").join(".") : "";
        const msg = x?.msg || "Invalid value";
        return field ? `${field}: ${msg}` : msg;
      })
      .join(", ");
  }
  if (d && typeof d === "object") return d.msg || JSON.stringify(d);
  if (!err?.response && typeof err?.message === "string") return err.message;
  return fallback;
};
