import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { COSMETICS, RARITY, getCosmetic, priceOf } from '../data/cosmetics.js';

const ITEM_TYPE = 'cosmetic';

function loadPlayer(db, userId) {
  const p = db.prepare('SELECT coins, equipped FROM player_profiles WHERE userId=?').get(userId);
  if (!p) return null;
  let equipped = {};
  try { equipped = JSON.parse(p.equipped || '{}'); } catch {}
  return { coins: p.coins ?? 0, equipped };
}

function ownedIds(db, userId) {
  return new Set(
    db.prepare('SELECT itemId FROM inventory WHERE userId=? AND itemType=?').all(userId, ITEM_TYPE).map(r => r.itemId)
  );
}

function decorate(item, owned, equipped) {
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    rarity: item.rarity,
    rarityLabel: RARITY[item.rarity]?.label ?? item.rarity,
    price: priceOf(item),
    lootOnly: !!item.lootOnly,
    data: item.data,
    owned: owned.has(item.id),
    equipped: equipped[item.type] === item.id,
  };
}

// ── SHOP ────────────────────────────────────────────────────────────────────
export const shopRouter = Router();

// GET /api/shop — full catalog (shop-buyable items) with ownership + equip state
shopRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const player = loadPlayer(db, req.userId);
  if (!player) return res.status(404).json({ error: 'Profile not found' });
  const owned = ownedIds(db, req.userId);
  const catalog = COSMETICS
    .filter(c => !c.lootOnly)                 // loot-only items never appear in the shop
    .map(c => decorate(c, owned, player.equipped));
  res.json({ coins: player.coins, equipped: player.equipped, catalog });
});

// POST /api/shop/buy { itemId }
shopRouter.post('/buy', requireAuth, (req, res) => {
  const db = getDb();
  const { itemId } = req.body;
  const item = getCosmetic(itemId);
  if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });
  if (item.lootOnly) return res.status(400).json({ error: 'Este artículo solo se consigue como botín' });

  const player = loadPlayer(db, req.userId);
  if (!player) return res.status(404).json({ error: 'Profile not found' });

  const owned = ownedIds(db, req.userId);
  if (owned.has(item.id)) return res.status(400).json({ error: 'Ya posees este artículo' });

  const price = priceOf(item);
  if (player.coins < price) return res.status(400).json({ error: 'Monedas insuficientes' });

  const now = new Date().toISOString();
  db.prepare('UPDATE player_profiles SET coins = coins - ?, updatedAt = ? WHERE userId = ?')
    .run(price, now, req.userId);
  db.prepare('INSERT INTO inventory (id,userId,itemType,itemId,quantity,metadata,acquiredAt) VALUES (?,?,?,?,?,?,?)')
    .run(uuid(), req.userId, ITEM_TYPE, item.id, 1, JSON.stringify({ source: 'shop', price }), now);
  db.prepare('INSERT INTO activity_log (id,userId,type,description,xpEarned,coinsEarned,relatedId,createdAt) VALUES (?,?,?,?,?,?,?,?)')
    .run(uuid(), req.userId, 'shop_purchase', `Compra: ${item.name}`, 0, -price, item.id, now);

  const refreshed = loadPlayer(db, req.userId);
  res.json({ success: true, coins: refreshed.coins, item: decorate(item, ownedIds(db, req.userId), refreshed.equipped) });
});

// POST /api/shop/equip { itemId }  — or { slot, itemId: null } to unequip a slot
shopRouter.post('/equip', requireAuth, (req, res) => {
  const db = getDb();
  const { itemId, slot } = req.body;
  const player = loadPlayer(db, req.userId);
  if (!player) return res.status(404).json({ error: 'Profile not found' });
  const equipped = { ...player.equipped };

  if (itemId == null) {
    // Unequip the given slot
    if (!slot) return res.status(400).json({ error: 'Falta el slot a desequipar' });
    delete equipped[slot];
  } else {
    const item = getCosmetic(itemId);
    if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });
    if (!ownedIds(db, req.userId).has(item.id)) return res.status(400).json({ error: 'No posees este artículo' });
    equipped[item.type] = item.id;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE player_profiles SET equipped = ?, updatedAt = ? WHERE userId = ?')
    .run(JSON.stringify(equipped), now, req.userId);
  res.json({ success: true, equipped });
});

// ── INVENTORY / VAULT ───────────────────────────────────────────────────────
export const inventoryRouter = Router();

// GET /api/inventory — every cosmetic the player owns (incl. loot-only drops)
inventoryRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const player = loadPlayer(db, req.userId);
  if (!player) return res.status(404).json({ error: 'Profile not found' });
  const rows = db.prepare('SELECT itemId, metadata, acquiredAt FROM inventory WHERE userId=? AND itemType=? ORDER BY acquiredAt DESC')
    .all(req.userId, ITEM_TYPE);
  const owned = new Set(rows.map(r => r.itemId));
  const items = rows
    .map(r => {
      const item = getCosmetic(r.itemId);
      if (!item) return null;
      let meta = {};
      try { meta = JSON.parse(r.metadata || '{}'); } catch {}
      return { ...decorate(item, owned, player.equipped), source: meta.source || 'shop', acquiredAt: r.acquiredAt };
    })
    .filter(Boolean);
  res.json({ equipped: player.equipped, items });
});
