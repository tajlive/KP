export declare const vercelTools: ({
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            environment: {
                type: string;
                description: string;
                enum: string[];
                default?: undefined;
            };
            skip_build: {
                type: string;
                description: string;
            };
            skip_migrations?: undefined;
            limit?: undefined;
            url?: undefined;
            tests?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            environment: {
                type: string;
                description: string;
                enum: string[];
                default: string;
            };
            skip_migrations: {
                type: string;
                description: string;
                default: boolean;
            };
            skip_build?: undefined;
            limit?: undefined;
            url?: undefined;
            tests?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            limit: {
                type: string;
                description: string;
                default: number;
            };
            environment?: undefined;
            skip_build?: undefined;
            skip_migrations?: undefined;
            url?: undefined;
            tests?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            url: {
                type: string;
                description: string;
            };
            environment?: undefined;
            skip_build?: undefined;
            skip_migrations?: undefined;
            limit?: undefined;
            tests?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            environment?: undefined;
            skip_build?: undefined;
            skip_migrations?: undefined;
            limit?: undefined;
            url?: undefined;
            tests?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            url: {
                type: string;
                description: string;
            };
            tests: {
                type: string;
                description: string;
                items: {
                    type: string;
                    enum: string[];
                };
                default: string[];
            };
            environment?: undefined;
            skip_build?: undefined;
            skip_migrations?: undefined;
            limit?: undefined;
        };
        required: never[];
    };
})[];
export declare function executeVercelTool(name: string, args: Record<string, unknown>): Promise<string>;
//# sourceMappingURL=vercel-tools.d.ts.map