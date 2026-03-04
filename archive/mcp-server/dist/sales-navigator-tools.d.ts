/**
 * LinkedIn Sales Navigator MCP Tools for Klarpakke
 *
 * MAXIMUM AUTOMATION for lead generation and conversion
 * Uses LinkedIn Sales Navigator API capabilities
 */
export declare const salesNavigatorTools: ({
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            keywords: {
                type: string;
                description: string;
                items?: undefined;
            };
            geography: {
                type: string;
                description: string;
                default?: undefined;
            };
            industry: {
                type: string;
                description: string;
            };
            company_size: {
                type: string;
                enum: string[];
                description: string;
            };
            seniority: {
                type: string;
                enum: string[];
                description: string;
            };
            function: {
                type: string;
                enum: string[];
                description: string;
            };
            years_in_position: {
                type: string;
                description: string;
            };
            years_at_company: {
                type: string;
                description: string;
            };
            posted_on_linkedin: {
                type: string;
                enum: string[];
                description: string;
            };
            changed_jobs: {
                type: string;
                description: string;
            };
            mentioned_in_news: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                default: number;
                maximum: number;
            };
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            profile_url: {
                type: string;
                description: string;
            };
            include_activity: {
                type: string;
                default: boolean;
                description: string;
            };
            include_mutual: {
                type: string;
                default: boolean;
                description: string;
            };
            keywords?: undefined;
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            company_name: {
                type: string;
            };
            industry: {
                type: string;
                description?: undefined;
            };
            geography: {
                type: string;
                description?: undefined;
                default?: undefined;
            };
            company_size: {
                type: string;
                enum?: undefined;
                description?: undefined;
            };
            revenue_range: {
                type: string;
                enum: string[];
                description: string;
            };
            growth_rate: {
                type: string;
                enum: string[];
                description: string;
            };
            technologies: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            hiring: {
                type: string;
                description: string;
            };
            funding: {
                type: string;
                enum: string[];
                description: string;
            };
            limit: {
                type: string;
                default: number;
                maximum?: undefined;
            };
            keywords?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            based_on: {
                type: string;
                description: string;
            };
            count: {
                type: string;
                default: number;
                maximum: number;
            };
            similarity_threshold: {
                type: string;
                description: string;
            };
            keywords?: undefined;
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            profile_url: {
                type: string;
                description?: undefined;
            };
            subject: {
                type: string;
                maxLength: number;
            };
            message: {
                type: string;
                maxLength: number;
            };
            template_name: {
                type: string;
                description: string;
            };
            follow_up_schedule: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            keywords?: undefined;
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            name: {
                type: string;
                description?: undefined;
            };
            subject: {
                type: string;
                maxLength?: undefined;
            };
            body: {
                type: string;
            };
            variables: {
                type: string;
                items: {
                    type: string;
                };
                description: string[];
            };
            type: {
                type: string;
                enum: string[];
                default: string;
            };
            keywords?: undefined;
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required: string[];
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
            target_criteria: {
                type: string;
                properties: {
                    keywords: {
                        type: string;
                    };
                    geography: {
                        type: string;
                    };
                    industry: {
                        type: string;
                    };
                    seniority: {
                        type: string;
                    };
                };
            };
            message_template: {
                type: string;
            };
            connection_message: {
                type: string;
                maxLength: number;
            };
            inmail_subject: {
                type: string;
            };
            inmail_body: {
                type: string;
            };
            daily_limit: {
                type: string;
                default: number;
                maximum: number;
            };
            follow_up_days: {
                type: string;
                items: {
                    type: string;
                };
                default: number[];
            };
            auto_withdraw: {
                type: string;
                description: string;
            };
            keywords?: undefined;
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            campaign_id: {
                type: string;
            };
            period: {
                type: string;
                enum: string[];
                default: string;
            };
            keywords?: undefined;
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            leads: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            crm: {
                type: string;
                enum: string[];
                default: string;
            };
            stage: {
                type: string;
                description: string;
            };
            tags: {
                type: string;
                items: {
                    type: string;
                };
            };
            keywords?: undefined;
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            alert_type: {
                type: string;
                enum: string[];
                description: string;
            };
            keywords: {
                type: string;
                items: {
                    type: string;
                };
                description?: undefined;
            };
            notify_via: {
                type: string;
                enum: string[];
                default: string;
            };
            webhook_url: {
                type: string;
            };
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            target_company: {
                type: string;
            };
            target_title: {
                type: string;
            };
            connection_degree: {
                type: string;
                enum: string[];
                default: string;
            };
            keywords?: undefined;
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            funnel_stage: {
                type: string;
                enum: string[];
                default: string;
            };
            period: {
                type: string;
                enum: string[];
                default: string;
            };
            keywords?: undefined;
            geography?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            geography: {
                type: string;
                default: string;
                description?: undefined;
            };
            min_seniority: {
                type: string;
                enum: string[];
                default: string;
            };
            exclude_competitors: {
                type: string;
                default: boolean;
            };
            interests: {
                type: string;
                items: {
                    type: string;
                };
                default: string[];
            };
            company_types: {
                type: string;
                items: {
                    type: string;
                };
                default: string[];
            };
            limit: {
                type: string;
                default: number;
                maximum?: undefined;
            };
            keywords?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            target_audience?: undefined;
            offer?: undefined;
            urgency?: undefined;
            spots_left?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: {
            target_audience: {
                type: string;
                enum: string[];
                default: string;
            };
            geography: {
                type: string;
                default: string;
                description?: undefined;
            };
            offer: {
                type: string;
                enum: string[];
                default: string;
            };
            urgency: {
                type: string;
                default: boolean;
            };
            spots_left: {
                type: string;
                default: number;
            };
            keywords?: undefined;
            industry?: undefined;
            company_size?: undefined;
            seniority?: undefined;
            function?: undefined;
            years_in_position?: undefined;
            years_at_company?: undefined;
            posted_on_linkedin?: undefined;
            changed_jobs?: undefined;
            mentioned_in_news?: undefined;
            limit?: undefined;
            profile_url?: undefined;
            include_activity?: undefined;
            include_mutual?: undefined;
            company_name?: undefined;
            revenue_range?: undefined;
            growth_rate?: undefined;
            technologies?: undefined;
            hiring?: undefined;
            funding?: undefined;
            based_on?: undefined;
            count?: undefined;
            similarity_threshold?: undefined;
            subject?: undefined;
            message?: undefined;
            template_name?: undefined;
            follow_up_schedule?: undefined;
            name?: undefined;
            body?: undefined;
            variables?: undefined;
            type?: undefined;
            target_criteria?: undefined;
            message_template?: undefined;
            connection_message?: undefined;
            inmail_subject?: undefined;
            inmail_body?: undefined;
            daily_limit?: undefined;
            follow_up_days?: undefined;
            auto_withdraw?: undefined;
            campaign_id?: undefined;
            period?: undefined;
            leads?: undefined;
            crm?: undefined;
            stage?: undefined;
            tags?: undefined;
            alert_type?: undefined;
            notify_via?: undefined;
            webhook_url?: undefined;
            target_company?: undefined;
            target_title?: undefined;
            connection_degree?: undefined;
            funnel_stage?: undefined;
            min_seniority?: undefined;
            exclude_competitors?: undefined;
            interests?: undefined;
            company_types?: undefined;
        };
        required?: undefined;
    };
})[];
export declare function executeSalesNavigatorTool(name: string, args: any): Promise<string>;
//# sourceMappingURL=sales-navigator-tools.d.ts.map