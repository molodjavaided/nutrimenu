# AI-SAFE — каталоги угроз (приложение, для перекрёстных ссылок)

Источник: AI-SAFE v1.0, приложение. Используется в AUDIT для трассировки находки
к международным стандартам. Колонка «→ AI-SAFE» — на какой контроль матрицы маппится.

## OWASP LLM Top 10 (2025)
| Код | Название | → AI-SAFE |
|---|---|---|
| LLM01 | Prompt Injection | INPUT.1, LOGIC.1, LOGIC.3 |
| LLM02 | Sensitive Information Disclosure | DATA.2 |
| LLM03 | Supply Chain Vulnerabilities | INFRA.1 |
| LLM04 | Data and Model Poisoning | DATA.1 |
| LLM05 | Improper Output Handling | INPUT.3 |
| LLM06 | Excessive Agency | EXEC.1 |
| LLM07 | System Prompt Leakage | DATA.2 |
| LLM08 | Vector and Embedding Weaknesses | DATA.3, DATA.4 |
| LLM09 | Misinformation | LOGIC.2 |
| LLM10 | Unbounded Consumption | INPUT.2, INFRA.2 |

## OWASP MCP (Model Context Protocol) Top 10
| Код | Название | → AI-SAFE |
|---|---|---|
| MCP01 | Prompt Injection | INPUT.1 |
| MCP02 | Tool Poisoning | EXEC.3 |
| MCP03 | Privilege Abuse | EXEC.2 |
| MCP04 | Tool Shadowing / Shadow MCP | EXEC.3 |
| MCP05 | Indirect Prompt Injection | INPUT.1, INFRA.3 |
| MCP06 | Sensitive Data Exposure & Token Theft | DATA.2 |
| MCP07 | Command/SQL Injection & Malicious Code Exec | INPUT.3, EXEC.2 |
| MCP08 | Rug Pull Attacks | EXEC.3 |
| MCP09 | Denial of Wallet/Service | INPUT.2, INFRA.2 |
| MCP10 | Authentication Bypass | EXEC.4 |

## RAG-угрозы
| Угроза | → AI-SAFE |
|---|---|
| Vector Database Compromise | DATA.4 |
| Access Control Failures in RAG | DATA.1, DATA.2 |
| Embedding Inversion Attacks | DATA.4 |
| Context Leakage Between Users | DATA.2 |
| Knowledge Base Poisoning | DATA.1 |
| Retrieval Manipulation | DATA.3 |
| Indirect Prompt Injection via Documents | INPUT.1 |
| Data Federation Conflicts | LOGIC.2 |
| Similarity Search Exploitation | DATA.2 |
| Vector Database Resource Exhaustion | INPUT.2, INFRA.2 |

## OWASP AI Agents (Agentic AI) Top 15
| Код | Название | → AI-SAFE |
|---|---|---|
| T1 | Memory Poisoning | DATA.1 |
| T2 | Tool Misuse | EXEC.1 |
| T3 | Privilege Compromise | EXEC.2 |
| T4 | Resource Overload | INPUT.2, INFRA.2 |
| T5 | Cascading Hallucinations | LOGIC.2, INFRA.3 |
| T6 | Intent Breaking & Goal Manipulation | LOGIC.3 |
| T7 | Misaligned & Deceptive Behaviors | LOGIC.1 |
| T8 | Repudiation & Untraceability | LOGIC.3 (логирование) |
| T9 | Identity Spoofing & Impersonation | EXEC.4 |
| T10 | Overwhelming HITL | LOGIC.4 |
| T11 | Supply Chain Attacks | INFRA.1 |
| T12 | AI Agents as Attack Tools | (внешний/этический, вне периметра одного агента) |
| T13 | Authorization and Control Hijacking | EXEC.4 |
| T14 | Impact Chain and Blast Radius | INFRA.3 |
| T15 | Cross-Agent Communication Poisoning | INFRA.3 |

## Реальные инциденты (для иллюстрации риска в отчёте)
- **Дипфейк-мошенничество, банки, Гонконг, март 2025, ~$25M** — INPUT.3 (даунстрим доверяет ИИ-выводу). Урок: MFA, не один фактор.
- **Взлом GPT-4.1 через отравление инструментов, апр–июнь 2025** — EXEC.3. Урок: контроль целостности описаний tool, разделение данных и инструкций.
- **Утечка DeepSeek, янв–март 2025, >1M записей** — INFRA.1 (открытая БД без аутентификации). Урок: обязательная аутентификация хранилищ, аудит конфигов.
- **CAIN — захват системных промптов, май 2025** — LOGIC.3 + LOGIC.1. Урок: Prompt Hardening, Red Teaming.
- **Утечка ChatGPT через Prompt Injection, март 2025** — INPUT.1 + DATA.2. Урок: многоуровневая санитизация, разделение инструкций и данных.
