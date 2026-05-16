/**
 * Axios client with auth interceptors.
 *
 * Extracted from App.jsx during Sprint 3 so every module can import
 * `apiClient` without pulling in the entire App tree.
 */
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/** Absolute base for REST calls, e.g. "http://localhost:8000/api". */
export const API = `${BACKEND_URL}/api`;

/** Pre-configured axios instance — attaches JWT and handles 401. */
export const apiClient = axios.create({
  baseURL: API,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  },
);
