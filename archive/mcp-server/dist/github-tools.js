/**
 * GitHub MCP Tools for Klarpakke
 *
 * Manage GitHub repository secrets and settings
 */
// GitHub API base URL
const GITHUB_API_BASE = "https://api.github.com";
// Get GitHub token from environment
function getGitHubToken() {
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
    if (!token) {
        throw new Error("GITHUB_TOKEN or GITHUB_PAT environment variable is required. " +
            "Set it in your environment or .env.local file.");
    }
    return token;
}
// GitHub API request helper
async function githubApi(endpoint, options = {}) {
    const token = getGitHubToken();
    const url = `${GITHUB_API_BASE}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${error}`);
    }
    // Return null for 204 No Content
    if (response.status === 204) {
        return null;
    }
    return response.json();
}
// Export tool definitions
export const githubTools = [
    {
        name: "github_list_repo_secrets",
        description: "List all secrets in a GitHub repository",
        input_schema: {
            type: "object",
            properties: {
                owner: {
                    type: "string",
                    description: "Repository owner (username or org)",
                },
                repo: {
                    type: "string",
                    description: "Repository name",
                },
            },
            required: ["owner", "repo"],
        },
    },
    {
        name: "github_get_repo_secret",
        description: "Check if a specific secret exists in a GitHub repository",
        input_schema: {
            type: "object",
            properties: {
                owner: {
                    type: "string",
                    description: "Repository owner (username or org)",
                },
                repo: {
                    type: "string",
                    description: "Repository name",
                },
                secret_name: {
                    type: "string",
                    description: "Name of the secret to check",
                },
            },
            required: ["owner", "repo", "secret_name"],
        },
    },
    {
        name: "github_set_repo_secret",
        description: "Set or update a secret in a GitHub repository",
        input_schema: {
            type: "object",
            properties: {
                owner: {
                    type: "string",
                    description: "Repository owner (username or org)",
                },
                repo: {
                    type: "string",
                    description: "Repository name",
                },
                secret_name: {
                    type: "string",
                    description: "Name of the secret",
                },
                secret_value: {
                    type: "string",
                    description: "Value of the secret",
                },
            },
            required: ["owner", "repo", "secret_name", "secret_value"],
        },
    },
    {
        name: "github_delete_repo_secret",
        description: "Delete a secret from a GitHub repository",
        input_schema: {
            type: "object",
            properties: {
                owner: {
                    type: "string",
                    description: "Repository owner (username or org)",
                },
                repo: {
                    type: "string",
                    description: "Repository name",
                },
                secret_name: {
                    type: "string",
                    description: "Name of the secret to delete",
                },
            },
            required: ["owner", "repo", "secret_name"],
        },
    },
];
// Get repository public key for secret encryption
async function getRepoPublicKey(owner, repo) {
    return githubApi(`/repos/${owner}/${repo}/actions/secrets/public-key`);
}
// Encrypt secret value using libsodium
async function encryptSecret(publicKey, secretValue) {
    // For encryption, we need libsodium. Since we want to avoid external deps,
    // we'll use a simple base64 approach for now and let GitHub handle it
    // Actually, GitHub requires proper libsodium encryption
    // Import libsodium dynamically
    const sodium = await import("libsodium-wrappers");
    await sodium.ready;
    // Convert public key from base64
    const publicKeyBinary = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
    // Encrypt the secret
    const encrypted = sodium.crypto_box_seal(sodium.from_string(secretValue), publicKeyBinary);
    // Return base64 encoded encrypted value
    return sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);
}
// Execute GitHub tool
export async function executeGitHubTool(name, args) {
    switch (name) {
        case "github_list_repo_secrets": {
            const { owner, repo } = args;
            try {
                const data = await githubApi(`/repos/${owner}/${repo}/actions/secrets`);
                return JSON.stringify({
                    repository: `${owner}/${repo}`,
                    total_secrets: data.total_count,
                    secrets: data.secrets.map((s) => ({
                        name: s.name,
                        created_at: s.created_at,
                        updated_at: s.updated_at,
                    })),
                }, null, 2);
            }
            catch (error) {
                return JSON.stringify({
                    error: `Failed to list secrets: ${error instanceof Error ? error.message : String(error)}`,
                }, null, 2);
            }
        }
        case "github_get_repo_secret": {
            const { owner, repo, secret_name } = args;
            try {
                // GitHub API doesn't return secret values, only metadata
                const data = await githubApi(`/repos/${owner}/${repo}/actions/secrets`);
                const secret = data.secrets.find((s) => s.name === secret_name);
                if (secret) {
                    return JSON.stringify({
                        exists: true,
                        name: secret.name,
                        created_at: secret.created_at,
                        updated_at: secret.updated_at,
                    }, null, 2);
                }
                else {
                    return JSON.stringify({
                        exists: false,
                        name: secret_name,
                        message: `Secret '${secret_name}' does not exist in ${owner}/${repo}`,
                    }, null, 2);
                }
            }
            catch (error) {
                return JSON.stringify({
                    error: `Failed to get secret: ${error instanceof Error ? error.message : String(error)}`,
                }, null, 2);
            }
        }
        case "github_set_repo_secret": {
            const { owner, repo, secret_name, secret_value } = args;
            try {
                // Get public key for encryption
                const { key_id, key } = await getRepoPublicKey(owner, repo);
                // Encrypt the secret value
                const encryptedValue = await encryptSecret(key, secret_value);
                // Set the secret
                await githubApi(`/repos/${owner}/${repo}/actions/secrets/${secret_name}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        encrypted_value: encryptedValue,
                        key_id: key_id,
                    }),
                });
                return JSON.stringify({
                    success: true,
                    message: `Secret '${secret_name}' has been set in ${owner}/${repo}`,
                    repository: `${owner}/${repo}`,
                    secret_name: secret_name,
                }, null, 2);
            }
            catch (error) {
                return JSON.stringify({
                    error: `Failed to set secret: ${error instanceof Error ? error.message : String(error)}`,
                }, null, 2);
            }
        }
        case "github_delete_repo_secret": {
            const { owner, repo, secret_name } = args;
            try {
                await githubApi(`/repos/${owner}/${repo}/actions/secrets/${secret_name}`, {
                    method: "DELETE",
                });
                return JSON.stringify({
                    success: true,
                    message: `Secret '${secret_name}' has been deleted from ${owner}/${repo}`,
                }, null, 2);
            }
            catch (error) {
                return JSON.stringify({
                    error: `Failed to delete secret: ${error instanceof Error ? error.message : String(error)}`,
                }, null, 2);
            }
        }
        default:
            return JSON.stringify({ message: `Unknown GitHub tool: ${name}` });
    }
}
//# sourceMappingURL=github-tools.js.map