export declare const cloudflareDnsTools: ({
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            zone_id?: undefined;
            type?: undefined;
            name?: undefined;
            content?: undefined;
            ttl?: undefined;
            proxied?: undefined;
            record_id?: undefined;
            subdomain?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            zone_id: {
                type: string;
                description: string;
            };
            type?: undefined;
            name?: undefined;
            content?: undefined;
            ttl?: undefined;
            proxied?: undefined;
            record_id?: undefined;
            subdomain?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            zone_id: {
                type: string;
                description: string;
            };
            type: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            content: {
                type: string;
                description: string;
            };
            ttl: {
                type: string;
                description: string;
            };
            proxied: {
                type: string;
                description: string;
            };
            record_id?: undefined;
            subdomain?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            zone_id: {
                type: string;
                description?: undefined;
            };
            record_id: {
                type: string;
            };
            type: {
                type: string;
                description?: undefined;
            };
            name: {
                type: string;
                description?: undefined;
            };
            content: {
                type: string;
                description?: undefined;
            };
            ttl: {
                type: string;
                description?: undefined;
            };
            proxied: {
                type: string;
                description?: undefined;
            };
            subdomain?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            zone_id: {
                type: string;
                description?: undefined;
            };
            record_id: {
                type: string;
            };
            type?: undefined;
            name?: undefined;
            content?: undefined;
            ttl?: undefined;
            proxied?: undefined;
            subdomain?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            zone_id: {
                type: string;
                description: string;
            };
            subdomain: {
                type: string;
                description: string;
            };
            type?: undefined;
            name?: undefined;
            content?: undefined;
            ttl?: undefined;
            proxied?: undefined;
            record_id?: undefined;
        };
        required: string[];
    };
})[];
export declare function executeCloudflareDnsTool(name: string, args: Record<string, unknown>): Promise<string>;
//# sourceMappingURL=cloudflare-dns-tools.d.ts.map