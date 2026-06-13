const express = require('express');
const router  = express.Router();
const User    = require('./model');
const { authMiddleware } = require('./auth');
const { calcIncome, SECONDS_36, METERS_PER_SEC, LOCATION_INCOME } = require('./income');

router.use(authMiddleware);

/* ═══════════════════════════════════════════════════
   ОБЩАЯ idle-ЛОГИКА: начисление дохода по времени.
   Вызывается при любом обращении к серверу.
   Меняет user в памяти (coins НЕ трогает — только collectorPending).
═══════════════════════════════════════════════════ */
function accrue(user) {
  const now      = Date.now();
  const lastTick = new Date(user.lastTick || user.createdAt || now).getTime();
  const elapsed  = Math.max(0, (now - lastTick) / 1000);

  if (elapsed <= 0) { user.lastTick = new Date(now); return 0; }

  // Истечение локаций по времени
  ensureLocExpiry(user, now);

  const earned = calcIncome({
    currentLoc:     user.currentLoc,
    locIncome:      user.locIncome || {},
    elapsedSec:     elapsed,
    capSeconds:     user.capSeconds || 14400,
    skinBonusUntil: user.skinBonus || 0,
    nowMs:          now,
  });

  if (earned > 0) {
    user.collectorPending = (user.collectorPending || 0) + earned;
    // totalDist растёт по времени (обрезанному баком) — для статистики
    const effective = Math.min(elapsed, user.capSeconds || 14400);
    user.totalDist = (user.totalDist || 0) + effective * METERS_PER_SEC;
  }

  user.lastTick = new Date(now);
  return earned;
}

/* Проверка/применение истечения локаций по времени.
   Город не истекает (переоткрывается). Остальные удаляются из unlocked. */
function ensureLocExpiry(user, nowMs) {
  const li = user.locIncome || {};
  let changed = false;
  for (const id of Array.from(user.unlockedLocations || [])) {
    const rec = li[id];
    if (!rec || rec.expired) continue;
    if (rec.endTime && nowMs >= rec.endTime) {
      if (id === 'city') {
        // переоткрываем город
        li.city = makeLocRecord('city', nowMs);
      } else {
        rec.expired = true;
        user.unlockedLocations = user.unlockedLocations.filter(x => x !== id);
        if (user.currentLoc === id) user.currentLoc = 'city';
      }
      changed = true;
    }
  }
  if (changed) {
    user.locIncome = li;
    user.markModified('locIncome');
    user.markModified('unlockedLocations');
  }
}

/* Создать запись локации: фиксируем totalTon и срок по времени. */
function makeLocRecord(id, nowMs) {
  const def = LOCATION_INCOME[id] || { min: 1, max: 1 };
  const totalTon = def.min + Math.random() * (def.max - def.min);
  return {
    totalTon,
    startTime: nowMs,
    endTime:   nowMs + SECONDS_36 * 1000,
    expired:   false,
  };
}

