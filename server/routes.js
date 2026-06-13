// routes/user.js
const express = require('express');
const router  = express.Router();
const User    = require('./model');
const { authMiddleware } = require('./auth');

// Все роуты требуют авторизации
router.use(authMiddleware);

/* ──────────────────────────────────────
   POST /api/auth
   Создаёт или обновляет юзера, возвращает его данные.
────────────────────────────────────── */
router.post('/auth', async (req, res) => {
  try {
    const tg = req.telegramUser;
    const { ref } = req.body; // реферальный id если есть

    const user = await User.findOneAndUpdate(
      { telegramId: tg.id },
      {
        $setOnInsert: {
          telegramId: tg.id,
          username:   tg.username  || '',
          firstName:  tg.first_name || '',
          lastName:   tg.last_name  || '',
          referredBy: ref ? Number(ref) : null,
        },
        $set: {
          username:  tg.username   || '',
          firstName: tg.first_name || '',
          lastName:  tg.last_name  || '',
          updatedAt: Date.now(),
        },
      },
      { upsert: true, new: true }
    );

    // Если новый юзер и есть реферер — увеличиваем счётчик рефереру
    if (user.referredBy && req.body.isNew) {
      await User.updateOne(
        { telegramId: user.referredBy },
        { $inc: { referralCount: 1 } }
      );
    }

    res.json({ ok: true, user: formatUser(user) });
  } catch (err) {
    console.error('auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ──────────────────────────────────────
   GET /api/user
   Получить данные текущего юзера.
────────────────────────────────────── */
router.get('/user', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ──────────────────────────────────────
   POST /api/collect
   Игрок нажал "Собрать" — сохраняем монеты.
   Body: { amount: number, sessionDist: number }
────────────────────────────────────── */
router.post('/collect', async (req, res) => {
  try {
    const { amount, sessionDist } = req.body;
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const user = await User.findOneAndUpdate(
      { telegramId: req.telegramUser.id },
      {
        $inc: {
          coins:          amount,
          totalCollected: amount,
          totalDist:      sessionDist || 0,
          sessionRuns:    1,
        },
        $set: { updatedAt: Date.now() },
      },
      { new: true }
    );

    res.json({ ok: true, coins: user.coins, totalCollected: user.totalCollected });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ──────────────────────────────────────
   POST /api/buy/location
   Покупка локации.
   Body: { locationId: string }
────────────────────────────────────── */
router.post('/buy/location', async (req, res) => {
  try {
    const PRICES = { forest:5, ocean:10, mountains:50, volcano:100, space:300 };
    const { locationId } = req.body;
    const price = PRICES[locationId];
    if (!price) return res.status(400).json({ error: 'Invalid location' });

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.unlockedLocations.includes(locationId))
      return res.status(400).json({ error: 'Already unlocked' });
    if (user.coins < price)
      return res.status(400).json({ error: 'Not enough coins' });

    user.coins -= price;
    user.unlockedLocations.push(locationId);
    user.updatedAt = Date.now();
    await user.save();

    res.json({ ok: true, coins: user.coins, unlockedLocations: user.unlockedLocations });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ──────────────────────────────────────
   POST /api/buy/skin
   Покупка скина.
   Body: { skinId: string }
────────────────────────────────────── */
router.post('/buy/skin', async (req, res) => {
  try {
    const SKIN_PRICES    = { runner:10, cyber:25, ninja:50, astro:90 };
    const SKIN_MONTHS    = { runner:1,  cyber:3,  ninja:6,  astro:12 };
    const { skinId } = req.body;
    const price  = SKIN_PRICES[skinId];
    const months = SKIN_MONTHS[skinId];
    if (!price) return res.status(400).json({ error: 'Invalid skin' });

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.coins < price) return res.status(400).json({ error: 'Not enough coins' });

    const ms   = months * 30 * 24 * 3600 * 1000;
    const base = user.skinBonus > Date.now() ? user.skinBonus : Date.now();

    user.coins     -= price;
    user.activeSkin = skinId;
    user.skinBonus  = base + ms;
    user.updatedAt  = Date.now();
    await user.save();

    res.json({ ok: true, coins: user.coins, activeSkin: user.activeSkin, skinBonus: user.skinBonus });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ──────────────────────────────────────
   POST /api/buy/limit
   Покупка увеличения лимита.
   Body: { upgradeIndex: number }
────────────────────────────────────── */
router.post('/buy/limit', async (req, res) => {
  try {
    const UPGRADES = [
      { add: 6912,    price: 1,  unlimited: false },
      { add: 34560,   price: 5,  unlimited: false },
      { add: 69120,   price: 10, unlimited: false },
      { add: Infinity, price: 30, unlimited: true  },
    ];
    const { upgradeIndex } = req.body;
    const upg = UPGRADES[upgradeIndex];
    if (!upg) return res.status(400).json({ error: 'Invalid upgrade' });

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.coins < upg.price) return res.status(400).json({ error: 'Not enough coins' });

    user.coins -= upg.price;
    user.sessionLimit = upg.unlimited
      ? 999999999
      : user.sessionLimit + upg.add;
    user.updatedAt = Date.now();
    await user.save();

    res.json({ ok: true, coins: user.coins, sessionLimit: user.sessionLimit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Хелпер: форматирование юзера для фронта ──
function formatUser(user) {
  return {
    telegramId:        user.telegramId,
    firstName:         user.firstName,
    username:          user.username,
    coins:             user.coins,
    totalCollected:    user.totalCollected,
    totalDist:         user.totalDist,
    sessionLimit:      user.sessionLimit,
    sessionRuns:       user.sessionRuns,
    unlockedLocations: user.unlockedLocations,
    currentLoc:        user.currentLoc,
    activeSkin:        user.activeSkin,
    skinBonus:         user.skinBonus,
    referralCount:     user.referralCount,
  };
}

module.exports = router;
