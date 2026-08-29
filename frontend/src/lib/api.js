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
