# KIMI Aliaser for Zsh — v2.1 (2026-04-14)
# Legg til i ~/.zshrc: source /Users/taj/klarpakke/.kimi/aliases.zsh

# Prosjekt
alias kp='cd /Users/taj/klarpakke'
alias kstart='cat /Users/taj/klarpakke/.kimi/QUICKSTART.md && /Users/taj/klarpakke/.kimi/autostart.sh'

# KIMI kommandoer
alias khealth='npm run health:prod:gate'
alias kverify='npm run verify'
alias kdev='npm run dev'
alias kbuild='npm run build'
alias klint='npm run lint'
alias ktype='npm run type-check'
alias ktest='npm run test:unit'
alias ke2e='npm run test:e2e:critical:chromium'
alias ke2e:smoke='npm run test:e2e:smoke'
alias kdb='npm run db:status'
alias kpush='npm run db:push'
alias kdeploy='npm run deploy:prod'
alias kpreview='vercel deploy --target=preview'
alias kprod='bash /Users/taj/klarpakke/.kimi/prod-deploy.sh'
alias kprod:preview='bash /Users/taj/klarpakke/.kimi/prod-deploy.sh --preview'

# Pipeline
alias kci='npm run lint:gate && npm run test:unit'
alias kmonitor='curl -s https://www.klarpakke.no/api/health | jq -r ".status" || echo "unreachable"'

# Auth (nytt etter refresh-guard)
alias kauth:test='npm run test:unit -- src/lib/auth/__tests__'
alias kauth:e2e='npx playwright test e2e/auth/refresh-token.spec.ts'

# MemPalace (FTS5)
alias kwake='mempalace wake-up --wing klarpakke'
alias know='mempalace search'
alias krooms='mempalace status | grep "ROOM:"'
alias kdiary='mempalace status | grep "WING:"

# Legacy MemPalace scripts (fungerer fortsatt)
alias diary='./scripts/mempalace-diary.sh'
alias dwrite='./scripts/mempalace-diary.sh write'
alias dread='./scripts/mempalace-diary.sh read'

# Kontekst
alias kcontext='.kimi/context-predictor.sh'
alias kskills='cat .kimi/skills-quickref.md'

# Git shortcuts
alias gs='git status'
alias ga='git add -A'
alias gc='git commit -m'
alias gp='git push origin main'
alias gl='git log --oneline -10'
alias gco='git checkout'
alias gd='git diff'

# Node / Project
alias knode='nvm use 24.14.1 2>/dev/null || nvm install 24.14.1'

# Utils
alias kstats='echo "MemPalace drawers: $(mempalace status 2>/dev/null | grep "drawers" | grep -o "[0-9]*")" && echo "Last commit: $(git log -1 --format=%s 2>/dev/null)"'

# Funksjon for KIMI startup
kimi_startup() {
    cd /Users/taj/klarpakke
    # Sikre riktig Node-versjon for prosjektet
    if command -v nvm &>/dev/null || [ -s "$NVM_DIR/nvm.sh" ]; then
      [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
      nvm use >/dev/null 2>&1
    fi
    clear
    echo "🏛️  KIMI + MemPalace Activated (FTS5)"
    echo "Node: $(node -v 2>/dev/null || echo 'unknown')"
    echo "======================================"
    kwake 2>/dev/null | tail -15
    echo ""
    echo "Type 'kstart' for full quickstart guide"
}

# Auto-kjør ved cd til klarpakke
autoload -U add-zsh-hook
kimi_autostart() {
    if [[ "$PWD" == "/Users/taj/klarpakke" ]]; then
        if [[ -z "$KIMI_AUTO_STARTED" ]]; then
            export KIMI_AUTO_STARTED=1
            kimi_startup
        fi
    fi
}
add-zsh-hook chpwd kimi_autostart
