/**
 * Shared Axios instance for the MERN backend (/api).
 * Injects Bearer token from localStorage and redirects to /login on HTTP 401.
 */
import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const axiosInstance = axios.create({
  baseURL: apiBase,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('careconnect360_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('careconnect360_token');
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;