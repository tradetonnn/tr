/**
 * income.js — ЕДИНАЯ idle-логика дохода (общая для сервера и клиента).
 *
 * Модель:
 *  - Время = деньги. Игрок "проходит" METERS_PER_SEC метров каждую секунду,
 *    онлайн он или нет.
 *  - Каждая локация за полный срок (SECONDS_36) даёт totalTon TON.
 *    Значит ставка локации = totalTon / SECONDS_36 TON/сек.
 *  - Доход капает ТОЛЬКО от активной локации (currentLoc).
 *  - Коллектор копит максимум capSeconds секунд дохода (бак). База — 4 часа.
 *  - Скин даёт +5% пока активен (skinBonus — timestamp окончания в мс).
 *
 * Один источник истины — lastTick (момент, до которого доход начислен).
 * Любой расчёт: earned = rate * min(now - lastTick, capSeconds).
 * Это работает идентично онлайн / оффлайн / при перезагрузке.
 */

const SECONDS_36     = 36 * 24 * 3600;   // 3 110 400 сек — полный срок локации
const METERS_36      = 5971968;          // метров за полный срок
const METERS_PER_SEC = 1.92;             // скорость "прохождения"

// Диапазоны дохода локаций (TON за полный срок). Должны совпадать с фронтом.
const LOCATION_INCOME = {
  city:      { min: 1,   max: 1   },
  forest:    { min: 6,   max: 6.5 },
  ocean:     { min: 11,  max: 13  },
  mountains: { min: 55,  max: 65  },
  volcano:   { min: 110, max: 130 },
  space:     { min: 350, max: 380 },
};

/**
 * Ставка дохода активной локации в TON/сек.
 * Берёт реальный totalTon из locIncome (зафиксирован при открытии),
 * иначе — средний по диапазону.
 */
function ratePerSecond(locId, locIncome) {
  const rec = locIncome && locIncome[locId];
  let totalTon;
  if (rec && typeof rec.totalTon === 'number') {
    totalTon = rec.totalTon;
  } else {
    const def = LOCATION_INCOME[locId];
    if (!def) return 0;
    totalTon = (def.min + def.max) / 2;
  }
  return totalTon / SECONDS_36;
}

/**
 * Главная функция: сколько дохода накоплено за период.
 *
 * @param {Object} opts
 * @param {string}  opts.currentLoc   — активная локация
 * @param {Object}  opts.locIncome    — прогресс локаций {id:{totalTon,startTime,endTime,expired}}
 * @param {number}  opts.elapsedSec   — сколько секунд прошло с lastTick
 * @param {number}  opts.capSeconds   — максимум секунд накопления (бак)
 * @param {number}  [opts.skinBonusUntil=0] — timestamp(мс) окончания скина
 * @param {number}  [opts.nowMs=Date.now()] — текущее время в мс
 * @returns {number} TON заработано
 */
function calcIncome({ currentLoc, locIncome, elapsedSec, capSeconds, skinBonusUntil = 0, nowMs = Date.now() }) {
  if (!(elapsedSec > 0)) return 0;

  // Обрезаем по баку
  const effective = Math.min(elapsedSec, capSeconds);
  if (effective <= 0) return 0;

  // Локация истекла? — дохода нет (город не истекает)
  const rec = locIncome && locIncome[currentLoc];
  if (rec && rec.expired) return 0;

  let earned = ratePerSecond(currentLoc, locIncome) * effective;

  // Бонус скина +5% (по среднему: если скин активен сейчас)
  if (skinBonusUntil && skinBonusUntil > nowMs) {
    earned *= 1.05;
  }

  return earned;
}

module.exports = {
  SECONDS_36,
  METERS_36,
  METERS_PER_SEC,
  LOCATION_INCOME,
  ratePerSecond,
  calcIncome,
};
