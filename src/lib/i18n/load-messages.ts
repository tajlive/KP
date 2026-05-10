import { getMessages } from "next-intl/server";

export async function loadMessagesWithFallback() {
  try {
    return await getMessages();
  } catch {
    const [common, landing, auth, navigation, footer, dashboard] = await Promise.all([
      import("../../../messages/en/common.json").then((m) => m.default).catch(() => ({})),
      import("../../../messages/en/landing.json").then((m) => m.default).catch(() => ({})),
      import("../../../messages/en/auth.json").then((m) => m.default).catch(() => ({})),
      import("../../../messages/en/navigation.json").then((m) => m.default).catch(() => ({})),
      import("../../../messages/en/footer.json").then((m) => m.default).catch(() => ({})),
      import("../../../messages/en/dashboard.json").then((m) => m.default).catch(() => ({})),
    ]);
    return { common, landing, auth, navigation, footer, dashboard };
  }
}
