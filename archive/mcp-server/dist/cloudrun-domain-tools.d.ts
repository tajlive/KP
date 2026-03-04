export declare const cloudrunDomainTools: ({
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            domain?: undefined;
            service?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            domain: {
                type: string;
                description: string;
            };
            service: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            domain: {
                type: string;
                description: string;
            };
            service?: undefined;
        };
        required: string[];
    };
})[];
export declare function executeCloudrunDomainTool(name: string, args: Record<string, unknown>): Promise<string>;
//# sourceMappingURL=cloudrun-domain-tools.d.ts.map