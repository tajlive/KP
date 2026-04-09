# 🛠️ Skills Quick Reference

Aktiver relevante skills basert på filtype:

| Arbeider med | Skill | Path |
|--------------|-------|------|
| API routes | api-patterns | `.agent/skills/api-patterns/` |
| Database | database-design | `.agent/skills/database-design/` |
| React/Next.js | nextjs-react-expert | `.agent/skills/nextjs-react-expert/` |
| UI komponenter | frontend-design | `.agent/skills/frontend-design/` |
| Testing | testing-patterns | `.agent/skills/testing-patterns/` |
| i18n | i18n-localization | `.agent/skills/i18n-localization/` |
| Sikkerhet | vulnerability-scanner | `.agent/skills/vulnerability-scanner/` |
| Performance | performance-profiling | `.agent/skills/performance-profiling/` |

## Auto-Aktivering (Foreslått)
```yaml
# .kimi/skills-activation.yaml
src/app/api/**/*.ts: [api-patterns, security-testing]
src/components/**/*.tsx: [frontend-design, nextjs-react-expert]
supabase/migrations/*.sql: [database-design]
e2e/**/*.spec.ts: [webapp-testing, testing-patterns]
```
