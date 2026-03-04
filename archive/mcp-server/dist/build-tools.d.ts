export declare const buildTools: ({
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            fix?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            fix: {
                type: string;
                description: string;
            };
        };
        required: never[];
    };
})[];
export declare function executeBuildTool(name: string, args: Record<string, unknown>): Promise<string>;
//# sourceMappingURL=build-tools.d.ts.map