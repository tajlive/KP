/**
 * Locale-aware absolute timestamp for signal rows (SoT locales: no, en).
 */
export function formatSignalDateTime(
  locale: string,
  iso: string | null | undefined,
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const tag =
    locale === "no"
      ? "nb-NO"
      : locale === "en"
        ? "en-GB"
        : locale.replace("_", "-");

  try {
    return new Intl.DateTimeFormat(tag, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  }
}
