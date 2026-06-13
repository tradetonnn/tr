/**
 * income.js — idle-доход (сервер).
 *
 * Ставка = та же что даёт монетка на клиенте:
 *   coinValue  = totalTon / METERS_36 * METERS_PER_COIN   (TON/монету)
 *   rate/сек   = totalTon / METERS_36 * METERS_PER_SEC    (TON/сек)
 *
 * Онлайн: монетки дают доход напрямую.
 * Оффлайн: accrueIncome считает «сколько монеток пробежал бы» за то же время.
 * Одна формула — нет конфликтов.
 */

const SECONDS_36     = 36 * 24 * 3600;  // полный срок локации (сек)
const METERS_36      = 5971968;         // метров за полный срок
const METERS_PER_SEC = 1.92;            // скорость "прохождения"
const METERS_PER_COIN = (0.38 / 0.004) * (0.004 * 8); // = 3.04 м/монету

const LOCATION_INCOME = {
  city:      { min: 1,   max: 1   },
  forest:    { min: 6,   max: 6.5 },
  ocean:     { min: 11,  max: 13  },
  mountains: { min: 55,  max: 65  },
  volcano:   { min: 110, max: 130 },
  space:     { min: 350, max: 380 },
};

/**
 * Ставка локации TON/сек — совпадает с клиентским coinValueForLoc/METERS_PER_COIN*METERS_PER_SEC.
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
  // totalTon / METERS_36 * METERS_PER_SEC = TON/сек
  return (totalTon / METERS_36) * METERS_PER_SEC;
}

/**
 * Доход за период (оффлайн/сервер).
 * @param {string} currentLoc
 * @param {Object} locIncome   { id: {totalTon, startTime, endTime, expired} }
 * @param {number} elapsedSec
 * @param {number} capSeconds  — бак коллектора
 * @param {number} [skinBonusUntil=0]
 * @param {number} [nowMs=Date.now()]
 */
function calcIncome({ currentLoc, locIncome, elapsedSec, capSeconds,
                      skinBonusUntil = 0, nowMs = Date.now() }) {
  if (!(elapsedSec > 0)) return 0;

  const effective = Math.min(elapsedSec, capSeconds);
  if (effective <= 0) return 0;

  const rec = locIncome && locIncome[currentLoc];
  if (rec && rec.expired) return 0;

  let earned = ratePerSecond(currentLoc, locIncome) * effective;
  if (skinBonusUntil && skinBonusUntil > nowMs) earned *= 1.05;

  return earned;
}

module.exports = {
  SECONDS_36, METERS_36, METERS_PER_SEC, METERS_PER_COIN,
  LOCATION_INCOME, ratePerSecond, calcIncome,
};
