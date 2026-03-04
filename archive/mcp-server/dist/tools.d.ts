interface ToolSchema {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
}
/**
 * Tool Registry for MCP Server
 * Defines all available tools with metadata and implementations
 */
export interface ToolDefinition {
    name: string;
    description: string;
    category: "git" | "build" | "deploy" | "file" | "info";
    input_schema: ToolSchema;
    handler: (input: Record<string, unknown>) => Promise<string>;
}
export declare const gitTools: ToolDefinition[];
export declare const buildTools: ToolDefinition[];
export declare const deployTools: ToolDefinition[];
export declare const fileTools: ToolDefinition[];
export declare const infoTools: ToolDefinition[];
export declare const allTools: ToolDefinition[];
export declare const toolsByCategory: {
    git: ToolDefinition[];
    build: ToolDefinition[];
    deploy: ToolDefinition[];
    file: ToolDefinition[];
    info: ToolDefinition[];
};
export declare function toStandardTools(): {
    name: string;
    description: string;
    input_schema: ToolSchema;
}[];
export {};
//# sourceMappingURL=tools.d.ts.map