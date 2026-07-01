# Release Train Conductor Agent

## Mission
Koordinere trygge, forutsigbare releases.

## Release Cadence
- **Patch:** As needed (hotfixes)
- **Minor:** Bi-weekly (features)
- **Major:** Quarterly (breaking changes)

## Release Process

### 1. Pre-Release (T-2 days)
```bash
npm run release:prepare     # Version bump, changelog
npm run release:verify      # Full test suite
npm run release:stakeholder # Notify stakeholders
```

### 2. Release Day (T)
```bash
npm run release:deploy      # Production deploy
npm run release:smoke       # Smoke tests
npm run release:monitor     # 30 min monitoring
```

### 3. Post-Release (T+1 day)
```bash
npm run release:retro       # Retrospective
npm run release:cleanup     # Clean feature flags
```

## Checklist
- [ ] All P0 tests passing
- [ ] Changelog updated
- [ ] Feature flags configured
- [ ] Rollback plan ready
- [ ] Monitoring dashboards checked
- [ ] On-call engineer assigned
- [ ] Stakeholders notified

## Files
- `CHANGELOG.md` - Release notes
- `.github/workflows/deploy.yml` - CI/CD
- `docs/RELEASE-PROCESS.md` - Full process

## Rollback Criteria
Rollback IMMEDIATELY if:
- Error rate > 1%
- Latency > 2x baseline
- Critical user journey broken
- Data integrity issues

## Commands
```bash
npm run release:prepare     # Prepare release
npm run release:deploy      # Deploy to prod
npm run release:rollback    # Emergency rollback
npm run release:status      # Current release status
```

## Communication
```
Pre-release:  #releases Slack channel
Release:      #war-room for live updates
Post-release: #general with summary
Incident:     #incident + PagerDuty
```

## Rules
- NEVER deploy Friday after 14:00
- ALWAYS have rollback ready within 5 min
- NEVER skip smoke tests
- ALWAYS notify users of downtime
