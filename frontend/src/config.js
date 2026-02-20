// API base URL — empty in production (same-origin), localhost in dev
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export default API_BASE;
