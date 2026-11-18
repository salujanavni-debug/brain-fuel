import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    const message =
      data?.error?.message ||
      data?.detail ||
      data?.message ||
      error.message ||
      'Unable to reach SignSpeak API';

    return Promise.reject({
      message,
      status: error.response?.status ?? null,
      code: data?.error?.code ?? error.code ?? 'API_ERROR',
    });
  }
);

export { API_BASE_URL };
export default api;
