/**
 * LinkedIn Tools for Klarpakke MCP Server
 *
 * Provides LinkedIn automation capabilities:
 * - Profile analytics
 * - Content creation and scheduling
 * - Network growth tracking
 * - Lead generation
 */
export declare const linkedinTools: ({
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            profileId: {
                type: string;
                description: string;
            };
            period?: undefined;
            content?: undefined;
            visibility?: undefined;
            scheduledTime?: undefined;
            postUrn?: undefined;
            keywords?: undefined;
            location?: undefined;
            industry?: undefined;
            limit?: undefined;
            message?: undefined;
            companyId?: undefined;
            count?: undefined;
            topic?: undefined;
            tone?: undefined;
            profileUrl?: undefined;
            analysisType?: undefined;
            weekStart?: undefined;
            topics?: undefined;
            postFrequency?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            period: {
                type: string;
                enum: string[];
                description: string;
            };
            profileId?: undefined;
            content?: undefined;
            visibility?: undefined;
            scheduledTime?: undefined;
            postUrn?: undefined;
            keywords?: undefined;
            location?: undefined;
            industry?: undefined;
            limit?: undefined;
            message?: undefined;
            companyId?: undefined;
            count?: undefined;
            topic?: undefined;
            tone?: undefined;
            profileUrl?: undefined;
            analysisType?: undefined;
            weekStart?: undefined;
            topics?: undefined;
            postFrequency?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            content: {
                type: string;
                description: string;
            };
            visibility: {
                type: string;
                enum: string[];
                description: string;
            };
            scheduledTime: {
                type: string;
                description: string;
            };
            profileId?: undefined;
            period?: undefined;
            postUrn?: undefined;
            keywords?: undefined;
            location?: undefined;
            industry?: undefined;
            limit?: undefined;
            message?: undefined;
            companyId?: undefined;
            count?: undefined;
            topic?: undefined;
            tone?: undefined;
            profileUrl?: undefined;
            analysisType?: undefined;
            weekStart?: undefined;
            topics?: undefined;
            postFrequency?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            postUrn: {
                type: string;
                description: string;
            };
            profileId?: undefined;
            period?: undefined;
            content?: undefined;
            visibility?: undefined;
            scheduledTime?: undefined;
            keywords?: undefined;
            location?: undefined;
            industry?: undefined;
            limit?: undefined;
            message?: undefined;
            companyId?: undefined;
            count?: undefined;
            topic?: undefined;
            tone?: undefined;
            profileUrl?: undefined;
            analysisType?: undefined;
            weekStart?: undefined;
            topics?: undefined;
            postFrequency?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            keywords: {
                type: string;
                description: string;
            };
            location: {
                type: string;
                description: string;
            };
            industry: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
                default: number;
            };
            profileId?: undefined;
            period?: undefined;
            content?: undefined;
            visibility?: undefined;
            scheduledTime?: undefined;
            postUrn?: undefined;
            message?: undefined;
            companyId?: undefined;
            count?: undefined;
            topic?: undefined;
            tone?: undefined;
            profileUrl?: undefined;
            analysisType?: undefined;
            weekStart?: undefined;
            topics?: undefined;
            postFrequency?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            profileId: {
                type: string;
                description: string;
            };
            message: {
                type: string;
                description: string;
            };
            period?: undefined;
            content?: undefined;
            visibility?: undefined;
            scheduledTime?: undefined;
            postUrn?: undefined;
            keywords?: undefined;
            location?: undefined;
            industry?: undefined;
            limit?: undefined;
            companyId?: undefined;
            count?: undefined;
            topic?: undefined;
            tone?: undefined;
            profileUrl?: undefined;
            analysisType?: undefined;
            weekStart?: undefined;
            topics?: undefined;
            postFrequency?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            count: {
                type: string;
                description: string;
                default: number;
            };
            profileId?: undefined;
            period?: undefined;
            content?: undefined;
            visibility?: undefined;
            scheduledTime?: undefined;
            postUrn?: undefined;
            keywords?: undefined;
            location?: undefined;
            industry?: undefined;
            limit?: undefined;
            message?: undefined;
            topic?: undefined;
            tone?: undefined;
            profileUrl?: undefined;
            analysisType?: undefined;
            weekStart?: undefined;
            topics?: undefined;
            postFrequency?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            topic: {
                type: string;
                description: string;
            };
            count: {
                type: string;
                description: string;
                default: number;
            };
            tone: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            profileId?: undefined;
            period?: undefined;
            content?: undefined;
            visibility?: undefined;
            scheduledTime?: undefined;
            postUrn?: undefined;
            keywords?: undefined;
            location?: undefined;
            industry?: undefined;
            limit?: undefined;
            message?: undefined;
            companyId?: undefined;
            profileUrl?: undefined;
            analysisType?: undefined;
            weekStart?: undefined;
            topics?: undefined;
            postFrequency?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            profileUrl: {
                type: string;
                description: string;
            };
            analysisType: {
                type: string;
                enum: string[];
                description: string;
                default: string;
            };
            profileId?: undefined;
            period?: undefined;
            content?: undefined;
            visibility?: undefined;
            scheduledTime?: undefined;
            postUrn?: undefined;
            keywords?: undefined;
            location?: undefined;
            industry?: undefined;
            limit?: undefined;
            message?: undefined;
            companyId?: undefined;
            count?: undefined;
            topic?: undefined;
            tone?: undefined;
            weekStart?: undefined;
            topics?: undefined;
            postFrequency?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            weekStart: {
                type: string;
                description: string;
            };
            topics: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            postFrequency: {
                type: string;
                description: string;
                default: number;
            };
            profileId?: undefined;
            period?: undefined;
            content?: undefined;
            visibility?: undefined;
            scheduledTime?: undefined;
            postUrn?: undefined;
            keywords?: undefined;
            location?: undefined;
            industry?: undefined;
            limit?: undefined;
            message?: undefined;
            companyId?: undefined;
            count?: undefined;
            topic?: undefined;
            tone?: undefined;
            profileUrl?: undefined;
            analysisType?: undefined;
        };
        required: string[];
    };
})[];
export declare function executeLinkedInTool(name: string, args: any): Promise<string>;
//# sourceMappingURL=linkedin-tools.d.ts.map