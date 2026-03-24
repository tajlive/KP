#!/usr/bin/env node

/**
 * Creates a Linear issue for production incidents.
 *
 * Required env:
 * - LINEAR_API_KEY
 * - LINEAR_TEAM_ID
 *
 * Optional env:
 * - LINEAR_ISSUE_TITLE
 * - LINEAR_ISSUE_DESCRIPTION
 */

const apiKey = process.env.LINEAR_API_KEY;
const teamId = process.env.LINEAR_TEAM_ID;

if (!apiKey || !teamId) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        skipped: true,
        reason: "LINEAR_API_KEY or LINEAR_TEAM_ID missing",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const title =
  process.env.LINEAR_ISSUE_TITLE ||
  "Prod health degraded: signal/copy monitoring failure";
const description =
  process.env.LINEAR_ISSUE_DESCRIPTION ||
  "Automated monitor detected a production health failure. Check GitHub Actions logs and /api/health details.";

const query = `
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        url
      }
    }
  }
`;

const variables = {
  input: {
    teamId,
    title,
    description,
    priority: 2,
  },
};

const response = await fetch("https://api.linear.app/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: apiKey,
  },
  body: JSON.stringify({ query, variables }),
});

const body = await response.json();
if (!response.ok || body?.errors?.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        status: response.status,
        errors: body?.errors ?? null,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      issue: body?.data?.issueCreate?.issue ?? null,
    },
    null,
    2,
  ),
);

