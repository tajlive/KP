/**
 * Cloud Run MCP Tools for Klarpakke
 *
 * Manage Google Cloud Run deployments and services
 */
export declare const cloudRunTools: ({
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            service: {
                type: string;
                description: string;
                default: string;
            };
            region: {
                type: string;
                description: string;
                default: string;
            };
            tag?: undefined;
            async?: undefined;
            limit?: undefined;
            follow?: undefined;
            key?: undefined;
            value?: undefined;
            allow_unauthenticated?: undefined;
            build_id?: undefined;
            url?: undefined;
            revision?: undefined;
            revisions?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            tag: {
                type: string;
                description: string;
            };
            async: {
                type: string;
                description: string;
                default: boolean;
            };
            service?: undefined;
            region?: undefined;
            limit?: undefined;
            follow?: undefined;
            key?: undefined;
            value?: undefined;
            allow_unauthenticated?: undefined;
            build_id?: undefined;
            url?: undefined;
            revision?: undefined;
            revisions?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            service: {
                type: string;
                default: string;
                description?: undefined;
            };
            limit: {
                type: string;
                default: number;
            };
            follow: {
                type: string;
                default: boolean;
            };
            region?: undefined;
            tag?: undefined;
            async?: undefined;
            key?: undefined;
            value?: undefined;
            allow_unauthenticated?: undefined;
            build_id?: undefined;
            url?: undefined;
            revision?: undefined;
            revisions?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            key: {
                type: string;
                description: string;
            };
            value: {
                type: string;
                description: string;
            };
            service?: undefined;
            region?: undefined;
            tag?: undefined;
            async?: undefined;
            limit?: undefined;
            follow?: undefined;
            allow_unauthenticated?: undefined;
            build_id?: undefined;
            url?: undefined;
            revision?: undefined;
            revisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            service: {
                type: string;
                default: string;
                description?: undefined;
            };
            region?: undefined;
            tag?: undefined;
            async?: undefined;
            limit?: undefined;
            follow?: undefined;
            key?: undefined;
            value?: undefined;
            allow_unauthenticated?: undefined;
            build_id?: undefined;
            url?: undefined;
            revision?: undefined;
            revisions?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            service: {
                type: string;
                default: string;
                description?: undefined;
            };
            allow_unauthenticated: {
                type: string;
                default: boolean;
            };
            region?: undefined;
            tag?: undefined;
            async?: undefined;
            limit?: undefined;
            follow?: undefined;
            key?: undefined;
            value?: undefined;
            build_id?: undefined;
            url?: undefined;
            revision?: undefined;
            revisions?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            limit: {
                type: string;
                default: number;
            };
            service?: undefined;
            region?: undefined;
            tag?: undefined;
            async?: undefined;
            follow?: undefined;
            key?: undefined;
            value?: undefined;
            allow_unauthenticated?: undefined;
            build_id?: undefined;
            url?: undefined;
            revision?: undefined;
            revisions?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            build_id: {
                type: string;
                description: string;
            };
            service?: undefined;
            region?: undefined;
            tag?: undefined;
            async?: undefined;
            limit?: undefined;
            follow?: undefined;
            key?: undefined;
            value?: undefined;
            allow_unauthenticated?: undefined;
            url?: undefined;
            revision?: undefined;
            revisions?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            url: {
                type: string;
                description: string;
            };
            service?: undefined;
            region?: undefined;
            tag?: undefined;
            async?: undefined;
            limit?: undefined;
            follow?: undefined;
            key?: undefined;
            value?: undefined;
            allow_unauthenticated?: undefined;
            build_id?: undefined;
            revision?: undefined;
            revisions?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            revision: {
                type: string;
                description: string;
            };
            service?: undefined;
            region?: undefined;
            tag?: undefined;
            async?: undefined;
            limit?: undefined;
            follow?: undefined;
            key?: undefined;
            value?: undefined;
            allow_unauthenticated?: undefined;
            build_id?: undefined;
            url?: undefined;
            revisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            revisions: {
                type: string;
                description: string;
            };
            service?: undefined;
            region?: undefined;
            tag?: undefined;
            async?: undefined;
            limit?: undefined;
            follow?: undefined;
            key?: undefined;
            value?: undefined;
            allow_unauthenticated?: undefined;
            build_id?: undefined;
            url?: undefined;
            revision?: undefined;
        };
        required: string[];
    };
})[];
export declare function executeCloudRunTool(name: string, args: any): Promise<string>;
//# sourceMappingURL=cloud-run-tools.d.ts.map