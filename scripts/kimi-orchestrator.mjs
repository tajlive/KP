import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORCHESTRATOR_DIR = resolve(__dirname, '..', '.kimi', 'orchestrator');

export function escapeReplacement(str) {
  return String(str).replace(/\$/g, '$$$$');
}

export function classifyDomain(task, domains) {
  if (typeof task !== 'string') {
    throw new TypeError('task must be a string');
  }
  if (!Array.isArray(domains) || domains.length === 0) {
    throw new Error('domains must be a non-empty array');
  }

  const normalizedTask = task.toLowerCase();
  const words = new Set(normalizedTask.split(/[^a-zæøå0-9]+/i).filter((w) => w.length > 1));

  const generalDomain = domains.find((d) => d.id === 'general');
  let best = { domain: generalDomain || domains[0], confidence: 0 };

  for (const domain of domains) {
    const matches = domain.keywords.filter((kw) => words.has(kw.toLowerCase())).length;
    const confidence = matches / Math.max(domain.keywords.length, 1);
    if (confidence > best.confidence) {
      best = { domain, confidence };
    }
  }

  const confidenceThreshold = 0.15;
  const isFallback = best.confidence < confidenceThreshold;
  if (isFallback && generalDomain && best.domain.id !== 'general') {
    return { domain: generalDomain, confidence: best.confidence, fallback: true };
  }

  return { ...best, fallback: isFallback };
}

export function assembleBrief({ task, domain, agents, template }) {
  if (typeof task !== 'string') {
    throw new TypeError('task must be a string');
  }
  if (!domain || typeof domain !== 'object') {
    throw new TypeError('domain must be an object');
  }
  for (const key of ['id', 'name', 'skill', 'mcp_profile']) {
    if (typeof domain[key] !== 'string') {
      throw new TypeError(`domain.${key} must be a string`);
    }
  }
  if (!Array.isArray(domain.search_queries)) {
    throw new TypeError('domain.search_queries must be an array');
  }
  if (!Array.isArray(agents)) {
    throw new TypeError('agents must be an array');
  }
  if (typeof template !== 'string') {
    throw new TypeError('template must be a string');
  }

  const taskWords = task
    .toLowerCase()
    .split(/[^a-zæøå0-9]+/i)
    .filter((w) => w.length > 1);
  const taskKeywords = taskWords.slice(0, 5).join(' ');
  const kgEntity = domain.id;

  const searchQueries = domain.search_queries
    .map((q) => q.replace(/\{\{task\}\}/g, escapeReplacement(task)))
    .map((q) => `- "${q}"`)
    .join('\n');

  const agentList = agents
    .map(
      (agent, index) =>
        `${index + 1}. **${agent.name}** (${agent.id})\n   - ${agent.prompt_template.replace(
          /\{\{task\}\}/g,
          escapeReplacement(task)
        )}`
    )
    .join('\n');

  return template
    .replace(/\{\{task\}\}/g, escapeReplacement(task))
    .replace(/\{\{domain\.name\}\}/g, escapeReplacement(domain.name))
    .replace(/\{\{domain\.id\}\}/g, escapeReplacement(domain.id))
    .replace(/\{\{domain\.skill\}\}/g, escapeReplacement(domain.skill))
    .replace(/\{\{domain\.mcp_profile\}\}/g, escapeReplacement(domain.mcp_profile))
    .replace(/\{\{search_queries\}\}/g, escapeReplacement(searchQueries))
    .replace(/\{\{agents\}\}/g, escapeReplacement(agentList))
    .replace(/\{\{task_keywords\}\}/g, escapeReplacement(taskKeywords))
    .replace(/\{\{kg_entity\}\}/g, escapeReplacement(kgEntity));
}

function loadJson(filename) {
  const path = resolve(ORCHESTRATOR_DIR, filename);
  if (!existsSync(path)) {
    throw new Error(`Missing registry file: ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`Invalid JSON in ${path}: ${err.message}`);
  }
}

function loadTemplate(name = 'default') {
  const path = resolve(ORCHESTRATOR_DIR, 'templates', `${name}.md`);
  if (!existsSync(path)) {
    throw new Error(`Missing template: ${path}`);
  }
  return readFileSync(path, 'utf8');
}

function main() {
  try {
    const args = process.argv.slice(2);
    const verify = args.includes('--verify');

    if (verify) {
      loadJson('domains.json');
      loadJson('agent-registry.json');
      loadTemplate('default');
      console.log('OK: all registries and templates are valid');
      return;
    }

    const taskIndex = args.findIndex((arg) => !arg.startsWith('--'));
    const task = taskIndex >= 0 ? args[taskIndex] : '';

    if (!task) {
      console.error(
        'Usage: node scripts/kimi-orchestrator.mjs [--verify] "<task>" [--template=<name>] [--domain=<id>]' +
          '\n\nAvailable domains: auth, trading, database, frontend, api, deploy, testing, mempalace, general'
      );
      process.exit(1);
    }

    const templateName = args.find((arg) => arg.startsWith('--template='))?.split('=')[1] || 'default';
    const domainOverride = args.find((arg) => arg.startsWith('--domain='))?.split('=')[1];
    const { domains } = loadJson('domains.json');
    if (!Array.isArray(domains)) throw new Error('domains.json must contain a "domains" array');
    const { agents: agentDefinitions } = loadJson('agent-registry.json');
    if (!Array.isArray(agentDefinitions)) throw new Error('agent-registry.json must contain an "agents" array');

    let selectedDomain;
    if (domainOverride) {
      selectedDomain = domains.find((d) => d.id === domainOverride);
      if (!selectedDomain) {
        throw new Error(`Unknown domain: "${domainOverride}". Available: ${domains.map((d) => d.id).join(', ')}`);
      }
    }

    const classification = classifyDomain(task, domains);
    const { domain } = selectedDomain ? { domain: selectedDomain } : classification;

    if (classification.fallback && !domainOverride) {
      console.warn(
        `Warning: low confidence (${classification.confidence.toFixed(2)}). Falling back to "general". Use --domain=<id> to override.`
      );
    }
    const selectedAgents = domain.sub_agents
      .map((id) => {
        const agent = agentDefinitions.find((a) => a.id === id);
        if (!agent) {
          console.warn(`Warning: sub-agent "${id}" not found in agent registry`);
        }
        return agent;
      })
      .filter(Boolean);

    const template = loadTemplate(templateName);
    const brief = assembleBrief({ task, domain, agents: selectedAgents, template });

    console.log(brief);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
