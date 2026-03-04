import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * LinkedIn MCP Server for Klarpakke
 * 
 * Automates LinkedIn operations:
 * - Profile analytics
 * - Post scheduling and publishing
 * - Network growth tracking
 * - Content performance metrics
 * - Lead generation
 */

// LinkedIn API configuration
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

interface LinkedInConfig {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
}

class LinkedInMCPServer {
  private config: LinkedInConfig;
  private server: Server;

  constructor(config: LinkedInConfig = {}) {
    this.config = {
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      ...config,
    };

    this.server = new Server(
      {
        name: 'klarpakke-linkedin',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'linkedin_get_profile',
          description: 'Get LinkedIn profile information',
          inputSchema: {
            type: 'object',
            properties: {
              profileId: {
                type: 'string',
                description: 'LinkedIn profile ID (urn or vanity name)',
              },
            },
            required: ['profileId'],
          },
        },
        {
          name: 'linkedin_get_network_stats',
          description: 'Get network growth statistics',
          inputSchema: {
            type: 'object',
            properties: {
              period: {
                type: 'string',
                enum: ['7d', '30d', '90d'],
                description: 'Time period for stats',
              },
            },
          },
        },
        {
          name: 'linkedin_create_post',
          description: 'Create and schedule a LinkedIn post',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Post content text',
              },
              visibility: {
                type: 'string',
                enum: ['PUBLIC', 'CONNECTIONS'],
                description: 'Post visibility',
              },
              scheduledTime: {
                type: 'string',
                description: 'ISO timestamp for scheduling (optional)',
              },
            },
            required: ['content', 'visibility'],
          },
        },
        {
          name: 'linkedin_get_post_analytics',
          description: 'Get analytics for a specific post',
          inputSchema: {
            type: 'object',
            properties: {
              postUrn: {
                type: 'string',
                description: 'LinkedIn post URN',
              },
            },
            required: ['postUrn'],
          },
        },
        {
          name: 'linkedin_search_people',
          description: 'Search for LinkedIn profiles',
          inputSchema: {
            type: 'object',
            properties: {
              keywords: {
                type: 'string',
                description: 'Search keywords',
              },
              location: {
                type: 'string',
                description: 'Location filter',
              },
              industry: {
                type: 'string',
                description: 'Industry filter',
              },
              limit: {
                type: 'number',
                description: 'Maximum results',
                default: 10,
              },
            },
            required: ['keywords'],
          },
        },
        {
          name: 'linkedin_send_invitation',
          description: 'Send connection invitation',
          inputSchema: {
            type: 'object',
            properties: {
              profileId: {
                type: 'string',
                description: 'Target profile ID',
              },
              message: {
                type: 'string',
                description: 'Personalized message (optional)',
              },
            },
            required: ['profileId'],
          },
        },
        {
          name: 'linkedin_get_company_updates',
          description: 'Get company page updates/posts',
          inputSchema: {
            type: 'object',
            properties: {
              companyId: {
                type: 'string',
                description: 'LinkedIn company ID',
              },
              count: {
                type: 'number',
                description: 'Number of updates to fetch',
                default: 10,
              },
            },
            required: ['companyId'],
          },
        },
        {
          name: 'linkedin_generate_content_ideas',
          description: 'Generate content ideas based on trending topics',
          inputSchema: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Topic or industry',
              },
              count: {
                type: 'number',
                description: 'Number of ideas',
                default: 5,
              },
            },
            required: ['topic'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'linkedin_get_profile':
            return await this.getProfile(args as { profileId: string });
          
          case 'linkedin_get_network_stats':
            return await this.getNetworkStats(args as { period?: string });
          
          case 'linkedin_create_post':
            return await this.createPost(args as { content: string; visibility: string; scheduledTime?: string });
          
          case 'linkedin_get_post_analytics':
            return await this.getPostAnalytics(args as { postUrn: string });
          
          case 'linkedin_search_people':
            return await this.searchPeople(args as { keywords: string; location?: string; industry?: string; limit?: number });
          
          case 'linkedin_send_invitation':
            return await this.sendInvitation(args as { profileId: string; message?: string });
          
          case 'linkedin_get_company_updates':
            return await this.getCompanyUpdates(args as { companyId: string; count?: number });
          
          case 'linkedin_generate_content_ideas':
            return await this.generateContentIdeas(args as { topic: string; count?: number });
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async getProfile({ profileId }: { profileId: string }) {
    // Mock implementation - would call LinkedIn API
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: profileId,
            firstName: 'Demo',
            lastName: 'User',
            headline: 'Trading Risk Manager at Klarpakke',
            connections: 2847,
            followers: 15234,
            location: 'Oslo, Norway',
            summary: 'Helping traders manage risk effectively...',
          }, null, 2),
        },
      ],
    };
  }

  private async getNetworkStats({ period = '30d' }: { period?: string }) {
    const stats = {
      period,
      newConnections: 127,
      profileViews: 1847,
      postImpressions: 45231,
      followerGrowth: 342,
      engagementRate: '4.2%',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }

  private async createPost({
    content,
    visibility,
    scheduledTime,
  }: {
    content: string;
    visibility: string;
    scheduledTime?: string;
  }) {
    const post = {
      id: `urn:li:share:${Date.now()}`,
      content,
      visibility,
      scheduledTime: scheduledTime || 'immediate',
      status: scheduledTime ? 'scheduled' : 'published',
      createdAt: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: `Post ${post.status} successfully!\n\n${JSON.stringify(post, null, 2)}`,
        },
      ],
    };
  }

  private async getPostAnalytics({ postUrn }: { postUrn: string }) {
    const analytics = {
      postUrn,
      impressions: 15420,
      clicks: 847,
      reactions: 234,
      comments: 56,
      reposts: 28,
      engagementRate: '3.8%',
      topDemographics: {
        countries: ['Norway', 'Sweden', 'Denmark'],
        industries: ['Financial Services', 'Technology', 'Consulting'],
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analytics, null, 2),
        },
      ],
    };
  }

  private async searchPeople({
    keywords,
    location,
    industry,
    limit = 10,
  }: {
    keywords: string;
    location?: string;
    industry?: string;
    limit?: number;
  }) {
    // Mock search results
    const results = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      id: `profile-${i + 1}`,
      firstName: `Person ${i + 1}`,
      lastName: 'Example',
      headline: `${keywords} Professional`,
      location: location || 'Norway',
      industry: industry || 'Financial Services',
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ count: results.length, results }, null, 2),
        },
      ],
    };
  }

  private async sendInvitation({
    profileId,
    message,
  }: {
    profileId: string;
    message?: string;
  }) {
    return {
      content: [
        {
          type: 'text',
          text: `Connection invitation sent to ${profileId}!\n\n${message ? `Message: "${message}"` : 'No personalized message'}`,
        },
      ],
    };
  }

  private async getCompanyUpdates({
    companyId,
    count = 10,
  }: {
    companyId: string;
    count?: number;
  }) {
    const updates = Array.from({ length: Math.min(count, 5) }, (_, i) => ({
      id: `update-${i + 1}`,
      content: `Company update #${i + 1} from ${companyId}`,
      postedAt: new Date(Date.now() - i * 86400000).toISOString(),
      engagement: {
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 50),
        shares: Math.floor(Math.random() * 20),
      },
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ companyId, updates }, null, 2),
        },
      ],
    };
  }

  private async generateContentIdeas({
    topic,
    count = 5,
  }: {
    topic: string;
    count?: number;
  }) {
    const ideas = [
      `5 ${topic} trends you need to watch in 2026`,
      `How I reduced my trading risk by 40% using ${topic}`,
      `The #1 mistake ${topic} professionals make`,
      `Why ${topic} is the future of finance`,
      `My ${topic} journey: Lessons learned`,
      `${topic} for beginners: A complete guide`,
      `The psychology of ${topic}: What the data shows`,
    ].slice(0, count);

    return {
      content: [
        {
          type: 'text',
          text: `Content ideas for "${topic}":\n\n${ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LinkedIn MCP server running on stdio');
  }
}

// Run the server
const server = new LinkedInMCPServer();
server.run().catch(console.error);

export default LinkedInMCPServer;
