/**
 * LinkedIn Sales Navigator MCP Tools for Klarpakke
 *
 * MAXIMUM AUTOMATION for lead generation and conversion
 * Uses LinkedIn Sales Navigator API capabilities
 */
export const salesNavigatorTools = [
    // LEAD GENERATION
    {
        name: "sn_search_leads",
        description: "Advanced lead search with 50+ filters (Sales Navigator)",
        input_schema: {
            type: "object",
            properties: {
                keywords: { type: "string", description: "Job title, skills, company" },
                geography: { type: "string", description: "Location (e.g., 'Norway', 'Oslo Area')" },
                industry: { type: "string", description: "Industry (e.g., 'Financial Services')" },
                company_size: { type: "string", enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10001+"], description: "Company headcount" },
                seniority: { type: "string", enum: ["Owner", "Partner", "CXO", "VP", "Director", "Manager", "Senior", "Entry"], description: "Seniority level" },
                function: { type: "string", enum: ["Finance", "Sales", "Marketing", "IT", "Operations", "HR"], description: "Job function" },
                years_in_position: { type: "number", description: "Years in current position" },
                years_at_company: { type: "number", description: "Years at current company" },
                posted_on_linkedin: { type: "string", enum: ["30d", "90d", "6m", "12m"], description: "Posted on LinkedIn within" },
                changed_jobs: { type: "boolean", description: "Changed jobs in last 90 days" },
                mentioned_in_news: { type: "boolean", description: "Mentioned in news" },
                limit: { type: "number", default: 25, maximum: 100 },
            },
            required: ["keywords"],
        },
    },
    // LEAD INTELLIGENCE
    {
        name: "sn_get_lead_insights",
        description: "Get detailed insights about a lead (activities, interests, connections)",
        input_schema: {
            type: "object",
            properties: {
                profile_url: { type: "string", description: "LinkedIn profile URL" },
                include_activity: { type: "boolean", default: true, description: "Include recent activity" },
                include_mutual: { type: "boolean", default: true, description: "Include mutual connections" },
            },
            required: ["profile_url"],
        },
    },
    // ACCOUNT TARGETING
    {
        name: "sn_search_accounts",
        description: "Search for companies/accounts (Sales Navigator)",
        input_schema: {
            type: "object",
            properties: {
                company_name: { type: "string" },
                industry: { type: "string" },
                geography: { type: "string" },
                company_size: { type: "string" },
                revenue_range: { type: "string", enum: ["<1M", "1M-10M", "10M-50M", "50M-100M", "100M-500M", "500M-1B", "1B+"], description: "Annual revenue" },
                growth_rate: { type: "string", enum: ["negative", "0-10%", "10-20%", "20%+"], description: "Headcount growth" },
                technologies: { type: "array", items: { type: "string" }, description: "Technologies used (e.g., ['Salesforce', 'AWS'])" },
                hiring: { type: "boolean", description: "Currently hiring" },
                funding: { type: "string", enum: ["seed", "series_a", "series_b", "series_c+", "public", "acquired"], description: "Funding stage" },
                limit: { type: "number", default: 25 },
            },
        },
    },
    // LEAD RECOMMENDATIONS
    {
        name: "sn_get_lead_recommendations",
        description: "Get AI-powered lead recommendations based on saved leads",
        input_schema: {
            type: "object",
            properties: {
                based_on: { type: "string", description: "Profile URL to base recommendations on" },
                count: { type: "number", default: 10, maximum: 50 },
                similarity_threshold: { type: "number", description: "0-100 similarity score" },
            },
        },
    },
    // OUTREACH AUTOMATION
    {
        name: "sn_send_inmail",
        description: "Send InMail message (Sales Navigator credit)",
        input_schema: {
            type: "object",
            properties: {
                profile_url: { type: "string" },
                subject: { type: "string", maxLength: 200 },
                message: { type: "string", maxLength: 2000 },
                template_name: { type: "string", description: "Use saved template" },
                follow_up_schedule: { type: "array", items: { type: "number" }, description: "Days to follow up [3, 7, 14]" },
            },
            required: ["profile_url", "subject", "message"],
        },
    },
    // TEMPLATES
    {
        name: "sn_create_template",
        description: "Create message template for outreach",
        input_schema: {
            type: "object",
            properties: {
                name: { type: "string" },
                subject: { type: "string" },
                body: { type: "string" },
                variables: { type: "array", items: { type: "string" }, description: ["firstName", "company", "industry", "recentActivity"] },
                type: { type: "string", enum: ["connection", "inmail", "follow_up"], default: "connection" },
            },
            required: ["name", "subject", "body"],
        },
    },
    // CAMPAIGNS
    {
        name: "sn_create_outreach_campaign",
        description: "Create automated outreach campaign",
        input_schema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Campaign name" },
                target_criteria: {
                    type: "object",
                    properties: {
                        keywords: { type: "string" },
                        geography: { type: "string" },
                        industry: { type: "string" },
                        seniority: { type: "string" },
                    },
                },
                message_template: { type: "string" },
                connection_message: { type: "string", maxLength: 300 },
                inmail_subject: { type: "string" },
                inmail_body: { type: "string" },
                daily_limit: { type: "number", default: 20, maximum: 100 },
                follow_up_days: { type: "array", items: { type: "number" }, default: [3, 7, 14] },
                auto_withdraw: { type: "number", description: "Auto-withdraw after N days if no response" },
            },
            required: ["name", "target_criteria", "message_template"],
        },
    },
    // TRACKING & ANALYTICS
    {
        name: "sn_get_campaign_stats",
        description: "Get campaign performance statistics",
        input_schema: {
            type: "object",
            properties: {
                campaign_id: { type: "string" },
                period: { type: "string", enum: ["7d", "30d", "90d"], default: "30d" },
            },
            required: ["campaign_id"],
        },
    },
    // CRM INTEGRATION
    {
        name: "sn_export_to_crm",
        description: "Export leads to CRM (HubSpot/Salesforce)",
        input_schema: {
            type: "object",
            properties: {
                leads: { type: "array", items: { type: "string" }, description: "Profile URLs to export" },
                crm: { type: "string", enum: ["hubspot", "salesforce", "pipedrive"], default: "hubspot" },
                stage: { type: "string", description: "Pipeline stage" },
                tags: { type: "array", items: { type: "string" } },
            },
            required: ["leads", "crm"],
        },
    },
    // REAL-TIME ALERTS
    {
        name: "sn_setup_alerts",
        description: "Setup real-time alerts for lead activities",
        input_schema: {
            type: "object",
            properties: {
                alert_type: { type: "string", enum: ["job_change", "post_activity", "company_news", "mention"], description: "Type of alert" },
                keywords: { type: "array", items: { type: "string" } },
                notify_via: { type: "string", enum: ["email", "slack", "webhook"], default: "email" },
                webhook_url: { type: "string" },
            },
            required: ["alert_type"],
        },
    },
    // TEAM COORDINATION
    {
        name: "sn_teamlink_search",
        description: "Find leads through team connections (TeamLink)",
        input_schema: {
            type: "object",
            properties: {
                target_company: { type: "string" },
                target_title: { type: "string" },
                connection_degree: { type: "string", enum: ["1st", "2nd", "3rd+"], default: "2nd" },
            },
            required: ["target_company"],
        },
    },
    // CONVERSION OPTIMIZATION
    {
        name: "sn_analyze_conversion_funnel",
        description: "Analyze and optimize conversion funnel",
        input_schema: {
            type: "object",
            properties: {
                funnel_stage: { type: "string", enum: ["awareness", "interest", "consideration", "conversion", "all"], default: "all" },
                period: { type: "string", enum: ["7d", "30d", "90d"], default: "30d" },
            },
        },
    },
    // KLARPAKKE SPECIFIC
    {
        name: "sn_find_crypto_trading_leads",
        description: "Find high-quality leads interested in crypto trading education",
        input_schema: {
            type: "object",
            properties: {
                geography: { type: "string", default: "Norway" },
                min_seniority: { type: "string", enum: ["Entry", "Senior", "Manager", "Director"], default: "Senior" },
                exclude_competitors: { type: "boolean", default: true },
                interests: { type: "array", items: { type: "string" }, default: ["cryptocurrency", "trading", "investing", "fintech"] },
                company_types: { type: "array", items: { type: "string" }, default: ["finance", "technology", "consulting"] },
                limit: { type: "number", default: 50 },
            },
        },
    },
    {
        name: "sn_create_klarpakke_campaign",
        description: "Create complete Klarpakke acquisition campaign",
        input_schema: {
            type: "object",
            properties: {
                target_audience: { type: "string", enum: ["beginners", "experienced_traders", "professionals"], default: "beginners" },
                geography: { type: "string", default: "Norway" },
                offer: { type: "string", enum: ["founder_spot", "free_course", "webinar"], default: "founder_spot" },
                urgency: { type: "boolean", default: true },
                spots_left: { type: "number", default: 47 },
            },
        },
    },
];
// Execute Sales Navigator tool
export async function executeSalesNavigatorTool(name, args) {
    // Mock implementations - in production, these would call LinkedIn Sales Navigator API
    switch (name) {
        case "sn_search_leads": {
            const criteria = {
                keywords: args.keywords,
                geography: args.geography || "Norway",
                industry: args.industry || "Financial Services",
                seniority: args.seniority,
                company_size: args.company_size,
            };
            const mockLeads = Array.from({ length: args.limit || 25 }, (_, i) => ({
                id: `lead_${Date.now()}_${i}`,
                firstName: ["Anders", "Lisa", "Marcus", "Sofie", "Erik"][i % 5],
                lastName: ["Hansen", "Johansen", "Larsen", "Nilsen", "Olsen"][i % 5],
                title: `${args.keywords} ${["Manager", "Director", "Analyst", "Specialist"][i % 4]}`,
                company: `${["Nordea", "DNB", "Swedbank", "Handelsbanken", "EY"][i % 5]}`,
                location: criteria.geography,
                industry: criteria.industry,
                connectionDegree: ["2nd", "3rd+"][i % 2],
                profileUrl: `https://linkedin.com/in/profile-${i}`,
                sharedConnectionsCount: Math.floor(Math.random() * 15) + 1,
                lastActivity: ["Posted 2 days ago", "Changed jobs last week", "Active yesterday"][i % 3],
                email: `demo${i}@example.com`,
                icebreakers: [
                    "Posted about crypto regulations",
                    "Liked a post about trading strategies",
                    "Commented on fintech news",
                ],
                decisionMakerScore: Math.floor(Math.random() * 40) + 60,
            }));
            return JSON.stringify({
                searchCriteria: criteria,
                totalResults: 1247,
                returnedResults: mockLeads.length,
                leads: mockLeads,
                insights: {
                    averageConnections: 847,
                    topIndustries: ["Financial Services", "Technology", "Consulting"],
                    topLocations: ["Oslo", "Bergen", "Stavanger", "Trondheim"],
                },
            }, null, 2);
        }
        case "sn_find_crypto_trading_leads": {
            const geo = args.geography || "Norway";
            const leads = Array.from({ length: args.limit || 50 }, (_, i) => ({
                id: `crypto_lead_${i}`,
                firstName: ["Thomas", "Maria", "Jonas", "Emma", "Noah"][i % 5],
                lastName: ["Berg", "Solberg", "Moe", "Lie", "Hagen"][i % 5],
                title: ["Investment Analyst", "Portfolio Manager", "Trader", "Financial Advisor", "Risk Manager"][i % 5],
                company: ["Storebrand", "KLP", "Pareto", "Arctic Securities", "Carnegie"][i % 5],
                location: geo,
                interests: ["Cryptocurrency", "Blockchain", "Trading", "Fintech", "Investing"],
                recentActivity: [
                    "Shared article about Bitcoin ETF",
                    "Posted about risk management",
                    "Commented on market volatility",
                    "Liked crypto trading content",
                ][i % 4],
                buyingIntentScore: Math.floor(Math.random() * 30) + 70,
                profileUrl: `https://linkedin.com/in/crypto-lead-${i}`,
                bestTimeToContact: ["Morning", "Lunch", "Afternoon"][i % 3],
            }));
            return JSON.stringify({
                campaign: "Klarpakke Crypto Education",
                geography: geo,
                totalQualifiedLeads: leads.length,
                averageBuyingIntent: 82,
                leads,
                recommendedApproach: "Focus on paper trading benefits and risk-free learning",
            }, null, 2);
        }
        case "sn_create_klarpakke_campaign": {
            const campaign = {
                id: `campaign_${Date.now()}`,
                name: `Klarpakke ${args.target_audience} Acquisition - ${args.geography}`,
                status: "created",
                target: {
                    audience: args.target_audience,
                    geography: args.geography,
                    estimatedReach: args.target_audience === "beginners" ? 5000 : 2500,
                },
                offer: {
                    type: args.offer,
                    urgency: args.urgency,
                    spotsLeft: args.spots_left,
                    messaging: {
                        subject: args.urgency
                            ? `Only ${args.spots_left} founder spots left - Join Klarpakke`
                            : "Learn crypto trading risk-free with Klarpakke",
                        body: `Hi {{firstName}},\n\nI noticed you're working as {{title}} at {{company}}. Given your interest in {{industry}}, I thought you'd appreciate knowing about Klarpakke - Norway's first crypto university.\n\nWe're offering ${args.spots_left} founder spots with:\n✓ 10,000 KLT tokens\n✓ Free paper trading with 1M NOK virtual money\n✓ Lifetime support\n\nWould you be interested in learning more?\n\nBest regards`,
                    },
                },
                automation: {
                    dailyConnectionLimit: 20,
                    followUpSequence: [3, 7, 14],
                    autoWithdrawAfter: 21,
                },
                tracking: {
                    utmSource: "sales_navigator",
                    utmMedium: "outreach",
                    utmCampaign: args.offer,
                },
            };
            return JSON.stringify({
                message: "✅ Klarpakke acquisition campaign created successfully!",
                campaign,
                nextSteps: [
                    "Review and approve message templates",
                    "Set daily outreach limit (recommended: 20/day)",
                    "Monitor response rates and adjust messaging",
                    "Export qualified leads to CRM",
                ],
            }, null, 2);
        }
        case "sn_get_lead_insights": {
            return JSON.stringify({
                profile: args.profile_url,
                insights: {
                    recentActivity: [
                        { type: "post", content: "Shared article about crypto regulations", date: "2 days ago", engagement: 47 },
                        { type: "like", content: "Liked post about trading psychology", date: "5 days ago" },
                        { type: "comment", content: "Commented on market analysis", date: "1 week ago" },
                    ],
                    interests: ["Cryptocurrency", "Trading", "Fintech", "Blockchain", "Investing"],
                    engagementScore: 78,
                    postingFrequency: "Weekly",
                    bestEngagementTimes: ["Tuesday 9AM", "Thursday 2PM", "Friday 11AM"],
                    mutualConnections: [
                        { name: "Ola Nordmann", title: "CEO at Fintech AS", connectionStrength: "Strong" },
                        { name: "Kari Hansen", title: "Investment Manager", connectionStrength: "Medium" },
                    ],
                    conversationStarters: [
                        "Saw your post about crypto regulations - interesting perspective!",
                        "We have 3 mutual connections in fintech",
                        "Noticed you're interested in trading psychology",
                    ],
                },
            }, null, 2);
        }
        case "sn_analyze_conversion_funnel": {
            const funnel = {
                period: args.period || "30d",
                stages: {
                    awareness: {
                        impressions: 15420,
                        profileViews: 2847,
                        uniqueVisitors: 1245,
                    },
                    interest: {
                        contentEngagements: 456,
                        connectionRequests: 128,
                        accepted: 89,
                        responseRate: "69.5%",
                    },
                    consideration: {
                        messagesSent: 156,
                        replies: 67,
                        conversations: 34,
                        meetingsBooked: 12,
                    },
                    conversion: {
                        signups: 8,
                        conversions: 3,
                        revenue: 2997,
                        conversionRate: "2.4%",
                    },
                },
                bottlenecks: [
                    { stage: "consideration", issue: "Low reply rate to InMails", recommendation: "Personalize messages more" },
                    { stage: "conversion", issue: "Long decision time", recommendation: "Add urgency with limited spots" },
                ],
                optimization: {
                    topPerformingMessage: "Subject: Norway's first crypto university",
                    bestTimeToReach: "Tuesday 9-11 AM",
                    idealFollowUp: "3 days after connection",
                },
            };
            return JSON.stringify(funnel, null, 2);
        }
        case "sn_setup_alerts": {
            return JSON.stringify({
                message: "✅ Real-time alerts configured",
                alert: {
                    type: args.alert_type,
                    keywords: args.keywords || ["crypto", "trading", "fintech"],
                    notifyVia: args.notify_via,
                    webhookUrl: args.webhook_url,
                    frequency: "Real-time",
                    filters: {
                        minimumConnectionStrength: "2nd",
                        geography: "Norway",
                        industry: "Financial Services",
                    },
                },
                sampleAlerts: [
                    "🎯 Lead changed jobs - perfect time to reach out!",
                    "📰 Company mentioned in crypto news",
                    "💬 Lead posted about trading challenges",
                ],
            }, null, 2);
        }
        case "sn_create_template": {
            return JSON.stringify({
                message: "✅ Template created successfully",
                template: {
                    name: args.name,
                    type: args.type,
                    subject: args.subject,
                    body: args.body,
                    variables: args.variables || ["firstName", "company"],
                    personalizationScore: 85,
                    estimatedResponseRate: "15-25%",
                },
                tips: [
                    "Keep subject lines under 60 characters",
                    "Personalize first sentence with recent activity",
                    "Include clear call-to-action",
                    "Test different versions with A/B testing",
                ],
            }, null, 2);
        }
        case "sn_send_inmail": {
            return JSON.stringify({
                message: "✅ InMail sent successfully",
                inmail: {
                    recipient: args.profile_url,
                    subject: args.subject,
                    messageLength: args.message.length,
                    creditsUsed: 1,
                    remainingCredits: 49,
                    estimatedOpenRate: "65%",
                    estimatedResponseRate: "20%",
                    followUpsScheduled: args.follow_up_schedule || [],
                },
                tracking: {
                    sentAt: new Date().toISOString(),
                    expectedOpen: "Within 48 hours",
                    reminderSet: true,
                },
            }, null, 2);
        }
        default:
            return JSON.stringify({
                message: `Sales Navigator tool "${name}" executed`,
                args,
                note: "This is a mock response. In production, this would call LinkedIn Sales Navigator API.",
            }, null, 2);
    }
}
//# sourceMappingURL=sales-navigator-tools.js.map