/* ─────────────────────────────────────
   POST /api/auth — создать/обновить юзера + начислить idle-доход
───────────────────────────────────── */
router.post('/auth', async (req, res) => {
  try {
    const tg  = req.telegramUser;
    const ref = req.body.ref ? Number(req.body.ref) : null;

    let isNew = false;
    let user  = await User.findOne({ telegramId: tg.id });

    if (!user) {
      isNew = true;
      const now = Date.now();
      user = new User({
        telegramId: tg.id,
        username:   tg.username   || '',
        firstName:  tg.first_name || '',
        lastName:   tg.last_name  || '',
        referredBy: ref,
        lastTick:   new Date(now),
        currentLoc: 'city',
        unlockedLocations: ['city'],
        locIncome:  { city: makeLocRecord('city', now) },
      });
      user.markModified('locIncome');
      await user.save();
      if (ref)
        await User.updateOne({ telegramId: ref }, { $inc: { referralCount: 1 } });
    } else {
      // Начисляем доход за время отсутствия (точно по lastTick)
      accrue(user);
      user.username  = tg.username   || '';
      user.firstName = tg.first_name || '';
      user.lastName  = tg.last_name  || '';
      await user.save();
    }

    res.json({ ok: true, isNew, user: formatUser(user) });
  } catch (err) {
    console.error('auth:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/ping — устарело (no-op, совместимость)
───────────────────────────────────── */
router.post('/ping', async (req, res) => {
  res.json({ ok: true });
});

/* ─────────────────────────────────────
   GET /api/user — загрузить прогресс (с доначислением)
───────────────────────────────────── */
router.get('/user', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });
    accrue(user);
    await user.save();
    res.json({ ok: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/save — сохранить состояние от клиента.
   Доход НЕ принимаем от клиента вслепую: пересчитываем сами по lastTick.
   От клиента берём только "настройки" (currentLoc, скин и т.п.).
───────────────────────────────────── */
router.post('/save', async (req, res) => {
  try {
    const { currentLoc, activeSkin, skinBonus, unlockedLocations, capSeconds } = req.body;

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    // Сначала доначисляем по старому currentLoc, потом меняем локацию
    accrue(user);

    if (typeof currentLoc === 'string' && (user.unlockedLocations || []).includes(currentLoc)) {
      user.currentLoc = currentLoc;
    }
    if (activeSkin !== undefined)          user.activeSkin = activeSkin;
    if (typeof skinBonus === 'number')     user.skinBonus  = skinBonus;
    if (typeof capSeconds === 'number')    user.capSeconds = capSeconds;
    if (Array.isArray(unlockedLocations))  user.unlockedLocations = unlockedLocations;

    await user.save();
    res.json({ ok: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/collect — собрать монеты из коллектора в баланс
───────────────────────────────────── */
router.post('/collect', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    // Доначисляем актуальный доход перед сбором
    accrue(user);

    const amount = user.collectorPending || 0;
    if (amount <= 0) {
      await user.save();
      return res.json({ ok: true, collected: 0, coins: user.coins, collectorPending: 0 });
    }

    user.coins           += amount;
    user.totalCollected  += amount;
    user.collectorPending = 0;
    await user.save();

    // +5% рефереру
    if (user.referredBy) {
      const bonus = amount * 0.05;
      await User.updateOne(
        { telegramId: user.referredBy },
        { $inc: { coins: bonus, referralEarned: bonus } }
      );
    }

    res.json({ ok: true, collected: amount, coins: user.coins, collectorPending: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/buy/location
───────────────────────────────────── */
router.post('/buy/location', async (req, res) => {
  try {
    const PRICES = { forest:5, ocean:10, mountains:50, volcano:100, space:300 };
    const { locationId } = req.body;
    const price = PRICES[locationId];
    if (!price) return res.status(400).json({ error: 'Invalid location' });

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    accrue(user);

    if ((user.unlockedLocations || []).includes(locationId))
      return res.status(400).json({ error: 'Already unlocked' });
    if (user.coins < price)
      return res.status(400).json({ error: 'Not enough coins' });

    const now = Date.now();
    user.coins -= price;
    user.unlockedLocations.push(locationId);
    const li = user.locIncome || {};
    li[locationId] = makeLocRecord(locationId, now);
    user.locIncome = li;
    user.markModified('locIncome');
    user.markModified('unlockedLocations');
    // Переключаемся на купленную локацию
    user.currentLoc = locationId;
    await user.save();

    res.json({ ok: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/buy/skin
───────────────────────────────────── */
router.post('/buy/skin', async (req, res) => {
  try {
    const SKINS = { runner:{price:10,months:1}, cyber:{price:25,months:3},
                    ninja:{price:50,months:6},  astro:{price:90,months:12} };
    const { skinId } = req.body;
    const skin = SKINS[skinId];
    if (!skin) return res.status(400).json({ error: 'Invalid skin' });

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    accrue(user);

    if (user.coins < skin.price)
      return res.status(400).json({ error: 'Not enough coins' });

    const ms   = skin.months * 30 * 24 * 3600 * 1000;
    const base = user.skinBonus > Date.now() ? user.skinBonus : Date.now();
    user.coins     -= skin.price;
    user.activeSkin = skinId;
    user.skinBonus  = base + ms;
    await user.save();

    res.json({ ok: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/buy/limit — увеличить бак (capSeconds), в часах
───────────────────────────────────── */
router.post('/buy/limit', async (req, res) => {
  try {
    // add — в секундах (1ч=3600). unlimited — очень большой бак.
    const UPGRADES = [
      { addSec: 3600,        price: 1  },   // +1 час
      { addSec: 5 * 3600,    price: 5  },   // +5 часов
      { addSec: 10 * 3600,   price: 10 },   // +10 часов
      { addSec: 9999 * 3600, price: 30, unlimited: true },
    ];
    const upg = UPGRADES[req.body.upgradeIndex];
    if (!upg) return res.status(400).json({ error: 'Invalid upgrade' });

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    accrue(user);

    if (user.coins < upg.price)
      return res.status(400).json({ error: 'Not enough coins' });

    user.coins -= upg.price;
    user.capSeconds = upg.unlimited ? (9999 * 3600) : (user.capSeconds || 14400) + upg.addSec;
    await user.save();

    res.json({ ok: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/wallet/connect
───────────────────────────────────── */
router.post('/wallet/connect', async (req, res) => {
  try {
    const { tonAddress } = req.body;
    if (!tonAddress || typeof tonAddress !== 'string')
      return res.status(400).json({ error: 'Invalid address' });

    await User.updateOne(
      { telegramId: req.telegramUser.id },
      { $set: { tonWallet: tonAddress, updatedAt: Date.now() } }
    );
    res.json({ ok: true, tonWallet: tonAddress });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/wallet/withdraw
───────────────────────────────────── */
router.post('/wallet/withdraw', async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount < 1)
      return res.status(400).json({ error: 'Min withdrawal: 1 TON' });

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (!user.tonWallet)
      return res.status(400).json({ error: 'No wallet connected' });
    if (user.coins < amount)
      return res.status(400).json({ error: 'Not enough coins' });

    user.coins         -= amount;
    user.totalWithdrawn += amount;
    user.withdrawals.push({ amount, wallet: user.tonWallet });
    await user.save();

    res.json({ ok: true, coins: user.coins, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   GET /api/cashbox
───────────────────────────────────── */
router.get('/cashbox', async (req, res) => {
  try {
    const pending = await User.aggregate([
      { $unwind: '$withdrawals' },
      { $match:  { 'withdrawals.status': 'pending' } },
      { $group:  { _id: null, total: { $sum: '$withdrawals.amount' } } },
    ]);
    const spent = pending[0]?.total || 0;
    const cashbox = Math.max(0, 500 - spent);
    res.json({ ok: true, cashbox });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   GET /api/friends
───────────────────────────────────── */
router.get('/friends', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    const friends = await User.find(
      { referredBy: req.telegramUser.id },
      { firstName:1, username:1, totalCollected:1, createdAt:1 }
    ).limit(50);

    res.json({
      ok: true,
      referralCount:  user.referralCount,
      referralEarned: user.referralEarned,
      friends: friends.map(f => ({
        name:     f.firstName || f.username || 'Игрок',
        earned:   (f.totalCollected * 0.05).toFixed(6),
        joinedAt: f.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Формат юзера для фронта ──────────
function formatUser(user) {
  return {
    telegramId:        user.telegramId,
    firstName:         user.firstName,
    username:          user.username,
    coins:             user.coins,
    totalCollected:    user.totalCollected,
    totalDist:         user.totalDist,
    collectorPending:  user.collectorPending || 0,
    capSeconds:        user.capSeconds || 14400,
    lastTick:          user.lastTick,
    unlockedLocations: user.unlockedLocations,
    currentLoc:        user.currentLoc,
    locIncome:         user.locIncome || {},
    activeSkin:        user.activeSkin,
    skinBonus:         user.skinBonus,
    tonWallet:         user.tonWallet,
    referralCount:     user.referralCount,
    referralEarned:    user.referralEarned,
    totalWithdrawn:    user.totalWithdrawn,
    withdrawals:       (user.withdrawals || []).slice(-10),
  };
}

module.exports = router;
