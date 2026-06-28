// Time categories shared by Tiempo (distribution) and Calendar.
// IDs are stable and used as keys in recommendedHours and events.category.

export const DEFAULT_TIME_CATEGORIES = [
  { id:'sleep',   label:'SUEÑO',      color:'#4444aa', icon:'🌙' },
  { id:'work',    label:'TRABAJO',     color:'#1a6bff', icon:'💼' },
  { id:'study',   label:'ESTUDIO',     color:'#aa44ff', icon:'📚' },
  { id:'fitness', label:'EJERCICIO',   color:'#00ff66', icon:'💪' },
  { id:'hobby',   label:'HOBBY',       color:'#ff7700', icon:'🎮' },
  { id:'social',  label:'SOCIAL',      color:'#ff69b4', icon:'👥' },
  { id:'rest',    label:'DESCANSO',    color:'#00d4ff', icon:'☕' },
  { id:'other',   label:'OTRO',        color:'#888888', icon:'◉'  },
]

export const CATEGORY_PALETTE = [
  '#1a6bff','#00d4ff','#00ff66','#ffdd00','#ff7700',
  '#ff2244','#aa44ff','#ff69b4','#4444aa','#888888',
]

// The categories a user sees: their saved list, or the defaults if none yet.
export function getCategories(profile) {
  const list = profile?.timeCategories
  return Array.isArray(list) && list.length ? list : DEFAULT_TIME_CATEGORIES
}

export function newCategoryId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
