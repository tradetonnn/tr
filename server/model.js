// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  telegramId:  { type: Number, required: true, unique: true },
  username:    { type: String, default: '' },
  firstName:   { type: String, default: '' },
  lastName:    { type: String, default: '' },

  // Игровые данные
  coins:         { type: Number, default: 0 },
  totalCollected:{ type: Number, default: 0 },
  totalDist:     { type: Number, default: 0 },
  sessionLimit:  { type: Number, default: 27648 },
  sessionRuns:   { type: Number, default: 0 },

  // Локации: массив разблокированных id
  unlockedLocations: { type: [String], default: ['city'] },
  currentLoc:        { type: String,   default: 'city' },

  // Скин
  activeSkin:  { type: String,  default: null },
  skinBonus:   { type: Number,  default: 0 }, // timestamp окончания бонуса

  // Реферальная система
  referredBy:    { type: Number, default: null }, // telegramId пригласившего
  referralCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false });

UserSchema.pre('save', function(next){
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema);
