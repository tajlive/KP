#!/usr/bin/env node

/**
 * GitHub Labels Setup Script (Node.js alternative)
 * Usage: GITHUB_TOKEN=your_token node scripts/setup-github-labels.js
 */

const { Octokit } = require('@octokit/rest');

const OWNER = 'klarpakke';
const REPO = 'klarpakke';

const LABELS = [
  // Type
  { name: 'bug', description: 'Noe fungerer ikke', color: 'd73a4a' },
  { name: 'enhancement', description: 'Ny feature', color: 'a2eeef' },
  { name: 'documentation', description: 'Dokumentasjon', color: '0075ca' },
  { name: 'refactor', description: 'Kodeoptimalisering', color: 'fbca04' },

  // Priority
  { name: 'priority:critical', description: 'Må fikses umiddelbart', color: 'b60205' },
  { name: 'priority:high', description: 'Viktig', color: 'ff9f1c' },
  { name: 'priority:medium', description: 'Middels prioritet', color: 'fbca04' },
  { name: 'priority:low', description: 'Lav prioritet', color: 'd4c5f9' },

  // Status
  { name: 'in-progress', description: 'Jobbes med nå', color: '0e8a16' },
  { name: 'needs-review', description: 'Trenger code review', color: '5319e7' },
  { name: 'needs-triage', description: 'Trenger triage', color: 'fef2c0' },
  { name: 'blocked', description: 'Blokkert av annet', color: 'd93f0b' },

  // Component
  { name: 'component:ui', description: 'UI-relatert', color: 'c5def5' },
  { name: 'component:api', description: 'API-relatert', color: '1d76db' },
  { name: 'component:database', description: 'Database', color: '0e8a16' },
  { name: 'component:ai', description: 'AI/ML', color: '5319e7' },

  // Effort
  { name: 'effort:small', description: '< 1 dag', color: '0e8a16' },
  { name: 'effort:medium', description: '1-3 dager', color: 'fbca04' },
  { name: 'effort:large', description: '> 3 dager', color: 'd93f0b' },

  // Automation
  { name: 'dependencies', description: 'Dependency updates', color: '0366d6' },
  { name: 'automated', description: 'Automated PR', color: 'ededed' },
];

async function setupLabels() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    console.error('   Usage: GITHUB_TOKEN=your_token node scripts/setup-github-labels.js');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  console.log('🏷️  Setting up GitHub labels...\n');

  for (const label of LABELS) {
    try {
      await octokit.issues.createLabel({
        owner: OWNER,
        repo: REPO,
        name: label.name,
        description: label.description,
        color: label.color,
      });
      console.log(`✅ Created: ${label.name}`);
    } catch (error) {
      if (error.status === 422) {
        // Label exists, update it
        try {
          await octokit.issues.updateLabel({
            owner: OWNER,
            repo: REPO,
            name: label.name,
            description: label.description,
            color: label.color,
          });
          console.log(`🔄 Updated: ${label.name}`);
        } catch (updateError) {
          console.error(`❌ Failed to update: ${label.name}`, updateError.message);
        }
      } else {
        console.error(`❌ Failed to create: ${label.name}`, error.message);
      }
    }
  }

  console.log('\n✅ All labels configured!');
}

setupLabels().catch(console.error);
