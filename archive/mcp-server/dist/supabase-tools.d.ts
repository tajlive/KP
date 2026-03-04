export declare const supabaseTools: ({
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            table_name?: undefined;
            dry_run?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            table_name: {
                type: string;
                description: string;
            };
            dry_run?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: {
            dry_run: {
                type: string;
                description: string;
            };
            table_name?: undefined;
        };
        required: never[];
    };
})[];
export declare function executeSupabaseTool(name: string, args: Record<string, unknown>): Promise<string>;
//# sourceMappingURL=supabase-tools.d.ts.map