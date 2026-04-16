# KIMI Aliaser for Zsh — v2.2 (2026-04-16)
# Legg til i ~/.zshrc: source /Users/taj/klarpakke/.kimi/aliases.zsh

# Prosjekt
alias kp='cd /Users/taj/klarpakke'
alias kstart='cat /Users/taj/klarpakke/.kimi/QUICKSTART.md && /Users/taj/klarpakke/.kimi/autostart.sh'

# KIMI kommandoer (source of truth: package.json)
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

# Architect mode (lead agent)
alias karch='kimi --agent-file .kimi/agents/klarpakke-architect-agent.yaml'
alias kplan='bash .kimi/AGENT_ORCHESTRATOR.sh plan'
alias kexec='bash .kimi/AGENT_ORCHESTRATOR.sh execute'

# Swarm
alias kswarm='npm run swarm:review'
alias ksec='npm run swarm:security'
alias karchitect='npm run swarm:architect'

# Auth (nytt etter refresh-guard)
alias kauth:test='npm run test:unit -- src/lib/auth/__tests__'
alias kauth:e2e='npx playwright test e2e/auth/refresh-token.spec.ts'

# MemPalace (trygge aliaser — skader ikke hvis mempalace ikke er installert)
alias kwake='command -v mempalace >/dev/null 2>&1 && mempalace wake-up --wing klarpakke || echo "mempalace not available"'
alias know='command -v mempalace >/dev/null 2>&1 && mempalace search || echo "mempalace not available"'
alias krooms='command -v mempalace >/dev/null 2>&1 && mempalace status | grep "ROOM:" || echo "mempalace not available"'
alias kdiary='command -v mempalace >/dev/null 2>&1 && mempalace status | grep "WING:" || echo "mempalace not available"'

# Legacy MemPalace scripts (fungerer fortsatt)
alias diary='./scripts/mempalace-diary.sh'
alias dwrite='./scripts/mempalace-diary.sh write'
alias dread='./scripts/mempalace-diary.sh read'

# Kontekst
alias kcontext='bash .kimi/context-predictor.sh'
alias kskills='cat .kimi/skills-activation.yaml | head -40'

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
alias kstats='echo "Branch: $(git branch --show-current 2>/dev/null)" && echo "Last commit: $(git log -1 --format=%s 2>/dev/null)" && echo "Node: $(node -v 2>/dev/null || echo unknown)"'

# Funksjon for KIMI startup
kimi_startup() {
    cd /Users/taj/klarpakke
    # Sikre riktig Node-versjon for prosjektet
    if command -v nvm &>/dev/null || [ -s "$NVM_DIR/nvm.sh" ]; then
      [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
      nvm use >/dev/null 2>&1
    fi
    clear
    echo "🏛️  KIMI + MemPalace Activated"
    echo "Node: $(node -v 2>/dev/null || echo 'unknown')"
    echo "======================================"
    kwake 2>/dev/null | tail -15 || true
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
