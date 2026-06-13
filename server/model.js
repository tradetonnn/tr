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

  // Игровые данные
  coins:              { type: Number, default: 0 },
  totalCollected:     { type: Number, default: 0 },
  totalDist:          { type: Number, default: 0 },
  sessionDist:        { type: Number, default: 0 },  // ← ДОБАВЛЕНО
  sessionLimit:       { type: Number, default: 27648 },
  sessionRuns:        { type: Number, default: 0 },
  unlockedLocations:  { type: [String], default: ['city'] },
  currentLoc:         { type: String, default: 'city' },
  activeSkin:         { type: String, default: null },
  skinBonus:          { type: Number, default: 0 },

  // TON кошелёк
  tonWallet:          { type: String, default: null },

  // Реферальная система
  referredBy:         { type: Number, default: null },
  referralCount:      { type: Number, default: 0 },
  referralEarned:     { type: Number, default: 0 },

  // История выводов
  withdrawals:        { type: [WithdrawSchema], default: [] },
  totalWithdrawn:     { type: Number, default: 0 },

  // Оффлайн доход
  lastOnline:         { type: Date, default: Date.now },
  offlinePending:     { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

UserSchema.pre('save', function(next){
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema);