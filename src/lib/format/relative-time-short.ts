/** Kort relativ tid for signal- og trade-rader (no/en + fallback). */
export function formatRelativeTimeShort(date: Date, locale: string): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const isNo = locale === "no";
  const isTh = locale === "th";
  const isZh = locale === "zh";

  if (minutes < 1) {
    if (isNo) return "Nå";
    if (isTh) return "เมื่อสักครู่";
    if (isZh) return "刚刚";
    return "Just now";
  }
  if (minutes < 60) {
    if (isNo) return `${minutes}m siden`;
    if (isTh) return `${minutes} นาทีที่แล้ว`;
    if (isZh) return `${minutes} 分钟前`;
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (isNo) return `${hours}t siden`;
    if (isTh) return `${hours} ชม. ที่แล้ว`;
    if (isZh) return `${hours} 小时前`;
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (isNo) return `${days}d siden`;
  if (isTh) return `${days} วันที่แล้ว`;
  if (isZh) return `${days} 天前`;
  return `${days}d ago`;
}
