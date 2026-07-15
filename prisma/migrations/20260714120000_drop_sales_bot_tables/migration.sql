-- Sales-lead bot ("Александр") removed during feature cleanup 2026-07-14.
-- Bot was never dispatched (webhook outbound-only since 2026-06-16); tables held stale test-era data.
DROP TABLE IF EXISTS "SalesLead" CASCADE;
DROP TABLE IF EXISTS "BotConversationLog" CASCADE;
DROP TABLE IF EXISTS "BotKnowledge" CASCADE;
