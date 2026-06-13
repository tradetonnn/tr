const mongoose = require('mongoose');

const WithdrawSchema = new mongoose.Schema({
  amount:    { type: Number, required: true },
  wallet:    { type: String, required: true },
  status:    { type: String, enum: ['pending','done','rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const UserSchema = new mongoose.Schema({
  telegramId:  { type: Number, required: true, unique: true },
  username:    { type: String, default: '' },
  firstName:   { type: String, default: '' },
  lastName:    { type: String, default: '' },

  // ── Баланс и прогресс ──
  coins:              { type: Number, default: 0 },   // верхний баланс (собранное)
  totalCollected:     { type: Number, default: 0 },   // всего собрано за всё время
  totalDist:          { type: Number, default: 0 },   // всего "пройдено" метров (= время * 1.92)

  // ── Коллектор (idle-накопление) ──
  collectorPending:   { type: Number, default: 0 },   // доход, ждущий сбора
  lastTick:           { type: Date,   default: Date.now }, // момент, до которого доход уже начислен

  // ── Лимит накопления (в секундах) ──
  // Базово 4 часа = 14400 сек. Коллектор не копит больше этого запаса.
  capSeconds:         { type: Number, default: 14400 },

  // ── Локации ──
  unlockedLocations:  { type: [String], default: ['city'] },
  currentLoc:         { type: String, default: 'city' },

  // Прогресс/срок локаций по времени:
  // { city: { totalTon, startTime, endTime, expired }, ... }
  locIncome:          { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Скины ──
  activeSkin:         { type: String, default: null },
  skinBonus:          { type: Number, default: 0 },

  // ── TON кошелёк ──
  tonWallet:          { type: String, default: null },

  // ── Реферальная система ──
  referredBy:         { type: Number, default: null },
  referralCount:      { type: Number, default: 0 },
  referralEarned:     { type: Number, default: 0 },

  // ── История выводов ──
  withdrawals:        { type: [WithdrawSchema], default: [] },
  totalWithdrawn:     { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

UserSchema.pre('save', function(next){
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema);
