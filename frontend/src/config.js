// API base URL — Railway backend in production, localhost in dev
const API_BASE = import.meta.env.DEV 
  ? '' 
  : 'https://moneymauling-rift-26-production.up.railway.app';

export default API_BASE;
