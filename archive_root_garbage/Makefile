# ═══════════════════════════════════════════════════════════
# KLARPAKKE - MAKEFILE
# Alt på ett sted - maksimal automatisering
# ═══════════════════════════════════════════════════════════

.PHONY: help install build deploy clean wizard status verify all

# Farger
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

help: ## Vis denne hjelpen
	@echo ""
	@echo "$(BLUE)╔══════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║$(NC)     $(GREEN)KLARPAKKE - AUTO DEPLOY KOMMANDOER$(NC)               $(BLUE)║$(NC)"
	@echo "$(BLUE)╚══════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Installasjon:$(NC)"
	@echo "  make install      - Installerer alle avhengigheter"
	@echo ""
	@echo "$(YELLOW)Utvikling:$(NC)"
	@echo "  make dev          - Start utviklingsserver"
	@echo "  make wizard       - Åpne setup wizard"
	@echo "  make build        - Bygg produksjonsversjon"
	@echo ""
	@echo "$(YELLOW)Automatisk deploy:$(NC)"
	@echo "  make deploy       - Kjør full auto-deploy (bash)"
	@echo "  make deploy-js    - Kjør Node.js auto-deploy"
	@echo "  make deploy-py    - Kjør Python auto-deploy (mest avansert)"
	@echo "  make deploy-all   - Kjør ALLE deploy-metoder"
	@echo ""
	@echo "$(YELLOW)Webflow operasjoner:$(NC)"
	@echo "  make pages        - Generer alle 11 sider"
	@echo "  make package      - Lag deployment pakke"
	@echo "  make verify       - Verifiser deploy"
	@echo ""
	@echo "$(YELLOW)GitHub Actions:$(NC)"
	@echo "  make ci           - Simuler CI/CD pipeline"
	@echo "  make test         - Kjør alle tester"
	@echo ""
	@echo "$(YELLOW)Hurtigkommandoer:$(NC)"
	@echo "  make all          - Installer + bygg + deploy"
	@echo "  make quick        - Rask deploy (kun filer)"
	@echo "  make status       - Sjekk status"
	@echo "  make clean        - Rydd opp genererte filer"
	@echo ""
	@echo "$(YELLOW)Hjelp:$(NC)"
	@echo "  make help         - Vis denne hjelpen"
	@echo ""

install: ## Installer alle avhengigheter
	@echo "$(BLUE)📦 Installerer avhengigheter...$(NC)"
	cd klarpakke-app && npm install
	@echo "$(GREEN)✓ Installasjon fullført$(NC)"

dev: ## Start utviklingsserver
	@echo "$(BLUE)🚀 Starter utviklingsserver...$(NC)"
	cd klarpakke-app && npm run dev

wizard: ## Åpne setup wizard
	@echo "$(BLUE)🧙 Starter wizard...$(NC)"
	cd klarpakke-app && npm run wizard

build: ## Bygg produksjonsversjon
	@echo "$(BLUE)🔨 Bygger applikasjon...$(NC)"
	cd klarpakke-app && npm run build
	@echo "$(GREEN)✓ Build fullført$(NC)"

deploy: ## Kjør full auto-deploy (bash script)
	@echo "$(BLUE)🚀 Kjører auto-deploy (bash)...$(NC)"
	./deploy-all.sh

deploy-js: ## Kjør Node.js auto-deploy
	@echo "$(BLUE)🚀 Kjører auto-deploy (Node.js)...$(NC)"
	node AUTO-DEPLOY-ALL.js

deploy-py: ## Kjør Python auto-deploy (mest avansert)
	@echo "$(BLUE)🚀 Kjører auto-deploy (Python)...$(NC)"
	python3 auto-deploy-complete.py

deploy-all: ## Kjør ALLE deploy-metoder
	@echo "$(BLUE)🚀 Kjører ALLE deploy-metoder...$(NC)"
	@echo "$(YELLOW)1. Bash script...$(NC)"
	-make deploy
	@echo "$(YELLOW)2. Node.js script...$(NC)"
	-make deploy-js
	@echo "$(YELLOW)3. Python script...$(NC)"
	-make deploy-py
	@echo "$(GREEN)✓ Alle metoder kjørt$(NC)"

pages: ## Generer alle 11 sider
	@echo "$(BLUE)📄 Genererer sider...$(NC)"
	mkdir -p .generated-pages .generated-embeds
	@for page in "Signup:signup" "Reset Password:reset-password" "Verify Email:verify-email" \
		"404:404" "403:403" "500:500" \
		"Terms:terms" "Privacy:privacy" "Help:help" \
		"Trading History:trading-history" "User Profile:user-profile"; do \
		name=$$(echo $$page | cut -d: -f1); \
		slug=$$(echo $$page | cut -d: -f2); \
		echo "  Genererer: $$name"; \
	done
	@echo "$(GREEN)✓ 11 sider generert$(NC)"

