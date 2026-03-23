/**
 * api.js – Axios instance wired to the Express backend.
 * JWT is stored in localStorage and injected on every request.
 * On 401 the user is redirected to /login.
 */
import axios from 'axios';

const API = axios.create({
  baseURL: '/api',           // Next.js rewrites → http://localhost:5000/api
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
API.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cf_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 ────────────────────────────────────────
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('cf_token');
      localStorage.removeItem('cf_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:    (body) => API.post('/auth/login',    body),
  register: (body) => API.post('/auth/register', body),
  me:       ()     => API.get('/auth/me'),
};

// ── Logs ─────────────────────────────────────────────────────────────────────
export const logsAPI = {
  getAll:  (params) => API.get('/logs',         { params }),
  ingest:  (body)   => API.post('/logs/ingest', body),
  analyze: (logs)   => API.post('/logs/analyze',{ logs }),
  getById: (id)     => API.get(`/logs/${id}`),
};

// ── Incidents ─────────────────────────────────────────────────────────────────
export const incidentsAPI = {
  getAll:       (params)             => API.get('/incidents',                { params }),
  correlate:    (events, windowMins) => API.post('/incidents/correlate',     { events, timeWindowMinutes: windowMins }),
  getML:        ()                   => API.get('/incidents/ml'),
  setStatus:    (id, status)         => API.patch(`/incidents/${id}/status`, { status }),
  getRules:     ()                   => API.get('/incidents/rules'),
  getRuleStore: ()                   => API.get('/incidents/store'),
  importRules:  (rules)              => API.post('/incidents/import-rules',  { rules }),
  exportRules:  ()                   => API.get('/incidents/export-rules'),
  deleteRule:   (ruleId)             => API.delete(`/incidents/rules/${ruleId}`),
};

// ── Forensics ─────────────────────────────────────────────────────────────────
export const forensicsAPI = {
  preserve:          (body)           => API.post('/forensics/preserve',                    body),
  verify:            ()               => API.post('/forensics/verify'),
  getChain:          ()               => API.get('/forensics/chain'),
  getStats:          ()               => API.get('/forensics/stats'),
  analyzeTimeline:   (logs)           => API.post('/forensics/timeline/analyze',            { logs }),
  getAnomalies:      ()               => API.get('/forensics/timeline/anomalies'),
  getTimelineMetrics:()               => API.get('/forensics/timeline/metrics'),
  searchEntity:      (entity, field)  => API.get(`/forensics/timeline/search/${encodeURIComponent(entity)}`, { params: { field } }),
  analyzeIdentity:   (body)           => API.post('/forensics/identity/analyze',            body),
  getIdentityHistory:(limit = 100)    => API.get('/forensics/identity/history',             { params: { limit } }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats:   () => API.get('/dashboard/stats'),
  getMlHealth:() => API.get('/dashboard/ml-health'),
  getRecent:  () => API.get('/dashboard/recent'),
};

// ── System Test ───────────────────────────────────────────────────────────────
export const systemAPI = {
  runSmokeTest: () => API.post('/system/smoke-test'),
  seedDemo:     () => API.post('/system/seed-demo'),
};

export default API;

