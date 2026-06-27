import { describe, it, expect } from 'vitest';
import { classifyDomain, assembleBrief } from '../kimi-orchestrator.mjs';

const domains = [
  {
    id: 'auth',
    keywords: ['auth', 'login', 'oauth', 'session', 'jwt', 'permission', 'refresh', 'token']
  },
  {
    id: 'trading',
    keywords: ['trading', 'strategy', 'bot', 'order', 'position', 'pnl']
  },
  {
    id: 'general',
    keywords: ['refactor', 'fix', 'bug', 'optimize']
  }
];

describe('classifyDomain', () => {
  it('selects auth for login timeout task', () => {
    const result = classifyDomain('fiks auth login timeout', domains);
    expect(result.domain.id).toBe('auth');
    expect(result.confidence).toBeGreaterThan(0.2);
  });

  it('selects trading for strategy task', () => {
    const result = classifyDomain('implementer mean reversion trading strategy bot', domains);
    expect(result.domain.id).toBe('trading');
    expect(result.confidence).toBeGreaterThan(0.2);
  });

  it('falls back to general when no strong match', () => {
    const result = classifyDomain('oppdater dokumentasjon', domains);
    expect(result.domain.id).toBe('general');
  });

  it('throws on empty domains', () => {
    expect(() => classifyDomain('task', [])).toThrow('domains must be a non-empty array');
  });
});

const template = `# Task
{{task}}
# Search
{{search_queries}}
# Agents
{{agents}}`;

const domain = {
  id: 'auth',
  name: 'Auth & Security',
  skill: '.kimi/skills/klarpakke-auth',
  mcp_profile: 'medium',
  search_queries: ['{{task}} Supabase SSR auth'],
  sub_agents: ['explore', 'security']
};

const agents = [
  { id: 'explore', name: 'Codebase Explorer', prompt_template: 'Explore: {{task}}' },
  { id: 'security', name: 'Security Reviewer', prompt_template: 'Review: {{task}}' }
];

const multiDomain = {
  id: 'trading',
  name: 'Trading Engine',
  skill: '.kimi/skills/klarpakke-trading',
  mcp_profile: 'full',
  search_queries: ['{{task}} mean reversion', '{{task}} risk management']
};

describe('assembleBrief', () => {
  it('replaces all placeholders', () => {
    const brief = assembleBrief({
      task: 'fiks auth login timeout',
      domain,
      agents,
      template
    });
    expect(brief).toContain('fiks auth login timeout');
    expect(brief).toContain('Supabase SSR auth');
    expect(brief).toContain('Codebase Explorer');
    expect(brief).toContain('Security Reviewer');
  });

  it('handles dollar signs in task text', () => {
    const brief = assembleBrief({ task: 'fix $& auth', domain, agents, template });
    expect(brief).toContain('fix $& auth');
  });

  it('renders multiple search queries and agents correctly', () => {
    const brief = assembleBrief({
      task: 'implement strategy',
      domain: multiDomain,
      agents,
      template
    });
    expect(brief).toContain('- "implement strategy mean reversion"');
    expect(brief).toContain('- "implement strategy risk management"');
    expect(brief).toContain('Codebase Explorer');
    expect(brief).toContain('Security Reviewer');
  });
});
