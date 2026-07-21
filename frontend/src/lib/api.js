import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errMsg(e, fallback = 'Something went wrong') {
  return e?.response?.data?.detail || e?.message || fallback;
}

export const inr = (n) => `\u20B9${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
