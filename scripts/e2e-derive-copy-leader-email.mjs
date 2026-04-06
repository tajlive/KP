/**
 * Avleder egen «paper leader»-e-post uten ekstra GitHub-secrets.
 * Gmail m.fl.: local+tag@domain — vi stripper eksisterende +suffix og legger på +e2e-copy-leader.
 * @param {string} followerEmail
 * @returns {string | null}
 */
export function deriveE2eCopyLeaderEmail(followerEmail) {
  const raw = followerEmail.trim();
  const at = raw.lastIndexOf("@");
  if (at <= 0 || at >= raw.length - 1) return null;
  const domain = raw.slice(at + 1).toLowerCase();
  let local = raw.slice(0, at);
  const plus = local.indexOf("+");
  if (plus !== -1) {
    local = local.slice(0, plus);
  }
  if (!local) return null;
  return `${local}+e2e-copy-leader@${domain}`;
}
