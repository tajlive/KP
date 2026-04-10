# OAuth Debug Workflow

## Trigger
Bruker rapporterer OAuth/Auth/Session problem

## Steps

### 1. Initialize Sherlock Mode
```bash
# Activate OAuth Sherlock agent
kimi agent klarpakke-oauth-sherlock
```

### 2. Gather Context from MemPalace
```bash
# Query knowledge graph
mempalace_kg_query(entity="OAuth")
mempalace_kg_query(entity="session")
mempalace_kg_query(entity="google auth")

# Search for similar issues
mempalace_search(query="cookie domain mismatch")
mempalace_search(query="access_denied")
mempalace_search(query="session lost")
```

### 3. Analyze Current State
```bash
# Check current auth files
cat src/middleware/auth.ts
cat src/middleware/auth-guard.ts
cat src/app/[locale]/auth/callback/route.ts

# Check environment
cat .env.local | grep -E "SUPABASE|GOOGLE|APP_URL"
```

### 4. Web Research (if needed)
```bash
# Research unknown error
perplexity_research "Supabase auth PKCE verification failed Next.js 15"

# Check official docs
query_docs(libraryId="/supabase/supabase", query="PKCE cookie configuration")
```

### 5. Systematic Debugging
Follow the 4-phase protocol in agent definition:
1. Reproduce
2. Isolate
3. Understand (5 Whys)
4. Fix & Verify

### 6. Document Fix in MemPalace
```bash
# Add to knowledge graph
mempalace_kg_add(subject="<issue>", predicate="fixed_by", object="<solution>")

# Write diary entry
mempalace_diary_write(
  agent_name="oauth-sherlock",
  entry="SESSION:YYMMDD|TYPE:OAUTH_FIX|ISSUE:<desc>|FIX:<solution>|★★★★★"
)
```

### 7. Verification
```bash
npm run verify
npm run test:e2e:critical:chromium
```

## Output
- Fixed auth issue
- Updated MemPalace knowledge
- Regression test (if applicable)
- Diary entry
