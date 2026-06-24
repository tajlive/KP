import { getMessages } from "next-intl/server";

const NAMESPACES = [
  "about",
  "account",
  "admin",
  "auth",
  "autopilot",
  "beta",
  "checkout",
  "common",
  "competition",
  "components",
  "copyTrading",
  "coursePreview",
  "dashboard",
  "education",
  "errors",
  "footer",
  "gamification",
  "help",
  "landing",
  "legal",
  "marketplace",
  "metadata",
  "navigation",
  "notifications",
  "onboarding",
  "pricing",
  "quizPage",
  "settings",
  "simulator",
  "strategyMarketplace",
  "tax",
  "taxReport",
  "threeSteps",
  "toasts",
  "tradeHistory",
  "trading",
  "tradingResults",
] as const;

export async function loadMessagesWithFallback() {
  try {
    return await getMessages();
  } catch {
    const loaded = await Promise.all(
      NAMESPACES.map((ns) =>
        import(`../../../messages/en/${ns}.json`)
          .then((m) => m.default)
          .catch(() => ({})),
      ),
    );

    const messages: Record<string, unknown> = {};
    NAMESPACES.forEach((ns, index) => {
      messages[ns] = loaded[index];
    });

    // Legacy aliases that the UI still references
    messages.helpPage = messages.help;
    messages.contact = (messages.metadata as Record<string, unknown>)?.contact;

    return messages;
  }
}
