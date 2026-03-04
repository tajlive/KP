export declare const stripeTools: ({
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            account_country?: undefined;
            type?: undefined;
            limit?: undefined;
            active?: undefined;
            name?: undefined;
            description?: undefined;
            metadata?: undefined;
            product?: undefined;
            unit_amount?: undefined;
            currency?: undefined;
            recurring?: undefined;
            nickname?: undefined;
            url?: undefined;
            enabled_events?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            account_country: {
                type: string;
                description: string;
                default: string;
            };
            type?: undefined;
            limit?: undefined;
            active?: undefined;
            name?: undefined;
            description?: undefined;
            metadata?: undefined;
            product?: undefined;
            unit_amount?: undefined;
            currency?: undefined;
            recurring?: undefined;
            nickname?: undefined;
            url?: undefined;
            enabled_events?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            type: {
                type: string;
                description: string;
            };
            account_country?: undefined;
            limit?: undefined;
            active?: undefined;
            name?: undefined;
            description?: undefined;
            metadata?: undefined;
            product?: undefined;
            unit_amount?: undefined;
            currency?: undefined;
            recurring?: undefined;
            nickname?: undefined;
            url?: undefined;
            enabled_events?: undefined;
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
                description: string;
            };
            active: {
                type: string;
                description: string;
            };
            account_country?: undefined;
            type?: undefined;
            name?: undefined;
            description?: undefined;
            metadata?: undefined;
            product?: undefined;
            unit_amount?: undefined;
            currency?: undefined;
            recurring?: undefined;
            nickname?: undefined;
            url?: undefined;
            enabled_events?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            name: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            metadata: {
                type: string;
                description: string;
            };
            account_country?: undefined;
            type?: undefined;
            limit?: undefined;
            active?: undefined;
            product?: undefined;
            unit_amount?: undefined;
            currency?: undefined;
            recurring?: undefined;
            nickname?: undefined;
            url?: undefined;
            enabled_events?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            product: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
            active: {
                type: string;
                description: string;
            };
            account_country?: undefined;
            type?: undefined;
            name?: undefined;
            description?: undefined;
            metadata?: undefined;
            unit_amount?: undefined;
            currency?: undefined;
            recurring?: undefined;
            nickname?: undefined;
            url?: undefined;
            enabled_events?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            product: {
                type: string;
                description: string;
            };
            unit_amount: {
                type: string;
                description: string;
            };
            currency: {
                type: string;
                description: string;
            };
            recurring: {
                type: string;
                properties: {
                    interval: {
                        type: string;
                        enum: string[];
                    };
                    interval_count: {
                        type: string;
                    };
                };
                required: string[];
            };
            metadata: {
                type: string;
                description: string;
            };
            nickname: {
                type: string;
                description: string;
            };
            account_country?: undefined;
            type?: undefined;
            limit?: undefined;
            active?: undefined;
            name?: undefined;
            description?: undefined;
            url?: undefined;
            enabled_events?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            limit: {
                type: string;
                description: string;
            };
            account_country?: undefined;
            type?: undefined;
            active?: undefined;
            name?: undefined;
            description?: undefined;
            metadata?: undefined;
            product?: undefined;
            unit_amount?: undefined;
            currency?: undefined;
            recurring?: undefined;
            nickname?: undefined;
            url?: undefined;
            enabled_events?: undefined;
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
            enabled_events: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            account_country?: undefined;
            type?: undefined;
            limit?: undefined;
            active?: undefined;
            name?: undefined;
            metadata?: undefined;
            product?: undefined;
            unit_amount?: undefined;
            currency?: undefined;
            recurring?: undefined;
            nickname?: undefined;
        };
        required: string[];
    };
})[];
export declare function executeStripeTool(name: string, args: any): Promise<string>;
//# sourceMappingURL=stripe-tools.d.ts.map