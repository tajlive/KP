#!/bin/bash
# Setup SSH key access for Kimi CLI

echo "═══════════════════════════════════════════════════════════════"
echo "  SSH Nøkkel-oppsett for Kimi CLI"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Sjekk om .ssh finnes
if [ ! -d "$HOME/.ssh" ]; then
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"
fi

# Generer SSH nøkkelpar (hvis ikke eksisterer)
KEY_NAME="kimi_cli_key"
KEY_PATH="$HOME/.ssh/$KEY_NAME"

if [ ! -f "$KEY_PATH" ]; then
    echo "🔐 Genererer SSH nøkkelpar..."
    ssh-keygen -t ed25519 -a 100 -f "$KEY_PATH" -N "" -C "kimi-cli@$(hostname)"
    echo "✅ Nøkkel generert: $KEY_PATH"
else
    echo "✅ Nøkkel finnes allerede: $KEY_PATH"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  SETUP INSTRUKSJONER"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  LEGG TIL NØKKEL I authorized_keys:"
echo "   cat $KEY_PATH.pub >> ~/.ssh/authorized_keys"
echo ""
echo "2️⃣  SETT RIKTIGE TILLATELSER:"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo "   chmod 700 ~/.ssh"
echo ""
echo "3️⃣  AKTIVER SSH (hvis ikke allerede aktivert):"
echo "   sudo systemsetup -setremotelogin on"
echo ""
echo "4️⃣  CONFIG FOR ENKEL BRUK (~/.ssh/config):"
echo ""
cat << 'EOF'
Host klarpakke-local
    HostName 100.69.193.79
    User taj
    IdentityFile ~/.ssh/kimi_cli_key
    AddKeysToAgent yes
    UseKeychain yes
EOF
echo ""
echo "5️⃣  TEST TILGANG:"
echo "   ssh -i ~/.ssh/kimi_cli_key taj@100.69.193.79"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  OFFENTLIG NØKKEL (kopier dette)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
cat "$KEY_PATH.pub"
echo ""
echo "═══════════════════════════════════════════════════════════════"
