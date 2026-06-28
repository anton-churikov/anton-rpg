// ── COSMETICS CATALOG ───────────────────────────────────────────────────────
// Single source of truth for all purchasable / lootable cosmetics.
// Types: title | theme | avatar | frame | badge   (each type = one equip slot)
// Rarity: common | rare | epic | legendary
//
// `data` is type-specific payload the client uses to render the equipped item:
//   title  → { text }            text shown under the player name
//   avatar → { glyph }           emoji shown as the player avatar
//   frame  → { className }       CSS class applied to the avatar frame
//   badge  → { glyph }           emoji shown next to the player name
//   theme  → { accent, glow }    overrides the --yellow accent + glow
//
// `lootOnly: true` → never sold in the shop, only drops from quests.
// `price` is in coins. Loot drop weighting is derived from rarity.

export const RARITY = {
  common:    { label: 'COMÚN',      price: 50,   cls: 'rar-common',    weight: 60 },
  rare:      { label: 'RARO',       price: 150,  cls: 'rar-rare',      weight: 28 },
  epic:      { label: 'ÉPICO',      price: 400,  cls: 'rar-epic',      weight: 10 },
  legendary: { label: 'LEGENDARIO', price: 1000, cls: 'rar-legendary', weight: 2  },
};

export const SLOT_LABELS = {
  title:  'TÍTULO',
  theme:  'TEMA',
  avatar: 'AVATAR',
  frame:  'MARCO',
  badge:  'INSIGNIA',
};

export const COSMETICS = [
  // ── TITLES ────────────────────────────────────────────────────────────────
  { id: 'title_rookie',      type: 'title',  rarity: 'common',    name: 'El Novato',            data: { text: 'EL NOVATO' } },
  { id: 'title_grinder',     type: 'title',  rarity: 'common',    name: 'El Constante',         data: { text: 'EL CONSTANTE' } },
  { id: 'title_nightowl',    type: 'title',  rarity: 'rare',      name: 'Búho Nocturno',        data: { text: 'BÚHO NOCTURNO' } },
  { id: 'title_relentless',  type: 'title',  rarity: 'epic',      name: 'El Implacable',        data: { text: 'EL IMPLACABLE' } },
  { id: 'title_ascended',    type: 'title',  rarity: 'legendary', name: 'El Ascendido',         data: { text: 'EL ASCENDIDO' } },
  { id: 'title_voidwalker',  type: 'title',  rarity: 'legendary', name: 'Caminante del Vacío',  data: { text: 'CAMINANTE DEL VACÍO' }, lootOnly: true },

  // ── AVATARS ───────────────────────────────────────────────────────────────
  { id: 'avatar_knight',     type: 'avatar', rarity: 'common',    name: 'Caballero',  data: { glyph: '⚔️' } },
  { id: 'avatar_mage',       type: 'avatar', rarity: 'common',    name: 'Mago',       data: { glyph: '🧙' } },
  { id: 'avatar_ninja',      type: 'avatar', rarity: 'rare',      name: 'Ninja',      data: { glyph: '🥷' } },
  { id: 'avatar_dragon',     type: 'avatar', rarity: 'epic',      name: 'Dragón',     data: { glyph: '🐉' } },
  { id: 'avatar_phoenix',    type: 'avatar', rarity: 'legendary', name: 'Fénix',      data: { glyph: '🔥' } },
  { id: 'avatar_alien',      type: 'avatar', rarity: 'legendary', name: 'Visitante',  data: { glyph: '👾' }, lootOnly: true },

  // ── FRAMES ────────────────────────────────────────────────────────────────
  { id: 'frame_bronze',      type: 'frame',  rarity: 'common',    name: 'Marco de Bronce',   data: { className: 'frame-bronze' } },
  { id: 'frame_silver',      type: 'frame',  rarity: 'rare',      name: 'Marco de Plata',    data: { className: 'frame-silver' } },
  { id: 'frame_gold',        type: 'frame',  rarity: 'epic',      name: 'Marco de Oro',      data: { className: 'frame-gold' } },
  { id: 'frame_neon',        type: 'frame',  rarity: 'epic',      name: 'Marco Neón',        data: { className: 'frame-neon' } },
  { id: 'frame_prismatic',   type: 'frame',  rarity: 'legendary', name: 'Marco Prismático',  data: { className: 'frame-prismatic' } },

  // ── BADGES ────────────────────────────────────────────────────────────────
  { id: 'badge_flame',       type: 'badge',  rarity: 'common',    name: 'Llama',      data: { glyph: '🔥' } },
  { id: 'badge_star',        type: 'badge',  rarity: 'common',    name: 'Estrella',   data: { glyph: '⭐' } },
  { id: 'badge_skull',       type: 'badge',  rarity: 'rare',      name: 'Calavera',   data: { glyph: '💀' } },
  { id: 'badge_crown',       type: 'badge',  rarity: 'epic',      name: 'Corona',     data: { glyph: '👑' } },
  { id: 'badge_diamond',     type: 'badge',  rarity: 'legendary', name: 'Diamante',   data: { glyph: '💎' } },

  // ── THEMES ────────────────────────────────────────────────────────────────
  { id: 'theme_default',     type: 'theme',  rarity: 'common',    name: 'Clásico Ámbar',    data: { accent: '#ffdd00', glow: '0 0 10px rgba(255,221,0,0.6)' } },
  { id: 'theme_crimson',     type: 'theme',  rarity: 'rare',      name: 'Carmesí',          data: { accent: '#ff3b5c', glow: '0 0 10px rgba(255,59,92,0.6)' } },
  { id: 'theme_emerald',     type: 'theme',  rarity: 'rare',      name: 'Esmeralda',        data: { accent: '#2bd576', glow: '0 0 10px rgba(43,213,118,0.6)' } },
  { id: 'theme_violet',      type: 'theme',  rarity: 'epic',      name: 'Violeta Real',     data: { accent: '#b06bff', glow: '0 0 10px rgba(176,107,255,0.6)' } },
  { id: 'theme_cyber',       type: 'theme',  rarity: 'epic',      name: 'Cibernético',      data: { accent: '#00e5ff', glow: '0 0 12px rgba(0,229,255,0.7)' } },
  { id: 'theme_void',        type: 'theme',  rarity: 'legendary', name: 'Vacío Estelar',    data: { accent: '#ff00aa', glow: '0 0 14px rgba(255,0,170,0.8)' }, lootOnly: true },
];

const BY_ID = new Map(COSMETICS.map(c => [c.id, c]));

export function getCosmetic(id) {
  return BY_ID.get(id) || null;
}

export function priceOf(item) {
  return RARITY[item.rarity]?.price ?? 0;
}

// Pick a random droppable cosmetic the user does not already own.
// Returns the item or null if nothing is available to drop.
export function rollLoot(ownedIds) {
  const owned = new Set(ownedIds);
  const pool = COSMETICS.filter(c => !owned.has(c.id));
  if (pool.length === 0) return null;
  const total = pool.reduce((s, c) => s + (RARITY[c.rarity]?.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const c of pool) {
    r -= RARITY[c.rarity]?.weight ?? 1;
    if (r <= 0) return c;
  }
  return pool[pool.length - 1];
}
