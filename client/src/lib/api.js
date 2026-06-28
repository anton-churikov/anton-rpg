// API client — all requests go through here
// Token is stored in localStorage (UI preference, not game data)

const BASE = '/api';

let _syncCallbacks = [];
let _syncTimeout = null;

function notifySync(state) {
  _syncCallbacks.forEach(cb => cb(state));
}

export function onSyncChange(cb) {
  _syncCallbacks.push(cb);
  return () => { _syncCallbacks = _syncCallbacks.filter(c => c !== cb); };
}

function getToken() {
  return localStorage.getItem('anton_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('anton_token', token);
  else localStorage.removeItem('anton_token');
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Show syncing indicator
  notifySync('syncing');
  if (_syncTimeout) clearTimeout(_syncTimeout);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(err.error || 'Request failed', res.status);
    }

    const data = await res.json();
    _syncTimeout = setTimeout(() => notifySync('saved'), 300);
    return data;
  } catch (e) {
    notifySync('error');
    throw e;
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const api = {
  // AUTH
  auth: {
    signup: (data) => request('POST', '/auth/signup', data),
    login: (data) => request('POST', '/auth/login', data),
    logout: () => request('POST', '/auth/logout'),
    me: () => request('GET', '/auth/me'),
  },

  // PLAYER
  player: {
    get: () => request('GET', '/player'),
    update: (data) => request('PATCH', '/player', data),
    awardXP: (amount, reason) => request('POST', '/player/xp', { amount, reason }),
    unlockAchievement: (achievementId) => request('POST', '/player/achievements', { achievementId }),
    setRecommendedHours: (recommendedHours) => request('PUT', '/player/recommended-hours', { recommendedHours }),
  },

  // SKILLS
  skills: {
    list: () => request('GET', '/skills'),
    create: (data) => request('POST', '/skills', data),
    update: (id, data) => request('PATCH', `/skills/${id}`, data),
    awardXP: (id, amount) => request('POST', `/skills/${id}/xp`, { amount }),
    delete: (id) => request('DELETE', `/skills/${id}`),
  },

  // QUESTS
  quests: {
    list: () => request('GET', '/quests'),
    create: (data) => request('POST', '/quests', data),
    update: (id, data) => request('PATCH', `/quests/${id}`, data),
    delete: (id) => request('DELETE', `/quests/${id}`),
  },

  // TASKS
  tasks: {
    list: () => request('GET', '/tasks'),
    create: (data) => request('POST', '/tasks', data),
    update: (id, data) => request('PATCH', `/tasks/${id}`, data),
    delete: (id) => request('DELETE', `/tasks/${id}`),
  },

  // ACTIVITY
  activity: {
    list: () => request('GET', '/activity'),
  },
};

// Events are appended to the api object after initial declaration
// We extend it here:
api.events = {
  list:   (start, end) => {
    let url = '/events'
    const params = []
    if (start) params.push(`start=${start}`)
    if (end)   params.push(`end=${end}`)
    if (params.length) url += '?' + params.join('&')
    return request('GET', url)
  },
  create: (data)     => request('POST',   '/events',     data),
  update: (id, data) => request('PATCH',  `/events/${id}`, data),
  delete: (id)       => request('DELETE', `/events/${id}`),
}

api.timeblocks = {
  list:   (date) => request('GET', `/timeblocks${date ? `?date=${date}` : ''}`),
  create: (data)     => request('POST',   '/timeblocks',      data),
  update: (id, data) => request('PATCH',  `/timeblocks/${id}`, data),
  delete: (id)       => request('DELETE', `/timeblocks/${id}`),
}

// SHOP & INVENTORY (Coins & Cosmetics)
api.shop = {
  catalog: ()          => request('GET',  '/shop'),
  buy:     (itemId)    => request('POST', '/shop/buy',   { itemId }),
  equip:   (itemId)    => request('POST', '/shop/equip', { itemId }),
  unequip: (slot)      => request('POST', '/shop/equip', { itemId: null, slot }),
}

api.inventory = {
  list: () => request('GET', '/inventory'),
}
