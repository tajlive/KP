# ADR-004: TypeScript Strict Mode

**Status:** Accepted  
**Dato:** 2026-01-10  
**Beslutningstaker:** Taj + KIMI Code

## Kontekst

Vi måtte velge TypeScript-konfigurasjon for prosjektet.

## Vurdering

**Alternativer:**
1. Strict mode (all flags)
2. Strict mode (utvalgte flags)
3. Loose mode (bare basic types)
4. JavaScript (uten types)

**Kriterier:**
- Type safety
- Developer experience
- Build-time catching of bugs
- AI code generation quality

## Beslutning

Vi valgte **TypeScript Strict Mode** (alle flags).

### Konfigurasjon

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Fordeler

- ✅ **Færre runtime bugs:** Types fanges ved compile
- ✅ **Bedre IDE support:** Autocomplete, refactoring
- ✅ **Selvdokumenterende:** Types beskriver API
- ✅ **AI-friendly:** Bedre kontekst for KIMI/Copilot

### Ulemper

- Mer tid på å skrive types
- Steeper learning curve
- Noen third-party libs har dårlige types

## Konsekvenser

**Positive:**
- Færre bugs i produksjon
- Enklere refactoring
- Bedre code reviews
- Dokumentasjon i koden

**Negative:**
- Litt mer boilerplate
- Må håndtere edge cases eksplisitt

## Regler Vi Følger

1. **Ingen `any`:**
   ```typescript
   // ❌ Bad
   function process(data: any) { ... }
   
   // ✅ Good
   function process(data: unknown) { ... }
   ```

2. **Ingen `// @ts-ignore`:**
   ```typescript
   // ❌ Bad
   // @ts-ignore
   const result = riskyFunction();
   
   // ✅ Good
   const result = riskyFunction() as ReturnType;
   ```

3. **Explicit return types på exports:**
   ```typescript
   export function calculateProfit(entry: number, exit: number): number {
     return exit - entry;
   }
   ```

## Revidering

Denne beslutningen skal revurderes hvis:
- Teamet vokser og strict mode blir flaskehals
- TypeScript performance blir problematisk
- (Usannsynlig - strict mode er industry standard)

## Referanser

- https://www.typescriptlang.org/tsconfig#strict
