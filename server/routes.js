const express = require('express');
const router  = express.Router();
const User    = require('./model');
const { authMiddleware } = require('./auth');
const { calcOfflineIncome } = require('./income');

router.use(authMiddleware);

/* ─────────────────────────────────────
   POST /api/auth
   Создать/обновить юзера + считаем оффлайн доход
───────────────────────────────────── */
router.post('/auth', async (req, res) => {
  try {
    const tg  = req.telegramUser;
    const ref = req.body.ref ? Number(req.body.ref) : null;
    const hadLocalSave = req.body.hadLocalSave === true;

    let isNew = false;
    let user  = await User.findOne({ telegramId: tg.id });

    if (!user) {
      isNew = true;
      user  = new User({
        telegramId: tg.id,
        username:   tg.username   || '',
        firstName:  tg.first_name || '',
        lastName:   tg.last_name  || '',
        referredBy: ref,
        lastOnline: new Date(),
      });
      await user.save();
      if (ref)
        await User.updateOne({ telegramId: ref }, { $inc: { referralCount: 1 } });
    } else {
      // Серверный оффлайн-доход считаем ТОЛЬКО когда у клиента не было
      // локального сохранения (новое устройство / очищенный кэш).
      // Иначе клиент уже начислил его точно по savedAt — без ping.
      const now        = Date.now();
      const lastOnline = new Date(user.lastOnline).getTime();
      const offlineSecs = Math.max(0, (now - lastOnline) / 1000);

      if (!hadLocalSave && offlineSecs > 1) {
        const earned = calcOfflineIncome(
          user.unlockedLocations,
          offlineSecs,
          user.sessionLimit
        );
        if (earned > 0) {
          user.offlinePending = (user.offlinePending || 0) + earned;
        }
      }

      user.username  = tg.username   || '';
      user.firstName = tg.first_name || '';
      user.lastName  = tg.last_name  || '';
      user.lastOnline = new Date();
      await user.save();
    }

    res.json({ ok: true, isNew, user: formatUser(user) });
  } catch (err) {
    console.error('auth:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/ping
   (устарело) lastOnline теперь обновляется через /api/save.
   Оставлено для обратной совместимости со старым фронтом.
───────────────────────────────────── */
router.post('/ping', async (req, res) => {
  res.json({ ok: true });
});

/* ─────────────────────────────────────
   POST /api/offline/collect
   Перенести оффлайн-накопленное в коллектор (НЕ в верхний баланс)
───────────────────────────────────── */
router.post('/offline/collect', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    const amount = user.offlinePending || 0;
    if (amount <= 0) return res.json({ ok: true, earned: 0, collectorPending: user.collectorPending || 0 });

    user.collectorPending = (user.collectorPending || 0) + amount;
    user.offlinePending   = 0;
    await user.save();

    res.json({ ok: true, earned: amount, collectorPending: user.collectorPending });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   GET /api/user
   Загрузить прогресс игрока
───────────────────────────────────── */
router.get('/user', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/save
   Сохранить весь прогресс одним запросом
───────────────────────────────────── */
router.post('/save', async (req, res) => {
  try {
    const { coins, totalCollected, totalDist, sessionDist,
            sessionLimit, sessionRuns, unlockedLocations, currentLoc,
            activeSkin, skinBonus, collectorPending, locIncome } = req.body;

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    if (typeof coins === 'number')           user.coins          = coins;
    if (typeof totalCollected === 'number')  user.totalCollected = totalCollected;
    if (typeof totalDist === 'number')        user.totalDist      = totalDist;
    if (typeof sessionDist === 'number')      user.sessionDist    = sessionDist;
    if (typeof sessionLimit === 'number')     user.sessionLimit   = sessionLimit;
    if (typeof sessionRuns === 'number')      user.sessionRuns    = sessionRuns;
    if (Array.isArray(unlockedLocations))     user.unlockedLocations = unlockedLocations;
    if (typeof currentLoc === 'string')       user.currentLoc     = currentLoc;
    if (activeSkin !== undefined)             user.activeSkin     = activeSkin;
    if (typeof skinBonus === 'number')        user.skinBonus      = skinBonus;
    if (typeof collectorPending === 'number') user.collectorPending = collectorPending;

    // locIncome — Mixed-поле, требует markModified
    if (locIncome && typeof locIncome === 'object') {
      user.locIncome = locIncome;
      user.markModified('locIncome');
    }

    // lastOnline двигаем вперёд при каждом сохранении —
    // это «момент, до которого доход уже учтён». Заменяет ping.
    user.lastOnline = new Date();
    user.updatedAt = Date.now();
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/collect
   Собрать монеты
───────────────────────────────────── */
router.post('/collect', async (req, res) => {
  try {
    const { amount, sessionDist } = req.body;
    if (typeof amount !== 'number' || amount < 0)
      return res.status(400).json({ error: 'Invalid amount' });

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });

    // Обновляем все поля
    user.coins          += amount;
    user.totalCollected += amount;
    user.totalDist      += sessionDist || 0;
    user.sessionDist     = 0;
    user.sessionRuns    += 1;
    user.collectorPending = 0;
    user.updatedAt       = Date.now();
    
    await user.save();

    // +5% рефереру
    if (user.referredBy && amount > 0) {
      const bonus = amount * 0.05;
      await User.updateOne(
        { telegramId: user.referredBy },
        { $inc: { coins: bonus, referralEarned: bonus } }
      );
    }

    res.json({ ok: true, coins: user.coins });
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
    if (user.unlockedLocations.includes(locationId))
      return res.status(400).json({ error: 'Already unlocked' });
    if (user.coins < price)
      return res.status(400).json({ error: 'Not enough coins' });

    user.coins -= price;
    user.unlockedLocations.push(locationId);
    await user.save();

    res.json({ ok: true, coins: user.coins, unlockedLocations: user.unlockedLocations });
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
    if (user.coins < skin.price)
      return res.status(400).json({ error: 'Not enough coins' });

    const ms   = skin.months * 30 * 24 * 3600 * 1000;
    const base = user.skinBonus > Date.now() ? user.skinBonus : Date.now();
    user.coins     -= skin.price;
    user.activeSkin = skinId;
    user.skinBonus  = base + ms;
    await user.save();

    res.json({ ok: true, coins: user.coins, activeSkin: user.activeSkin, skinBonus: user.skinBonus });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/buy/limit
───────────────────────────────────── */
router.post('/buy/limit', async (req, res) => {
  try {
    const UPGRADES = [
      { add:6912,    price:1  },
      { add:34560,   price:5  },
      { add:69120,   price:10 },
      { add:999999999, price:30, unlimited:true },
    ];
    const upg = UPGRADES[req.body.upgradeIndex];
    if (!upg) return res.status(400).json({ error: 'Invalid upgrade' });

    const user = await User.findOne({ telegramId: req.telegramUser.id });
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.coins < upg.price)
      return res.status(400).json({ error: 'Not enough coins' });

    user.coins -= upg.price;
    user.sessionLimit = upg.unlimited ? 999999999 : user.sessionLimit + upg.add;
    await user.save();

    res.json({ ok: true, coins: user.coins, sessionLimit: user.sessionLimit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ─────────────────────────────────────
   POST /api/wallet/connect
   Подключить TON кошелёк
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
   Запрос на вывод
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
   Текущий остаток кассы (общий для всех)
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
   Список рефералов и заработок
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
    sessionDist:       user.sessionDist || 0,  // ← ДОБАВЛЕНО
    sessionLimit:      user.sessionLimit,
    sessionRuns:       user.sessionRuns,
    unlockedLocations: user.unlockedLocations,
    currentLoc:        user.currentLoc,
    activeSkin:        user.activeSkin,
    skinBonus:         user.skinBonus,
    tonWallet:         user.tonWallet,
    referralCount:     user.referralCount,
    referralEarned:    user.referralEarned,
    totalWithdrawn:    user.totalWithdrawn,
    offlinePending:    user.offlinePending || 0,
    collectorPending:  user.collectorPending || 0,
    locIncome:         user.locIncome || {},
    withdrawals:       user.withdrawals.slice(-10),
  };
}

module.exports = router;