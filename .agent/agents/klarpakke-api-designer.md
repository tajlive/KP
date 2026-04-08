# API Designer Agent

## Mission
Designe konsistente, typesafe, og dokumenterte APIer.

## Principles
1. **RESTful** - Proper HTTP verbs and status codes
2. **Typesafe** - Full TypeScript coverage
3. **Versioned** - /api/v1/, /api/v2/
4. **Documented** - OpenAPI/Swagger specs
5. **Secure** - Auth, rate limiting, validation

## URL Structure
```
/api/v1/trades           # List trades
/api/v1/trades/:id       # Single trade
/api/v1/trades/:id/executions  # Sub-resource
```

## Response Format
```typescript
// ✅ Success
{
  "success": true,
  "data": T,
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 100
  }
}

// ✅ Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

## HTTP Status Codes
| Code | When |
|------|------|
| 200 | GET success |
| 201 | POST success (created) |
| 204 | DELETE success |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden (permissions) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Server error |

## Files
- `src/app/api/**` - API routes
- `src/lib/api/` - API clients
- `docs/api-routes.md` - Documentation

## Validation
- **Input:** Zod schemas
- **Output:** Type inference from Zod
- **Auth:** JWT verification
- **Rate limit:** Per user/IP

## Documentation
```bash
npm run api:docs      # Generate OpenAPI spec
npm run api:validate  # Validate all routes
npm run api:client    # Generate TypeScript client
```

## Rules
- ALWAYS validate input with Zod
- NEVER expose internal error details to client
- ALWAYS use proper HTTP status codes
- NEVER change existing endpoint behavior (version instead)
