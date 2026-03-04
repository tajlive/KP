/**
 * GitHub MCP Tools for Klarpakke
 *
 * Manage GitHub repository secrets and settings
 */
export declare const githubTools: ({
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            owner: {
                type: string;
                description: string;
            };
            repo: {
                type: string;
                description: string;
            };
            secret_name?: undefined;
            secret_value?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            owner: {
                type: string;
                description: string;
            };
            repo: {
                type: string;
                description: string;
            };
            secret_name: {
                type: string;
                description: string;
            };
            secret_value?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            owner: {
                type: string;
                description: string;
            };
            repo: {
                type: string;
                description: string;
            };
            secret_name: {
                type: string;
                description: string;
            };
            secret_value: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
})[];
export declare function executeGitHubTool(name: string, args: any): Promise<string>;
//# sourceMappingURL=github-tools.d.ts.map