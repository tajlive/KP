import { describe, it, expect, beforeAll } from 'vitest';

let mod: typeof import('./validate-migrations.mjs');

describe('Migrasjonsvalidator — v2.1', () => {
  beforeAll(async () => {
    mod = await import('./validate-migrations.mjs');
  });

  // ─── extractVersion ───
  describe('extractVersion', () => {
    it('henter 14-sifret versjon fra standard filnavn', () => {
      expect(mod.extractVersion('20260430193000_optimizing_indexes.sql')).toBe('20260430193000');
    });

    it('henter kort versjon fra legacy-fil', () => {
      expect(mod.extractVersion('001_core_schema.sql')).toBe('001');
    });

    it('returnerer null for ugyldige filnavn', () => {
      expect(mod.extractVersion('migrasjon.sql')).toBeNull();
      expect(mod.extractVersion('README.md')).toBeNull();
      expect(mod.extractVersion('.sql')).toBeNull();
    });

    it('henter kort numerisk prefix selv om det ikke er 14 siffer', () => {
      // extractVersion validerer IKKE lengde — det gjør isValidTimestamp
      expect(mod.extractVersion('2026_optimizing_indexes.sql')).toBe('2026');
    });
  });

  // ─── isValidTimestamp ───
  describe('isValidTimestamp', () => {
    it('aksepterer gyldige 14-sifrede timestamps', () => {
      expect(mod.isValidTimestamp('20260430193000')).toBe(true);
      expect(mod.isValidTimestamp('20240101000000')).toBe(true);
      expect(mod.isValidTimestamp('20241231235959')).toBe(true);
    });

    it('avviser ugyldige datoer', () => {
      expect(mod.isValidTimestamp('20261301120000')).toBe(false); // ugyldig måned
      expect(mod.isValidTimestamp('20260432120000')).toBe(false); // ugyldig dag
      expect(mod.isValidTimestamp('20260430250000')).toBe(false); // ugyldig time
      expect(mod.isValidTimestamp('20260430236000')).toBe(false); // ugyldig minutt
    });

    it('avviser for korte eller lange timestamps', () => {
      expect(mod.isValidTimestamp('20260430')).toBe(false);     // 8 siffer
      expect(mod.isValidTimestamp('2026043019300')).toBe(false); // 13 siffer
      expect(mod.isValidTimestamp('202604301930000')).toBe(false); // 15 siffer
    });

    it('avviser år utenfor gyldig range', () => {
      expect(mod.isValidTimestamp('20231231000000')).toBe(false); // før 2024
      expect(mod.isValidTimestamp('21010101000000')).toBe(false); // etter 2100
    });
  });

  // ─── extractFunctionSignatures ───
  describe('extractFunctionSignatures', () => {
    it('henter signatur med OR REPLACE', () => {
      const sql = 'CREATE OR REPLACE FUNCTION public.my_func(user_id uuid) RETURNS void AS $$ BEGIN END; $$ LANGUAGE plpgsql;';
      const sigs = mod.extractFunctionSignatures(sql);
      expect(sigs).toHaveLength(1);
      expect(sigs[0].funcName).toBe('my_func');
      expect(sigs[0].argTypes).toEqual(['uuid']);
      expect(sigs[0].signatureKey).toBe('my_func(uuid)');
    });

    it('henter signatur uten OR REPLACE', () => {
      const sql = 'CREATE FUNCTION another_func(a integer, b text) RETURNS text AS $$ BEGIN RETURN b; END; $$ LANGUAGE plpgsql;';
      const sigs = mod.extractFunctionSignatures(sql);
      expect(sigs).toHaveLength(1);
      expect(sigs[0].funcName).toBe('another_func');
      expect(sigs[0].argTypes).toEqual(['integer', 'text']);
    });

    it('håndterer flere funksjoner i samme fil', () => {
      const sql = `
        CREATE OR REPLACE FUNCTION fn_a(x int) RETURNS int AS $$ BEGIN RETURN x; END; $$ LANGUAGE plpgsql;
        CREATE FUNCTION fn_b() RETURNS void AS $$ BEGIN END; $$ LANGUAGE plpgsql;
      `;
      const sigs = mod.extractFunctionSignatures(sql);
      expect(sigs).toHaveLength(2);
      expect(sigs[0].funcName).toBe('fn_a');
      expect(sigs[1].funcName).toBe('fn_b');
    });

    it('håndterer funksjon uten argumenter', () => {
      const sql = 'CREATE OR REPLACE FUNCTION no_args() RETURNS void AS $$ BEGIN END; $$ LANGUAGE plpgsql;';
      const sigs = mod.extractFunctionSignatures(sql);
      expect(sigs[0].argTypes).toEqual([]);
      expect(sigs[0].signatureKey).toBe('no_args()');
    });
  });

  // ─── checkDestructiveDDL ───
  describe('checkDestructiveDDL', () => {
    it('fanger DROP TABLE uten IF EXISTS', () => {
      const issues = mod.checkDestructiveDDL('DROP TABLE users;', 'file.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('DROP TABLE uten IF EXISTS');
      expect(issues[0].message).toContain('users');
      expect(issues[0].fix).toContain('DROP TABLE IF EXISTS users');
    });

    it('tillater DROP TABLE IF EXISTS', () => {
      const issues = mod.checkDestructiveDDL('DROP TABLE IF EXISTS users;', 'file.sql');
      expect(issues).toHaveLength(0);
    });

    it('fanger DROP FUNCTION uten IF EXISTS', () => {
      const issues = mod.checkDestructiveDDL('DROP FUNCTION public.my_func(uuid);', 'file.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('DROP FUNCTION uten IF EXISTS');
    });

    it('tillater DROP FUNCTION IF EXISTS', () => {
      const issues = mod.checkDestructiveDDL('DROP FUNCTION IF EXISTS my_func(uuid);', 'file.sql');
      expect(issues).toHaveLength(0);
    });

    it('fanger ALTER TABLE DROP COLUMN', () => {
      const issues = mod.checkDestructiveDDL('ALTER TABLE users DROP COLUMN old_field;', 'file.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('ALTER TABLE DROP COLUMN uten guard');
      expect(issues[0].message).toContain('users.old_field');
    });

    it('fanger DROP INDEX uten IF EXISTS', () => {
      const issues = mod.checkDestructiveDDL('DROP INDEX idx_users_email;', 'file.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('DROP INDEX uten IF EXISTS');
    });

    it('tillater DROP INDEX IF EXISTS', () => {
      const issues = mod.checkDestructiveDDL('DROP INDEX IF EXISTS idx_users_email;', 'file.sql');
      expect(issues).toHaveLength(0);
    });

    it('håndterer flere destruktive operasjoner', () => {
      const sql = `
        DROP TABLE users;
        DROP FUNCTION IF EXISTS old_func();
        DROP INDEX idx_temp;
      `;
      const issues = mod.checkDestructiveDDL(sql, 'file.sql');
      expect(issues).toHaveLength(2);
      expect(issues[0].message).toContain('DROP TABLE');
      expect(issues[1].message).toContain('DROP INDEX');
    });

    it('ignorerer kommentert kode', () => {
      const sql = `-- DROP TABLE users;\nDROP TABLE IF EXISTS users;`;
      const issues = mod.checkDestructiveDDL(sql, 'file.sql');
      expect(issues).toHaveLength(0);
    });
  });

  // ─── checkIdempotency ───
  describe('checkIdempotency', () => {
    it('fanger CREATE TABLE uten IF NOT EXISTS', () => {
      const issues = mod.checkIdempotency('CREATE TABLE users (id uuid PRIMARY KEY);', 'file.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('CREATE TABLE uten IF NOT EXISTS');
      expect(issues[0].fix).toContain('CREATE TABLE IF NOT EXISTS');
    });

    it('tillater CREATE TABLE IF NOT EXISTS', () => {
      const issues = mod.checkIdempotency('CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY);', 'file.sql');
      expect(issues).toHaveLength(0);
    });

    it('fanger CREATE FUNCTION uten OR REPLACE', () => {
      const issues = mod.checkIdempotency('CREATE FUNCTION my_func() RETURNS void AS $$ BEGIN END; $$ LANGUAGE plpgsql;', 'file.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('CREATE FUNCTION uten OR REPLACE');
    });

    it('tillater CREATE OR REPLACE FUNCTION', () => {
      const issues = mod.checkIdempotency('CREATE OR REPLACE FUNCTION my_func() RETURNS void AS $$ BEGIN END; $$ LANGUAGE plpgsql;', 'file.sql');
      expect(issues).toHaveLength(0);
    });

    it('fanger CREATE INDEX uten IF NOT EXISTS', () => {
      const issues = mod.checkIdempotency('CREATE INDEX idx_email ON users(email);', 'file.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('CREATE INDEX uten IF NOT EXISTS');
    });

    it('fanger CREATE UNIQUE INDEX uten IF NOT EXISTS', () => {
      const issues = mod.checkIdempotency('CREATE UNIQUE INDEX idx_email ON users(email);', 'file.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('CREATE INDEX uten IF NOT EXISTS');
    });

    it('tillater CREATE INDEX IF NOT EXISTS', () => {
      const issues = mod.checkIdempotency('CREATE INDEX IF NOT EXISTS idx_email ON users(email);', 'file.sql');
      expect(issues).toHaveLength(0);
    });

    it('fanger TRUNCATE TABLE', () => {
      const issues = mod.checkIdempotency('TRUNCATE TABLE temp_data;', 'file.sql');
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('TRUNCATE TABLE');
    });

    it('rapporterer riktig linjenummer', () => {
      const sql = `\n\nCREATE TABLE users (id uuid PRIMARY KEY);\nCREATE INDEX idx_email ON users(email);`;
      const issues = mod.checkIdempotency(sql, 'file.sql');
      expect(issues[0].line).toBe(3);
      expect(issues[1].line).toBe(4);
    });

    it('ignorerer tomme linjer og kommentarer', () => {
      const sql = `\n  \n  -- dette er en kommentar\n  CREATE TABLE users (id uuid PRIMARY KEY);`;
      const issues = mod.checkIdempotency(sql, 'file.sql');
      expect(issues[0].line).toBe(4);
    });
  });

  // ─── Integrasjon: flere checks sammen ───
  describe('Integrasjon', () => {
    it('fanger både destruktiv DDL og idempotens i samme fil', () => {
      const sql = `
        DROP TABLE legacy_data;
        CREATE TABLE new_table (id uuid PRIMARY KEY);
        CREATE FUNCTION trigger_fn() RETURNS trigger AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
      `;
      const destructive = mod.checkDestructiveDDL(sql, 'file.sql');
      const idempotency = mod.checkIdempotency(sql, 'file.sql');

      expect(destructive).toHaveLength(1);
      expect(destructive[0].message).toContain('DROP TABLE');

      expect(idempotency).toHaveLength(2);
      expect(idempotency[0].message).toContain('CREATE TABLE uten IF NOT EXISTS');
      expect(idempotency[1].message).toContain('CREATE FUNCTION uten OR REPLACE');
    });

    it('tillater "sikker" migrasjon med IF EXISTS / IF NOT EXISTS', () => {
      const sql = `
        DROP TABLE IF EXISTS legacy_data;
        CREATE TABLE IF NOT EXISTS new_table (id uuid PRIMARY KEY);
        CREATE OR REPLACE FUNCTION safe_fn() RETURNS void AS $$ BEGIN END; $$ LANGUAGE plpgsql;
        CREATE INDEX IF NOT EXISTS idx_new ON new_table(id);
      `;
      const destructive = mod.checkDestructiveDDL(sql, 'file.sql');
      const idempotency = mod.checkIdempotency(sql, 'file.sql');

      expect(destructive).toHaveLength(0);
      expect(idempotency).toHaveLength(0);
    });
  });
});
