/**
 * Auth & SSO MCP Tools for Klarpakke
 *
 * Diagnose and fix authentication issues
 * Setup LinkedIn, Google, Apple, Magic Link login
 */
export declare const authTools: ({
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            redirect_url: {
                type: string;
                default: string;
            };
            test_email?: undefined;
            audience?: undefined;
            primary_market?: undefined;
            to_email?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            redirect_url?: undefined;
            test_email?: undefined;
            audience?: undefined;
            primary_market?: undefined;
            to_email?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            test_email: {
                type: string;
                description: string;
            };
            redirect_url?: undefined;
            audience?: undefined;
            primary_market?: undefined;
            to_email?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            audience: {
                type: string;
                enum: string[];
                default: string;
            };
            primary_market: {
                type: string;
                default: string;
            };
            redirect_url?: undefined;
            test_email?: undefined;
            to_email?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            to_email: {
                type: string;
            };
            redirect_url?: undefined;
            test_email?: undefined;
            audience?: undefined;
            primary_market?: undefined;
        };
        required: string[];
    };
})[];
export declare function executeAuthTool(name: string, args: any): Promise<string>;
//# sourceMappingURL=auth-tools.d.ts.map