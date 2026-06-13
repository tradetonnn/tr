/**
 * income.js — расчёт оффлайн дохода
 *
 * Доход считается по тем же правилам что и в игре:
 * - Каждая локация даёт ratePerSecond TON/сек
 * - Город всегда активен
 * - Остальные локации действуют SECONDS_36 секунд с момента открытия
 * - Максимум оффлайн накопления = sessionLimit / METERS_36 * totalTon локации
 */

const SECONDS_36    = 36 * 24 * 3600;       // 3 110 400 сек
const METERS_36     = 5971968;               // метров за 36 дней
const METERS_PER_SEC = 1.92;                 // м/сек при непрерывной игре
const MAX_OFFLINE_HOURS = 8;                 // максимум накопления оффлайн — 8 часов

const LOCATION_INCOME = {
  city:      { min: 1,   max: 1   },
  forest:    { min: 6,   max: 6.5 },
  ocean:     { min: 11,  max: 13  },
  mountains: { min: 55,  max: 65  },
  volcano:   { min: 110, max: 130 },
  space:     { min: 350, max: 380 },
};

/**
 * Считает оффлайн доход за период offlineSecs секунд
 * для набора разблокированных локаций.
 *
 * @param {string[]} unlockedLocations
 * @param {number}   offlineSecs  — сколько секунд юзер был оффлайн
 * @param {number}   sessionLimit — лимит метров пользователя
 * @returns {number} TON заработано оффлайн
 */
function calcOfflineIncome(unlockedLocations, offlineSecs, sessionLimit) {
  // Ограничиваем максимальное время накопления
  const maxSecs  = MAX_OFFLINE_HOURS * 3600;
  const elapsed  = Math.min(offlineSecs, maxSecs);

  let totalTon = 0;

  for (const locId of unlockedLocations) {
    const loc = LOCATION_INCOME[locId];
    if (!loc) continue;

    // Среднее значение дохода для локации
    const avgTon    = (loc.min + loc.max) / 2;
    const ratePerSec = avgTon / SECONDS_36;   // TON/сек

    totalTon += ratePerSec * elapsed;
  }

  // Применяем ограничение по sessionLimit
  // sessionLimit в метрах → переводим в секунды
  const limitSecs = (sessionLimit / METERS_PER_SEC);
  const maxByLimit = totalTon * Math.min(1, limitSecs / SECONDS_36 * 24);

  return Math.min(totalTon, maxByLimit);
}

module.exports = { calcOfflineIncome };
