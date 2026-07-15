# AI-SAFE аудит — NutriMenu / Plate

Дата: 2026-07-14 · Фреймворк: AI-SAFE v1.0 · Аудитор: Claude Code

## Профиль системы

- **LLM-вызовы (все серверные, output = только JSON, парсится схемой):**
  - TTK-импорт → Claude Sonnet 4.6 через OpenRouter (`lib/gemini-ttk.ts`)
  - Barcode lookup → Perplexity Sonar Pro (`lib/sonar-barcode.ts`), каскад OpenFoodFacts → AI
  - Ingredient meta/КБЖУ → Gemini Flash → Sonar fallback (`lib/gemini-ingredient-meta.ts`)
- **Инструменты/действия от модели наружу:** нет. LLM не вызывает tools, не исполняет код, не шлёт сообщения. Вывод — только данные.
- **RAG / векторная база:** нет. Few-shot примеры (`examples`) приходят из ТТК того же заведения в рамках одного запроса.
- **Публичные эндпоинты:** Telegram webhook (входящие ПРИОСТАНОВЛЕНЫ, gated secret-token); AI-роуты — все под auth-сессией.
- **Секреты:** только в env, в промпты не попадают.
- **Мультиагентность:** нет (один вызов на задачу).

## Scorecard

| Уровень | Балл /10 | Закрыто | Частично | Нет | N/A |
|---|---|---|---|---|---|
| 1 INPUT | 6.5 | INPUT.1 | INPUT.2, INPUT.3 | — | — |
| 2 EXEC | 9 | — | — | — | EXEC.1–4 (нет tools/кода) |
| 3 INFRA | 6 | INFRA.1 | INFRA.2 | — | INFRA.3 (один агент) |
| 4 LOGIC | 8 | LOGIC.1, LOGIC.2 | LOGIC.3 | — | LOGIC.4 (нет HITL) |
| 5 DATA | 9 | DATA.1, DATA.2 | — | — | DATA.3, DATA.4 (нет RAG) |
| **Композит** | **~7.5/10** | | | | |

Посыл: посадка добротная (роль system/user разделена, вывод коерсится схемой, тяжёлые роуты загейтены, tool-use отсутствует). Два предметных пробела ниже.

## Находки (по убыванию риска)

### 🟠 YAISAFE.INFRA.2 — Denial of Wallet: lookup-barcode и lookup-meta без тарифного гейта (риск: средняя×среднее)
- **Кросс:** LLM10, MCP09, T4. Нарушает внутреннее правило [[feedback-ai-must-be-gated]].
- **Что не так:** оба роута гейтят только сессию + rate-limit (30/мин на юзера), но НЕ тариф. Любой залогиненный пользователь на любом плане (бесплатный START, истёкший TEST) дёргает платный AI — barcode через Sonar Pro (недёшево), meta через Gemini/Sonar. Rate-limit ограничивает всплеск, но не месячную стоимость.
- **Доказательство:** `app/api/ingredients/lookup-barcode/route.ts:14-18` (getSession + aiLookupRatelimit, нет requireAiImport); `app/api/ingredients/lookup-meta/route.ts:8-11` (то же). Контраст — правильный гейт: `app/api/ingredients/[id]/enrich/route.ts:44-70` (canEnrichAi + месячная квота), `app/api/import/route.ts:84` (canImportAi).
- **Примечание:** отчёт REPORT_2026-07-14 §2.1 утверждает, что все 8 AI-роутов используют `requireAiImport`/лимитер — неточность: эти два — auth+ratelimit, без тарифа.
- **Фикс:** решить продуктово — barcode-скан бесплатен всем как acquisition-фича ИЛИ гейтить. Минимум: месячная квота на дешёвые lookup'ы (как `aiEnrichPerMonth`) либо плановый гейт. **Усилие:** S.

### 🟠 YAISAFE.INPUT.3 — XSS в JSON-LD публичного меню через неэкранированный `</script>` (риск: средняя×высокое)
- **Кросс:** LLM05 (Improper Output Handling).
- **Что не так:** `JSON.stringify` не экранирует `<`/`>`, поэтому имя заведения вида `</script><img src=x onerror=…>` вырывается из `<script type="application/ld+json">` → хранимый XSS на публичной странице меню, которую видят гости. Имя заведения задаёт владелец; поля меню также наполняются AI-импортом.
- **Доказательство:** `app/menu/[slug]/page.tsx:161` — `dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}`, где `jsonLd.name = data.venue.name` (строка 153).
- **Фикс:** экранировать при сериализации — `JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')`. **Усилие:** S.

