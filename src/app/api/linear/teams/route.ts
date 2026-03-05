import { NextRequest, NextResponse } from 'next/server';

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_API_URL = 'https://api.linear.app/graphql';

async function linearQuery(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': LINEAR_API_KEY || '',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }

  return data.data;
}

// GET /api/linear/teams - List teams
export async function GET(_req: NextRequest) {
  try {
    if (!LINEAR_API_KEY) {
      return NextResponse.json(
        { error: 'LINEAR_API_KEY ikke konfigurert' },
        { status: 500 }
      );
    }

    const query = `
      query Teams {
        teams {
          nodes {
            id
            name
            key
            description
            states {
              nodes {
                id
                name
                color
                type
              }
            }
            members {
              nodes {
                user {
                  id
                  name
                  email
                }
              }
            }
          }
        }
      }
    `;

    const data = await linearQuery(query);

    return NextResponse.json({
      success: true,
      teams: data.teams.nodes,
    });
  } catch (error) {
    console.error('Linear API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ukjent feil' },
      { status: 500 }
    );
  }
}
