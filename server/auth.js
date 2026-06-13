// middleware/auth.js
const crypto = require('crypto');

/**
 * Верифицирует Telegram initData по HMAC-SHA256.
 * Возвращает распарсенный объект user или бросает ошибку.
 */
function verifyTelegramInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('No hash in initData');

  // Собираем строку для проверки (все поля кроме hash, отсортированные)
  params.delete('hash');
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Секретный ключ = HMAC-SHA256("WebAppData", botToken)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (expectedHash !== hash) throw new Error('Invalid hash');

  // Парсим user
  const userRaw = params.get('user');
  if (!userRaw) throw new Error('No user in initData');
  return JSON.parse(userRaw);
}

/**
 * Express middleware — проверяет initData из заголовка X-Init-Data.
 * Если валидно — добавляет req.telegramUser и продолжает.
 */
function authMiddleware(req, res, next) {
  const initData = req.headers['x-init-data'];
  if (!initData) return res.status(401).json({ error: 'No initData' });

  try {
    req.telegramUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', detail: err.message });
  }
}

module.exports = { authMiddleware, verifyTelegramInitData };
