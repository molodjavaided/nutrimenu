# Гайд: как ставить задачи Claude Fable 5 / Mythos 5

> Источник: документация Anthropic «Prompting Claude Fable 5», июль 2026 (адаптация NickVels). Конвертировано из Fable-5.pdf.

⚠️ **Ограничение:** Fable 5 не предназначена для наступательной кибербезопасности и задач по биологии/наукам о жизни — такие запросы отклоняет. Через API можно настроить автоперевод отклонённых запросов на Opus 4.8.

## 01. Что изменилось в Fable 5 (vs Opus 4.8)

- **Длинные автономные задачи** — держит цель на многочасовых/многодневных прогонах.
- **Правильный результат с первого раза** на сложных, хорошо описанных задачах.
- **Зрение** — точнее читает плотные технические картинки/скриншоты, тратит меньше токенов.
- **Рабочие документы** — финансовый анализ, таблицы, слайды «как у профессионала».
- **Код-ревью и отладка** — заметно лучше находит баги, включая всю кодовую базу и историю репо.
- **Работа с неопределённостью** — сама определяет следующий шаг в многослойных запросах.
- **Делегирование** — надёжнее запускает параллельных субагентов.

🎯 **Вывод:** давайте Fable 5 самые сложные задачи, а не самые простые.

## 02. Effort — главный регулятор

Баланс качество/скорость/стоимость: `low` (рутина) → `medium` (обычные) → `high` (по умолчанию) → `xhigh` (самое сложное) → `max` (предельная глубина).

Снижайте effort, если задача выполняется дольше нужного. На рутине высокий effort провоцирует «уборку сверх задачи».

**Промпт против переусложнения:**
> Don't add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup and a one-shot operation usually doesn't need a helper. Don't design for hypothetical future requirements: do the simplest thing that works well. Avoid premature abstraction and half-finished implementations. Don't add error handling, fallbacks, or validation for scenarios that cannot happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). Don't use feature flags or backwards-compatibility shims when you can just change the code.

## 03. Задачи стали длиннее

Долгие раздумья и многочасовые прогоны — норма; закладывайте в таймауты. Против «застревания в планировании»:

**Промпт «действуй»:**
> When you have enough information to act, act. Do not re-derive facts already established in the conversation, re-litigate a decision the user has already made, or narrate options you will not pursue in user-facing messages. If you are weighing a choice, give a recommendation, not an exhaustive survey. This does not apply to thinking blocks.

## 04. Ставь чёткие границы

**Промпт «границы действий»:**
> When the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, the deliverable is your assessment. Report your findings and stop. Don't apply a fix until they ask for one. Before running a command that changes system state (restarts, deletes, config edits), check that the evidence actually supports that specific action. A signal that pattern-matches to a known failure may have a different cause.

## 05. Давай причину, а не только просьбу

Шаблон: *«I'm working on [the larger task] for [who it's for]. They need [what the output enables]. With that in mind: [request].»*

## 06. Управляй краткостью и стилем

Одна короткая фраза заменяет список запретов.

**Промпт «краткость и читабельность»:**
> Lead with the outcome. Your first sentence after finishing should answer "what happened" or "what did you find". Supporting detail and reasoning come after. Being readable and being concise are different things, and readability matters more. The way to keep output short is to be selective about what you include (drop details that don't change what the reader would do next), not to compress the writing into fragments, abbreviations, arrow chains, or jargon.

**Промпт «точки остановки»:**
> Pause for the user only when the work genuinely requires them: a destructive or irreversible action, a real scope change, or input that only they can provide. If you hit one of these, ask and end the turn, rather than ending on a promise.

## 07. Долгие автономные задачи

**1. Честный прогресс** (убирает ложные «готово»):
> Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.

**2. Против ранней остановки (автономный режим):**
> You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task. For reversible actions that follow from the original request, proceed without asking. Before ending your turn, check your last paragraph. If it is a plan, an analysis, a question, a list of next steps, or a promise about work you have not done, do that work now with tool calls. End your turn only when the task is complete or you are blocked on input only the user can provide.

**3. Беспокойство о контексте** — не показывайте модели счётчик токенов; иначе:
> You have ample context remaining. Do not stop, summarize, or suggest a new session on account of context limits. Continue the work.

## 08. Делегируй субагентам

> Delegate independent subtasks to subagents and keep working while they run. Intervene if a subagent goes off track or is missing relevant context.

## 09. Дай Fable память

Markdown-файл с уроками:
> Store one lesson per file with a one-line summary at the top. Record corrections and confirmed approaches alike, including why they mattered. Don't save what the repo or chat history already records; update an existing note rather than creating a duplicate; delete notes that turn out to be wrong.

Завести память из истории: *«Reflect on the previous sessions we've had together. Use subagents to identify core themes and lessons, and store them in [X].»*

## 10. Для продвинутых: обвязка и API

- Начинайте с верха планки сложности — дайте задачу труднее и попросите оценить/уточнить/выполнить.
- Проверку выносите отдельным субагентам — свежий проверяющий лучше самокритики.
- Пересмотрите старые промпты и скиллы — дотошные инструкции под прошлые модели ухудшают результат. Уберите лишнее.
- Не заставляйте пересказывать рассуждения в ответе (может вызвать отказ) — читайте thinking-блоки.

**Самопроверка:** *«Establish a method for checking your own work at an interval of [X] as you build. Run this every [X], verifying your work with subagents against the specification.»*

**Инструмент send_to_user** — для долгих асинхронных агентов; вызывать между тул-коллами, когда есть контент, который пользователь должен прочитать дословно.

## Главное одним экраном

| Принцип | Суть |
|---|---|
| Давайте сложное | Fable 5 раскрывается на трудных задачах |
| Начинайте с effort high | Ниже — на рутине, xhigh — на ответственном |
| Не бойтесь долгих прогонов | Дайте границу по времени, бюджету и критерию «готово» |
| Управляйте одной фразой | Краткость, границы, точки остановки — короткой инструкцией |
| Объясняйте зачем | Контекст важнее формулировки |
| Проверяйте прогресс | Сверять заявления с реальными результатами |
| Делегируйте субагентам | Независимые куски — параллельно |
| Дайте память | Markdown-файл с уроками |
