# NutriMenu: Session Memory

## 🚀 Current Task

- **Goal:** Ввод ТТК — 4 канала (Вручную / XLSX / Google Sheets / PDF+Фото)
- **Status:** In Progress
- **Last Action:** Реализован канал Google Sheets с гибридным парсером (эвристика → AI fallback)
- **Immediate Next Step:** Протестировать импорт через Google Sheets с реальной таблицей пользователя, при необходимости дотюнить стратегии парсинга

## 🧠 Context & Logic (Keep for next session)

- **Current Stack:** Next.js 16 (App Router), Tailwind v4, LocalStorage.
- **Critical Logic:** Nutrition calculation uses `resolveNutri()` in `lib/utils.ts`.

## 📦 Что сделано в этой сессии

### Канал 3: Google Sheets (готов, нужно тестирование)

**Новые файлы:**
- `app/api/sheets/route.ts` — старый прокси (GET, возвращает XLSX бинарник). Сейчас НЕ используется в UI, но оставлен.
- `app/api/parse-ttk/route.ts` — **основной endpoint** (POST `{ url }`). Скачивает XLSX, запускает стратегии, делает AI fallback, возвращает `{ dishes, errors, strategy, usedAI }`.
- `lib/ttk-strategies.ts` — три стратегии парсинга + оркестратор:
  - `strategyHierarchical` — блюдо = строка только в col 0, ингредиенты ниже (текущий TTK формат)
  - `strategyColumnar` — таблица с заголовком, поиск колонок по имени
  - `strategyPerRow` — одна строка = одно блюдо, ингредиенты в одной ячейке через `\n`/`;`/`,`
  - `detectAndParse` — запускает все три, берёт с лучшим confidence
  - `CONFIDENCE_THRESHOLD = 0.45` — ниже этого → AI fallback

**Изменённые файлы:**
- `components/dashboard/ImportModal.tsx` — добавлена вкладка "Google Таблица" (переключатель Файл / Google Таблица). `handleSheetsUrl` вызывает `/api/parse-ttk`, результат идёт в стандартный флоу Preview → Matching → Success.
- `.env.local` — добавлена строка `ANTHROPIC_API_KEY=` (пустая, нужно заполнить)
- `package.json` — установлен `@anthropic-ai/sdk`

### AI Fallback (claude-haiku-4-5-20251001)
- Вызывается из `app/api/parse-ttk/route.ts` если confidence < 0.45
- Использует прямой fetch к Anthropic API (без SDK, чтобы не тянуть лишнее в Edge)
- Возвращает `ParsedDish[]` из JSON-ответа Claude
- В UI показывается `ℹ️ Таблица распознана с помощью AI`

## 🔑 Нужно от пользователя

- Заполнить `ANTHROPIC_API_KEY=sk-ant-...` в `.env.local`
- Протестировать Google Sheets импорт с таблицей `15rOivm_9jZYw4LdH3OXPxF0B9nHKQfsT` (кофейное меню, ~20 напитков, формат: одна строка на напиток, ингредиенты в одной ячейке)

## 🛠️ Следующие каналы (не начаты)

- **Канал 4:** PDF / Фото → AI Vision → JSON → review (высокая сложность)

## 🐛 Known Issues

- Таблица пользователя (кофейное меню) парсилась неверно старым парсером — именно поэтому добавили гибридную систему. После заполнения API ключа нужно проверить что `strategyPerRow` или AI fallback правильно распознаёт формат.