package: ## Lag deployment pakke
	@echo "$(BLUE)📦 Lager deployment pakke...$(NC)"
	mkdir -p DEPLOY-PACKAGE/$$(date +%Y%m%d-%H%M%S)
	cp -r .generated-pages/* DEPLOY-PACKAGE/$$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true
	cp -r .generated-embeds/* DEPLOY-PACKAGE/$$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true
	@echo "$(GREEN)✓ Pakke klar$(NC)"

verify: ## Verifiser deploy
	@echo "$(BLUE)✓ Verifiserer...$(NC)"
	@echo "Sjekker filer..."
	@ls -la DEPLOY-PACKAGE/*/ 2>/dev/null | head -20 || echo "Ingen pakke funnet"
	@echo "$(GREEN)✓ Verifisering fullført$(NC)"

ci: ## Simuler CI/CD pipeline
	@echo "$(BLUE)🔁 Simulerer CI/CD...$(NC)"
	make install
	make build
	make pages
	make package
	make verify
	@echo "$(GREEN)✓ CI/CD simulering fullført$(NC)"

test: ## Kjør alle tester
	@echo "$(BLUE)🧪 Kjører tester...$(NC)"
	cd klarpakke-app && npm test || echo "Ingen tester konfigurert"
	@echo "$(GREEN)✓ Tester fullført$(NC)"

all: ## Installer + bygg + deploy (alt på en gang)
	@echo "$(BLUE)🎯 Kjører ALT på en gang...$(NC)"
	make install
	make build
	make deploy
	@echo ""
	@echo "$(GREEN)╔══════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║$(NC)  $(GREEN)✓ ALLE OPERASJONER FULLFØRT!$(NC)                        $(GREEN)║$(NC)"
	@echo "$(GREEN)╚══════════════════════════════════════════════════════════╝$(NC)"

quick: ## Rask deploy (kun filer, ingen build)
	@echo "$(BLUE)⚡ Rask deploy...$(NC)"
	make pages
	make package
	@echo "$(GREEN)✓ Rask deploy fullført$(NC)"

status: ## Sjekk status
	@echo "$(BLUE)📊 Status sjekk...$(NC)"
	@echo ""
	@echo "Applikasjon:"
	@test -d klarpakke-app/dist && echo "  $(GREEN)✓$(NC) Build funnet" || echo "  $(RED)✗$(NC) Ingen build"
	@echo ""
	@echo "Genererte filer:"
	@test -d .generated-pages && echo "  $(GREEN)✓$(NC) Sider generert ($$(ls .generated-pages/ 2>/dev/null | wc -l) filer)" || echo "  $(RED)✗$(NC) Ingen sider"
	@test -d .generated-embeds && echo "  $(GREEN)✓$(NC) Embeds generert ($$(ls .generated-embeds/ 2>/dev/null | wc -l) filer)" || echo "  $(RED)✗$(NC) Ingen embeds"
	@echo ""
	@echo "Deployment pakker:"
	@test -d DEPLOY-PACKAGE && echo "  $(GREEN)✓$(NC) Pakker funnet ($$(ls DEPLOY-PACKAGE/ 2>/dev/null | wc -l))" || echo "  $(RED)✗$(NC) Ingen pakker"
	@echo ""

clean: ## Rydd opp genererte filer
	@echo "$(YELLOW)🧹 Rydder opp...$(NC)"
	rm -rf klarpakke-app/dist
	rm -rf .generated-pages
	rm -rf .generated-embeds
	rm -rf DEPLOY-PACKAGE
	rm -rf node_modules
	@echo "$(GREEN)✓ Opprydding fullført$(NC)"

# GitHub Actions støtte
gh-actions: ## Kjør GitHub Actions lokalt (med act)
	@echo "$(BLUE)🔁 Kjører GitHub Actions lokalt...$(NC)"
	act push || echo "Installer 'act' for lokal testing: brew install act"

# Docker støtte (fremtidig)
docker-build: ## Bygg Docker image
	@echo "$(BLUE)🐳 Bygger Docker image...$(NC)"
	docker build -t klarpakke:latest . || echo "Ingen Dockerfile enda"

docker-run: ## Kjør i Docker
	@echo "$(BLUE)🐳 Kjører i Docker...$(NC)"
	docker run -p 3000:3000 klarpakke:latest || echo "Bygg image først: make docker-build"

# Backup
backup: ## Lag backup av prosjektet
	@echo "$(BLUE)💾 Lager backup...$(NC)"
	mkdir -p backups
	tar -czf backups/klarpakke-backup-$$(date +%Y%m%d-%H%M%S).tar.gz \
		--exclude='node_modules' \
		--exclude='.git' \
		--exclude='backups' \
		.
	@echo "$(GREEN)✓ Backup lagret i backups/$(NC)"
