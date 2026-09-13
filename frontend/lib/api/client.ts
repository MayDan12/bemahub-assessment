/**
 * Shared axios instance.
 *
 * The request interceptor is wired for you: it attaches the stored bearer
 * token. You should not need to set the Authorization header by hand anywhere
 * else in the app.
 */
import axios from "axios";
import { getStoredToken, useAuthStore } from "@/lib/auth/authStore";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/wp-json/bemalearn/v1";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(new Error("Something went wrong while contacting the server."));
    }

    if (!error.response) {
      return Promise.reject(new Error("Network error. Please check your connection and try again."));
    }

    if (error.response.status === 401) {
      useAuthStore.getState().signOut();
    }

    const payload = error.response.data as { message?: string; code?: string } | undefined;
    const message = payload?.message ?? `Request failed with status ${error.response.status}.`;
    const wrapped = new Error(message);
    Object.assign(wrapped, { response: error.response });
    return Promise.reject(wrapped);
  }
);

export default api;
