# 🔐 SSH Oppsett - Mac M1 Tilgang

Denne guiden lar Kimi få permanent SSH-tilgang til din Mac.

## 📋 Din SSH Nøkkel (Legg til på Mac)

**Offentlig nøkkel (kopier denne):**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKW3c1liPFzFKUkcGi7RClOyybA3WPpxe2/clX5yYGUa kimi@openclaw
```

## 🔧 Steg-for-steg Oppsett

### Steg 1: Aktiver SSH på Mac

```bash
# Åpne Terminal på din Mac og kjør:
sudo systemsetup -setremotelogin on

# Verifiser:
sudo systemsetup -getremotelogin
# Skal vise: Remote Login: On
```

### Steg 2: Legg til SSH Nøkkel

```bash
# På din Mac:
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKW3c1liPFzFKUkcGi7RClOyybA3WPpxe2/clX5yYGUa kimi@openclaw" >> ~/.ssh/authorized_keys

# Sett riktig permissions:
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Steg 3: Finn Din Macs IP

```bash
# På din Mac:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Eksempel output:
# inet 192.168.1.50 netmask 0xffffff00 broadcast 192.168.1.255
# Husk IP-en: 192.168.1.50
```

### Steg 4: Router Port Forwarding

1. **Logg inn på routeren** (vanligvis http://192.168.1.1)
2. **Finn Port Forwarding** (kan hete: Virtual Server, NAT, Port Mapping)
3. **Legg til regel:**
   - External Port: 2222 (eller 22)
   - Internal IP: Din Macs IP (f.eks. 192.168.1.50)
   - Internal Port: 22
   - Protocol: TCP
4. **Lagre**

### Steg 5: Finn Din Offentlige IP

```bash
# På din Mac:
curl ifconfig.me

# Dette er IP-en Kimi trenger for å koble til
```

### Steg 6: Test SSH (Fra Kimi)

```bash
# Kimi vil kjøre:
ssh -p 2222 -i ~/.ssh/klarpakke_mac taj@DIN_OFFENTLIGE_IP

# Bytt ut:
# - 2222 med porten du valgte
# - taj med ditt Mac brukernavn
# - DIN_OFFENTLIGE_IP med IP fra steg 5
```

## 🚀 Automatisk Oppsett Script

**Lagre dette som `setup-ssh.sh` på din Mac:**

```bash
#!/bin/bash
echo "🔐 Setter opp SSH for Kimi..."

# 1. Aktiver SSH
sudo systemsetup -setremotelogin on

# 2. Lag .ssh mappe hvis den ikke finnes
mkdir -p ~/.ssh

# 3. Legg til Kimis nøkkel
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKW3c1liPFzFKUkcGi7RClOyybA3WPpxe2/clX5yYGUa kimi@openclaw" >> ~/.ssh/authorized_keys

# 4. Sett permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# 5. Vis info
echo ""
echo "✅ SSH satt opp!"
echo ""
echo "Din lokale IP:"
ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1
echo ""
echo "Din offentlige IP:"
curl ifconfig.me
echo ""
echo "Husk: Sett opp port forwarding i router!"
```

**Kjør:** `chmod +x setup-ssh.sh && ./setup-ssh.sh`

## 📡 Etter Oppsett - Gi Info til Kimi

Send denne informasjonen til Kimi:

```
SSH Info:
- Offentlig IP: ___.___.___.___
- Port: _____ (f.eks. 2222)
- Brukernavn: _____ (din Mac bruker)
- Lokal IP: 192.168.1.___
```

## 🔒 Sikkerhet

- Bruk port 2222 i stedet for 22 (mindre skanning)
- Kun SSH-nøkkel (ikke passord)
- Mac må være på og koblet til nett
- Router må ha port forwarding aktiv

## 🧪 Test

Etter oppsett, skal Kimi kunne kjøre:
```bash
ssh -p DIN_PORT -i ~/.ssh/klarpakke_mac DITT_BRUKERNAVN@DIN_IP "pwd"
```

---
Opprettet: 2026-03-05
Nøkkel: ~/.ssh/klarpakke_mac
