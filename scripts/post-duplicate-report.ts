#!/usr/bin/env tsx
/**
 * Post duplicate content report as PR comment
 * 
 * Reads output/duplicate-report.md and posts a summary as a PR comment.
 * Used by GitHub Actions when duplicate content test fails.
 */

import * as fs from 'fs';
import * as path from 'path';

interface DuplicateReport {
  route: string;
  duplicates: Array<{
    text: string;
    occurrences: number;
    preview: string;
  }>;
}

function parseReport(reportPath: string): { summary: string; routes: DuplicateReport[] } | null {
  if (!fs.existsSync(reportPath)) {
    return null;
  }

  const content = fs.readFileSync(reportPath, 'utf-8');
  const routes: DuplicateReport[] = [];
  
  // Extract summary line
  const summaryMatch = content.match(/Routes with duplicates:\s*(\d+)/);
  const totalRoutes = summaryMatch ? summaryMatch[1] : '?';
  
  // Parse each route section
  const routeSections = content.split('### ').slice(1);
  
  for (const section of routeSections) {
    const lines = section.split('\n');
    const route = lines[0].trim();
    const duplicates: DuplicateReport['duplicates'] = [];
    
    let currentDup: Partial<DuplicateReport['duplicates'][0]> = {};
    
    for (const line of lines.slice(1)) {
      const occMatch = line.match(/\*\*Occurrences:\*\*\s*(\d+)/);
      if (occMatch) {
        if (currentDup.occurrences) {
          duplicates.push(currentDup as DuplicateReport['duplicates'][0]);
        }
        currentDup = { occurrences: parseInt(occMatch[1], 10) };
      }
      
      const previewMatch = line.match(/\*\*Preview:\*\*\s*"(.+?)"/);
      if (previewMatch) {
        currentDup.preview = previewMatch[1];
      }
    }
    
    if (currentDup.occurrences) {
      duplicates.push(currentDup as DuplicateReport['duplicates'][0]);
    }
    
    routes.push({ route, duplicates });
  }
  
  return {
    summary: `${totalRoutes} route(s) with duplicate content`,
    routes
  };
}

async function postPRComment(comment: string): Promise<void> {
  // In GitHub Actions, use GITHUB_TOKEN and GitHub API
  const token = process.env.GITHUB_TOKEN;
  const prNumber = process.env.PR_NUMBER;
  const repo = process.env.GITHUB_REPOSITORY;
  
  if (!token || !prNumber || !repo) {
    console.log('Not running in GitHub Actions context, printing comment instead:');
    console.log('\n' + '='.repeat(60));
    console.log(comment);
    console.log('='.repeat(60) + '\n');
    return;
  }
  
  const [owner, repoName] = repo.split('/');
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/issues/${prNumber}/comments`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: comment }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }
    
    console.log('✅ PR comment posted successfully');
  } catch (error) {
    console.error('Failed to post PR comment:', error);
    console.log('\nComment that would have been posted:\n');
    console.log(comment);
  }
}

function buildComment(data: { summary: string; routes: DuplicateReport[] }): string {
  let comment = `<!-- duplicate-content-report -->\n`;
  comment += `## ⚠️ Duplikat innhold oppdaget\n\n`;
  comment += `**${data.summary}**\n\n`;
  comment += `Se [full rapport](https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}) for detaljer.\n\n`;
  
  for (const route of data.routes.slice(0, 3)) { // Max 3 routes
    comment += `### ${route.route}\n\n`;
    
    for (const dup of route.duplicates.slice(0, 3)) { // Max 3 duplicates per route
      comment += `- \`${dup.preview.slice(0, 80)}${dup.preview.length > 80 ? '...' : ''}\`\n`;
      comment += `  (forekommer ${dup.occurrences} steder)\n`;
    }
    
    if (route.duplicates.length > 3) {
      comment += `- *...og ${route.duplicates.length - 3} til*\n`;
    }
    
    comment += '\n';
  }
  
  if (data.routes.length > 3) {
    comment += `*...og ${data.routes.length - 3} route(s) til*\n\n`;
  }
  
  comment += `---\n\n`;
  comment += `**Hvordan fikse:**\n`;
  comment += `1. Flytt duplisert tekst til en delt komponent i \`src/features/marketing/components/\`\n`;
  comment += `2. Bruk komponenten i stedet for inline-tekst\n`;
  comment += `3. Kjør \`npm run test:duplicate\` lokalt for å verifisere\n\n`;
  comment += `Se [CONTRIBUTING.md](https://github.com/${process.env.GITHUB_REPOSITORY}/blob/main/docs/10-CONTRIBUTING.md#shared-marketing-components) for detaljer.`;
  
  return comment;
}

async function main(): Promise<void> {
  const reportPath = path.join(process.cwd(), 'output', 'duplicate-report.md');
  
  console.log('Reading duplicate report from:', reportPath);
  
  const data = parseReport(reportPath);
  
  if (!data || data.routes.length === 0) {
    console.log('No duplicate report found or no duplicates detected.');
    return;
  }
  
  console.log(`Found ${data.routes.length} route(s) with duplicates`);
  
  const comment = buildComment(data);
  await postPRComment(comment);
}

main().catch(console.error);
