# ⚡ Klarpakke Arbeidsflyt - Cheat Sheet

> 📚 **Full dokumentasjon:** [.kimi/WORKFLOW_RULES.md](./.kimi/WORKFLOW_RULES.md)

---

## 🚀 Standard arbeidsflyt (Kopier-lim inn)

```bash
# Test, commit, push, watch
npm run test:unit && \
git add -A && \
git commit -m "feat: your message" && \
git push origin main && \
gh run watch

# Verifiser produksjon (etter 5-10 min)
curl -I https://www.klarpakke.no/no
```

---

## ✅ ALLTID gjør

1. **Push til GitHub først**
2. **Vent på deployment** (sjekk Actions)
3. **La KIMI lese via MCP** (aldri manuelt i Cloud)

---

## ❌ ALDRI gjør

```bash
# ❌ ALDRI commit secrets
git add .env  # STOPP!

# ❌ ALDRI commit MCP cache
git add .mcp-cache/  # STOPP!

# ❌ ALDRI force push
git push --force  # STOPP!

# ❌ ALDRI rediger Cloud Console direkte
# GitHub Actions overskriver ved neste deploy!
```

---

## 🔐 Secrets management

```bash
# Sett secret via CLI
gh secret set MY_SECRET --body "value" --repo tomarnejensen/klarpakke

# List secrets
gh secret list --repo tomarnejensen/klarpakke

# Injiser i workflow (.github/workflows/deploy-cloudrun.yml)
# GitHub Actions setter dem i Cloud Run automatisk
```

---

## 🚨 Feilsøking

```bash
# CI feiler?
gh run view --log | grep -i error
npm run test:unit  # reproduser lokalt

# Deploy feiler?
gh secret list  # sjekk om secrets finnes
gh run view --log | grep -A 20 "Deploy"

# KIMI ser ikke endringer?
git log -1 --oneline  # sjekk push
gh run list --limit 1  # sjekk deployment
curl -I https://www.klarpakke.no/no  # verifiser prod
```

---

## 🔗 Viktige linker

- **GitHub:** https://github.com/tomarnejensen/klarpakke
- **Actions:** https://github.com/tomarnejensen/klarpakke/actions  
- **Produksjon:** https://www.klarpakke.no
- **Cloud Console:** https://console.cloud.google.com/run?project=klarpakke-universitet

---

## 🎯 Huskeregel

**GitHub → Cloud → KIMI**  
*Alltid denne rekkefølgen!*

```
👨‍💻 Developer
  ↓ git push
🐙 GitHub (Source of Truth)
  ↓ auto-deploy
☁️ Google Cloud Run
  ↓ MCP reads
🤖 KIMI AI
```
