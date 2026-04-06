#!/usr/bin/env node
/**
 * Update Linear Issues to Done status with comments
 * Usage: node scripts/update-linear-issues.mjs
 */

const LINEAR_API_KEY = process.env.LINEAR_API_KEY || 'lin_api_frbEcEyNxC8m5XhNaEn2bmn82AZtSEcG1vyTPb8W';
const LINEAR_API_URL = 'https://api.linear.app/graphql';

// Constants
const DONE_STATE_ID = '92e62835-ad13-4451-af66-b4a6d33c3e8a';

async function linearQuery(query, variables) {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }

  return data.data;
}

// Find issue by identifier (e.g., KLA-154) - fetch all KLA issues and filter
async function findIssueByIdentifier(identifier) {
  const query = `
    query Issues($filter: IssueFilter) {
      issues(filter: $filter, first: 200) {
        nodes {
          id
          identifier
          title
          state {
            id
            name
          }
          team {
            id
            name
            key
          }
        }
      }
    }
  `;
  
  const data = await linearQuery(query, { 
    filter: { team: { key: { eq: "KLA" } } }
  });
  
  return data.issues.nodes.find(i => i.identifier === identifier);
}

// Update issue state
async function updateIssueState(issueId, stateId) {
  const mutation = `
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id
          identifier
          title
          state {
            name
          }
        }
      }
    }
  `;
  
  const data = await linearQuery(mutation, { 
    id: issueId, 
    input: { stateId: stateId }
  });
  return data.issueUpdate;
}

// Add comment to issue
async function addComment(issueId, body) {
  const mutation = `
    mutation CreateComment($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
        comment {
          id
          body
        }
      }
    }
  `;
  
  const data = await linearQuery(mutation, {
    input: {
      issueId,
      body,
    }
  });
  return data.commentCreate;
}

// Main function to update an issue to Done with a comment
async function markIssueAsDone(identifier, comment) {
  console.log(`\n📝 Processing ${identifier}...`);
  
  try {
    // Find the issue
    const issue = await findIssueByIdentifier(identifier);
    if (!issue) {
      console.error(`  ❌ Issue ${identifier} not found`);
      return false;
    }
    console.log(`  Found: ${issue.title}`);
    
    // Update issue state
    const updateResult = await updateIssueState(issue.id, DONE_STATE_ID);
    if (updateResult.success) {
      console.log(`  ✅ State updated to: ${updateResult.issue.state.name}`);
    } else {
      console.error(`  ❌ Failed to update state`);
      return false;
    }
    
    // Add comment
    const commentResult = await addComment(issue.id, comment);
    if (commentResult.success) {
      console.log(`  ✅ Comment added`);
    } else {
      console.error(`  ❌ Failed to add comment`);
      return false;
    }
    
    console.log(`  ✅ ${identifier} completed successfully!`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

// Issues to update
const issuesToUpdate = [
  {
    identifier: 'KLA-154',
    comment: `✅ FERDIG — Database tabeller opprettet og verifisert

Tabeller eksisterer i produksjon:
- paper_trading_sessions: 3 rader
- risk_profiles: 9 rader  
- auto_trading_configs: 0 rader (eksisterer)

Opprettet via SQL i Supabase:
- page_visits tabell med RLS policies
- get_unique_visitors() RPC function
- get_top_pages() RPC function

Supabase typer regenerert og committed.`
  },
  {
    identifier: 'KLA-155',
    comment: `✅ FERDIG — Dashboard crash fikset

Null-safety lagt til for icon property access:
- GetStartedCard.tsx: item?.icon med optional chaining
- DashboardTabs.tsx: tab?.icon med null checks

Bygget passerer: npm run build SUCCESS
Commit: 6aae4e478`
  },
  {
    identifier: 'KLA-156',
    comment: `✅ FERDIG — Lesson page route eksisterer

Route fantes allerede: /leksjon/[lessonId]/page.tsx
Verifisert at den håndterer lessonId parameter og viser innhold.

Ingen endringer nødvendig — route var allerede på plass.`
  }
];

// Run updates
async function main() {
  console.log('🚀 Updating Linear issues to Done...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const issue of issuesToUpdate) {
    const success = await markIssueAsDone(issue.identifier, issue.comment);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
