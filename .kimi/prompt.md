# Klarpakke Context for Kimi Code

## Project
- Name: Klarpakke Universitet
- Location: /Users/taj/klarpakke
- Tech: Next.js 15, React 19, TypeScript, Supabase, Tailwind

## API Commands (USE THESE!)
Base: http://localhost:3456 | Auth: Bearer klarpakke-dev-token

### REQUIRED workflow:
1. **Check status first**:
   curl -s -H "Authorization: Bearer klarpakke-dev-token" http://localhost:3456/git/status

2. **Read before editing**:
   curl -s -H "Authorization: Bearer klarpakke-dev-token" "http://localhost:3456/file/read?path=FILE_PATH"

3. **Verify after changes**:
   curl -s -H "Authorization: Bearer klarpakke-dev-token" http://localhost:3456/build
   curl -s -H "Authorization: Bearer klarpakke-dev-token" http://localhost:3456/lint

4. **Commit**:
   curl -s -X POST -H "Authorization: Bearer klarpakke-dev-token" -H "Content-Type: application/json" -d '{"message": "DESC"}' http://localhost:3456/git/commit
   curl -s -X POST -H "Authorization: Bearer klarpakke-dev-token" http://localhost:3456/git/push

## ALWAYS use API commands instead of direct git/npm!