### 🟡 YAISAFE.INPUT.2 — Нет лимита размера vision-входа в parse-pdf-ttk (риск: низкая×среднее)
- **Кросс:** LLM10, T4.
- **Что не так:** `fileData` (base64) декодируется и уходит в Vision (max_tokens 32768) без ранней проверки размера. Единственный предохранитель — лимит тела Vercel (~4.5 МБ); 4-МБ картинка сжигает полный дорогой Vision-вызов. Загейтено тарифом + rate-limit 20/час, поэтому урон ограничен.
- **Доказательство:** `app/api/parse-pdf-ttk/route.ts:30-51` — валидируется только mimeType, размер не проверяется. (Текст PDF режется до 50000 — `lib/gemini-ttk.ts:304` — это ок.)
- **Фикс:** отклонять `fileData` длиннее N байт до декодирования. **Усилие:** S.

### 🟡 YAISAFE.LOGIC.3 / INPUT.1 — Имя ингредиента интерполируется в промпт без разделителя (риск: низкая×низкое)
- **Кросс:** LLM01, T6.
- **Что не так:** пользовательское `name` вставляется в шаблон `PROMPT(name)` как часть `user`-сообщения. Инъекция типа «…; игнорируй выше…» может исказить вывод. **Импакт низкий:** вывод жёстко коерсится (`parseMeta`, белый список категорий, числовые диапазоны), tool-use отсутствует, downstream-исполнения нет — худший случай = неверные КБЖУ (и это ловит `isNutritionSuspicious` + формула 4·БЖУ). Для ТТК-парсинга разделение system/user сделано правильно.
- **Доказательство:** `lib/gemini-ingredient-meta.ts:36,126`.
- **Фикс (hardening, не срочно):** обрамить значение явным разделителем/меткой «данные». **Усилие:** S.

## ✅ Что уже закрыто (не трогать)

- **EXEC.1–4 (N/A по сути):** LLM не имеет инструментов, не исполняет код/SQL, не шлёт наружу. Вектора Tool Misuse/Privilege Escalation отсутствуют.
- **INPUT.1 (TTK):** пользовательские строки идут `user`-сообщением, system-промпт отдельно — `lib/gemini-ttk.ts:167-170`.
- **INPUT.3 (кроме JSON-LD):** corrections / compositionText рендерятся как React-текст (авто-escape); единственный `dangerouslySetInnerHTML` — JSON-LD (см. находку).
- **INFRA.2 (тяжёлые роуты):** parse-ttk / validate-ttk / parse-pdf-ttk / sheets / import — `requireAiImport` (тариф) + `aiRatelimit` (20/час). `app/api/parse-ttk/route.ts:84-87`.
- **INFRA.1:** `package-lock.json` закоммичен; Sentry подключён.
- **EXEC.4 (auth):** webhook сверяет `x-telegram-bot-api-secret-token` (`app/api/telegram/webhook/route.ts:19-22`); AI-роуты под сессией.
- **LOGIC.1/1.2:** system-промпты жёсткие с явными правилами; `temperature: 0`, `max_tokens` заданы; `maxDuration` на роутах.
- **DATA.1/2:** нет RAG; few-shot-примеры изолированы по запросу заведения; секреты только в env, в промптах их нет; barcode/enrich работают в рамках `venueId` (`enrich/route.ts:34`).

## N/A (нерелевантно проекту)

- **EXEC.1–4** — модель без инструментов и без исполнения кода.
- **INFRA.3 (Cross-Agent Poisoning)** — один агент на задачу, нет цепочки агентов.
- **LOGIC.4 (Overwhelming HITL)** — нет потока подтверждений человеком.
- **DATA.3 / DATA.4** — нет RAG и векторной базы.

## План (приоритизированный)

1. [ ] **JSON-LD XSS** — экранировать `<`/`>`/`&` в сериализации (`menu/[slug]/page.tsx:161`). S. Чистый баг, чинить сразу.
2. [ ] **Гейт lookup-barcode / lookup-meta** — продуктовое решение: квота или тарифный гейт на дешёвые AI-lookup'ы. S.
3. [ ] **Лимит размера** `fileData` в parse-pdf-ttk до декодирования. S.
4. [ ] (hardening) обрамить `name` в meta-промпте как «данные». S, не срочно.
