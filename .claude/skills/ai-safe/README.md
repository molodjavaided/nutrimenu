# ai-safe

Аудит и безопасный скаффолд ИИ-агентов по фреймворку **AI-SAFE v1.0** (Yandex Cloud),
построенному на OWASP LLM Top 10, OWASP MCP Top 10, OWASP Agentic AI Top 15 и RAG-угрозах.

## Два режима
- **AUDIT** — проверяет существующий проект против 18 контролей по 5 уровням, выдаёт scorecard
  (0–10 на уровень), приоритизированные находки с `файл:строка` и фиксами под стек, отчёт
  `SECURITY-AISAFE.md`.
- **SCAFFOLD** — раскатывает безопасные дефолты при старте нового ИИ-агента.

## 5 уровней (снаружи→внутрь)
1. **INPUT** — интерфейс/ввод (Prompt Injection, DoS, Improper Output)
2. **EXEC** — инструменты (Tool Misuse, Privilege Escalation, Tool Poisoning, Auth Bypass)
3. **INFRA** — инфра/оркестрация (Supply Chain, Denial of Wallet, Cross-Agent Poisoning)
4. **LOGIC** — ядро/рассуждения (Jailbreaking, Reasoning Collapse, Goal Manipulation, HITL)
5. **DATA** — память/знания (KB Poisoning, Sensitive Disclosure, Retrieval Manipulation, Embedding Inversion)

## Как запустить
- «проверь безопасность бота по AI-SAFE» / «audit AI agent security» → AUDIT
- «безопасный скаффолд агента» / «secure agent setup» → SCAFFOLD

## Стек
Принципы вендоро-нейтральны (OWASP/NIST/MITRE). Примеры и дефолт — под стек MyResult
(Vercel + Supabase + OpenRouter + aiogram). Тулинг Yandex Cloud из исходного документа
переведён на нейтральные контроли (таблица в `references/threat-matrix.md`). Работает и для
клиентских проектов на другом стеке.

## Файлы
- `SKILL.md` — мозг: воркфлоу AUDIT и SCAFFOLD, принципы.
- `references/threat-matrix.md` — 18 контролей: риск, принцип, реализация, сигналы для аудита.
- `references/checklist.md` — 15-шаговый практический чек-лист.
- `references/catalogs.md` — каталоги OWASP/RAG + маппинг + реальные инциденты.
- `references/report-template.md` — шаблон отчёта аудита.
