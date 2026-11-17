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
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Unable to reach SignSpeak API';

    return Promise.reject({
      message,
      status: error.response?.status ?? null,
      code: error.code ?? 'API_ERROR',
    });
  }
);

export { API_BASE_URL };
export default api;
