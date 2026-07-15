// Хелсчек env перед деплоем. Ловит частые грабли:
//   - отсутствующие обязательные ключи,
//   - кириллицу в токенах (случайно скопировал с русской раскладки),
//   - задвоенные слэши в URL (Neon/Upstash/Vercel),
//   - ведущие/хвостовые пробелы и переводы строк в значениях.
//
// Usage: node scripts/check_env.mjs            # читает .env.local
//        node scripts/check_env.mjs .env       # или указанный файл
// Exit code 1, если есть ошибки (ok для pre-deploy гейта).

import fs from 'node:fs'

const file = process.argv[2] || '.env.local'
if (!fs.existsSync(file)) {
  console.error(`❌ Файл ${file} не найден`)
  process.exit(1)
}

// Обязательные для работы прода NutriMenu.
const REQUIRED = [
  'DATABASE_URL',       // Postgres (Neon)
  'AUTH_SECRET',        // JWT-подпись
  'GEMINI_API_KEY',     // AI-импорт ТТК / штрихкод / мета
  'OPENROUTER_API_KEY', // fallback-модели импорта
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'BLOB_READ_WRITE_TOKEN', // фото блюд (Vercel Blob)
]
// Желательные, но проект переживёт их отсутствие (предупреждение, не ошибка).
const OPTIONAL = [
  'DIRECT_URL', 'RESEND_API', 'RESEND_FROM',
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME', 'TELEGRAM_FEEDBACK_CHAT_ID', 'TELEGRAM_WEBHOOK_SECRET',
  'CRON_SECRET', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_BASE_URL', 'GEMINI_MODEL',
]

// Разбор .env без зависимостей: KEY=VALUE, пропускаем комментарии и пустые строки.
const env = {}
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  if (!line || line.trimStart().startsWith('#')) continue
  const eq = line.indexOf('=')
  if (eq === -1) continue
  const key = line.slice(0, eq).trim()
  let val = line.slice(eq + 1)
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  env[key] = val
}

const errors = []
const warnings = []

// 1. Наличие обязательных.
for (const k of REQUIRED) {
  if (!env[k] || env[k].trim() === '') errors.push(`Отсутствует обязательный ключ: ${k}`)
}
for (const k of OPTIONAL) {
  if (!(k in env) || env[k].trim() === '') warnings.push(`Не задан (опционально): ${k}`)
}

// 2. Проверки значений.
const CYRILLIC = /[а-яёА-ЯЁ]/
for (const [k, raw] of Object.entries(env)) {
  if (raw === undefined) continue
  if (raw !== raw.trim()) errors.push(`${k}: ведущие/хвостовые пробелы в значении`)
  const val = raw.trim()
  if (CYRILLIC.test(val)) errors.push(`${k}: кириллица в значении (скопировано с русской раскладки?)`)
  if (/^https?:\/\//i.test(val)) {
    const afterProto = val.replace(/^https?:\/\//i, '')
    if (afterProto.includes('//')) errors.push(`${k}: задвоенный слэш в URL (${val})`)
  }
}

// Отчёт.
console.log(`🔎 Проверка ${file}\n`)
if (warnings.length) {
  console.log('⚠️  Предупреждения:')
  for (const w of warnings) console.log(`   - ${w}`)
  console.log('')
}
if (errors.length) {
  console.log('❌ Ошибки:')
  for (const e of errors) console.log(`   - ${e}`)
  console.log(`\n✗ ${errors.length} ошибок — не деплоить, пока не починишь.`)
  process.exit(1)
} else {
  console.log(`✅ Обязательные ключи на месте, грубых ошибок в значениях нет${warnings.length ? ' (см. предупреждения выше)' : ''}.`)
}
