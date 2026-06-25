import { getMessages } from "next-intl/server";
import { withRequestCache } from "@/lib/cache";

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

async function loadMessagesWithFallbackImpl(locale: string) {
  try {
    return await getMessages({ locale });
  } catch {
    const loaded = await Promise.all(
      NAMESPACES.map((ns) =>
        import(`../../../messages/${locale}/${ns}.json`)
          .then((m) => m.default)
          .catch(() => import(`../../../messages/en/${ns}.json`).then((m) => m.default).catch(() => ({}))),
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

const cachedLoadMessages = withRequestCache(loadMessagesWithFallbackImpl, {
  key: "i18n-messages",
  tags: ["i18n:messages"],
  revalidate: 300,
});

export async function loadMessagesWithFallback(locale: string) {
  return cachedLoadMessages(locale);
}
