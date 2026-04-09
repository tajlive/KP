# KIMI Aliaser for Zsh
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
alias kdb='npm run db:status'
alias kpush='npm run db:push'
alias kdeploy='npm run deploy:prod'

# MemPalace
alias know='./scripts/knowledge-search.sh'
alias diary='./scripts/mempalace-diary.sh'
alias dwrite='./scripts/mempalace-diary.sh write'
alias dread='./scripts/mempalace-diary.sh read'
alias dstatus='./scripts/mempalace-diary.sh status'

# Kontekst
alias kcontext='.kimi/context-predictor.sh'
alias kskills='cat .kimi/skills-quickref.md'
alias krooms='grep "name:" mempalace.yaml | head -10'

# Git shortcuts
alias gs='git status'
alias ga='git add -A'
alias gc='git commit -m'
alias gp='git push origin main'
alias gl='git log --oneline -10'

# Utils
alias kstats='echo "Diary entries: $(./scripts/mempalace-diary.sh status 2>/dev/null)" && echo "Last commit: $(git log -1 --format=%s 2>/dev/null)"'
alias kwake='.kimi/autostart.sh'

# Funksjon for KIMI startup
kimi() {
    cd /Users/taj/klarpakke
    clear
    echo "🏛️  KIMI + MemPalace Activated"
    echo "============================"
    kwake
    echo ""
    echo "Type 'kstart' for full quickstart guide"
}

# Auto-kjør ved cd til klarpakke
autoload -U add-zsh-hook
kimi_autostart() {
    if [[ "$PWD" == "/Users/taj/klarpakke" ]]; then
        if [[ -z "$KIMI_AUTO_STARTED" ]]; then
            export KIMI_AUTO_STARTED=1
            kimi
        fi
    fi
}
add-zsh-hook chpwd kimi_autostart
