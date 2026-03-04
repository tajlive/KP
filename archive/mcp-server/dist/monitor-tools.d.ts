export declare const monitorTools: ({
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            url: {
                type: string;
                description: string;
            };
            lines?: undefined;
            service?: undefined;
            hours?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            lines: {
                type: string;
                description: string;
            };
            service: {
                type: string;
                description: string;
            };
            url?: undefined;
            hours?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            service: {
                type: string;
                description: string;
            };
            hours: {
                type: string;
                description: string;
            };
            url?: undefined;
            lines?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            service: {
                type: string;
                description: string;
            };
            url?: undefined;
            lines?: undefined;
            hours?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            url?: undefined;
            lines?: undefined;
            service?: undefined;
            hours?: undefined;
        };
        required: never[];
    };
})[];
export declare function executeMonitorTool(name: string, args: Record<string, unknown>): Promise<string>;
//# sourceMappingURL=monitor-tools.d.ts.map