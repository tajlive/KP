interface LinkedInConfig {
    accessToken?: string;
    clientId?: string;
    clientSecret?: string;
}
declare class LinkedInMCPServer {
    private config;
    private server;
    constructor(config?: LinkedInConfig);
    private setupToolHandlers;
    private getProfile;
    private getNetworkStats;
    private createPost;
    private getPostAnalytics;
    private searchPeople;
    private sendInvitation;
    private getCompanyUpdates;
    private generateContentIdeas;
    run(): Promise<void>;
}
export default LinkedInMCPServer;
//# sourceMappingURL=linkedin.d.ts.map