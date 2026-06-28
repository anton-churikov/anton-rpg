// Shared player-profile serializer. Parses JSON columns and resolves the
// equipped cosmetic IDs into full objects so the client can render them
// without needing its own copy of the catalog.
import { getCosmetic } from './data/cosmetics.js';

export function formatProfile(p) {
  if (!p) return null;
  const unlockedAchievements = typeof p.unlockedAchievements === 'string'
    ? JSON.parse(p.unlockedAchievements || '[]')
    : (p.unlockedAchievements || []);
  let equipped = {};
  try {
    equipped = typeof p.equipped === 'string' ? JSON.parse(p.equipped || '{}') : (p.equipped || {});
  } catch { equipped = {}; }

  let recommendedHours = {};
  try {
    recommendedHours = typeof p.recommendedHours === 'string' ? JSON.parse(p.recommendedHours || '{}') : (p.recommendedHours || {});
  } catch { recommendedHours = {}; }

  let timeCategories = [];
  try {
    timeCategories = typeof p.timeCategories === 'string' ? JSON.parse(p.timeCategories || '[]') : (p.timeCategories || []);
  } catch { timeCategories = []; }

  // Resolve equipped IDs → display objects { slot: {id,type,name,rarity,data} }
  const equippedCosmetics = {};
  for (const [slot, id] of Object.entries(equipped)) {
    const item = getCosmetic(id);
    if (item) equippedCosmetics[slot] = { id: item.id, type: item.type, name: item.name, rarity: item.rarity, data: item.data };
  }

  return {
    ...p,
    coins: p.coins ?? 0,
    unlockedAchievements,
    equipped,
    equippedCosmetics,
    recommendedHours,
    timeCategories,
  };
}
