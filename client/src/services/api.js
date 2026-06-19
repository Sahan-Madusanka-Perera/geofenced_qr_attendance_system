const API_BASE = '/api';

/**
 * Get stored auth token.
 */
function getToken() {
  return localStorage.getItem('auth_token');
}

/**
 * Set auth token.
 */
function setToken(token) {
  localStorage.setItem('auth_token', token);
}

/**
 * Remove auth token.
 */
function removeToken() {
  localStorage.removeItem('auth_token');
}

/**
 * Make an authenticated API request.
 */
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle non-JSON responses (e.g., file downloads)
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// ── Auth API ──────────────────────────────────────────────────
export async function register(userData) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function login(credentials) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function getMe() {
  return apiFetch('/auth/me');
}

export function logout() {
  removeToken();
}

// ── Sessions API ──────────────────────────────────────────────
export async function getSessions() {
  return apiFetch('/sessions');
}

export async function createSession(courseId, classroomId) {
  return apiFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify({ courseId, classroomId }),
  });
}

export async function stopSession(sessionId) {
  return apiFetch(`/sessions/${sessionId}/stop`, { method: 'PATCH' });
}

export async function getAttendees(sessionId) {
  return apiFetch(`/sessions/${sessionId}/attendees`);
}

// ── Attendance API ────────────────────────────────────────────
export async function checkIn(data) {
  return apiFetch('/attendance/checkin', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Analytics API ─────────────────────────────────────────────
export async function getStudentStats() {
  return apiFetch('/analytics/student');
}

export async function getStudentHistory(courseId) {
  return apiFetch(`/analytics/student/history/${courseId}`);
}

export async function getCourseStats(courseId) {
  return apiFetch(`/analytics/course/${courseId}`);
}

export async function getLecturerCourses() {
  return apiFetch('/analytics/courses');
}

export async function downloadCSV(courseId) {
  const response = await apiFetch(`/analytics/export/csv/${courseId}`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${courseId}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function downloadExcel(courseId) {
  const response = await apiFetch(`/analytics/export/excel/${courseId}`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${courseId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ── Geofences API ─────────────────────────────────────────────
export async function getClassrooms() {
  return apiFetch('/geofences');
}

export async function createClassroom(data) {
  return apiFetch('/geofences', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── SSE Helper ────────────────────────────────────────────────
export function getQRStreamUrl(sessionId) {
  const token = getToken();
  return `${API_BASE}/qr/stream/${sessionId}?token=${token}`;
}

export { getToken, setToken, removeToken };
