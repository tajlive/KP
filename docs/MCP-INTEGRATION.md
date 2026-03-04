# Klarpakke MCP Integration Guide

## Overview

The Klarpakke project now includes a **Model Context Protocol (MCP)** server that enables AI-powered automation for common development tasks:

- 🔧 Git operations (status, commit, push, diff)
- 🏗️ Build and lint automation
- 🚀 Deployment orchestration
- 📄 File operations and inspection
- 📊 Project information retrieval

## Architecture

```
Claude Code / AI Agent
        ↓
    MCP Client
        ↓
MCP Server (Node.js)
        ↓
    Tools Layer
        ↓
Git / Build / Deploy / File System
```

## Setup

### 1. Install MCP Server Dependencies

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure Claude Code

Add to your Claude Code configuration (`.claude/mcp.json`):

```json
{
  "mcpServers": {
    "klarpakke-automation": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"]
    }
  }
}
```

### 3. Verify Connection

```bash
npm run dev  # Start MCP server in dev mode
```

## Available Tools

### Git Tools

- **git_status** - Show repository status
- **git_log** - Display recent commits
- **git_diff** - Show uncommitted changes

### Build Tools

- **build_app** - Build klarpakke-app
- **lint_code** - Run Biome linter
- **check_dependencies** - Audit packages

### Deployment Tools

- **deploy_staging** - Deploy to staging
- **deploy_production** - Deploy to production

### File Tools

- **read_file** - Read file contents
- **list_files** - List directory

### Info Tools

- **get_project_info** - Get project metadata

## Usage Examples

### Via Claude Code

```
@claude "Show me the current status and recent commits"
```

The MCP server will execute:
- `git_status`
- `git_log`

### Via GitHub Actions

Trigger automated workflows using the `mcp-automation.yml` workflow:

```bash
gh workflow run mcp-automation.yml -f action=lint-fix
gh workflow run mcp-automation.yml -f action=build-test
gh workflow run mcp-automation.yml -f action=deploy-staging
```

## Integration with CI/CD

The MCP server is integrated with GitHub Actions for:

1. **Automated Linting** - Auto-fix style issues
2. **Build Verification** - Ensure builds pass
3. **Deployment** - Trigger deployments from CI
4. **Status Reporting** - Report results back to MCP clients

## Common Workflows

### Fix Linting Issues

```
"@claude lint and fix any code style issues, then push changes"
```

Result:
1. Runs `npm run lint:fix`
2. Commits changes with message "chore: auto-fix lint issues"
3. Pushes to current branch

### Deploy to Staging

```
"@claude build the app and deploy to staging"
```

Result:
1. Builds the app
2. Runs linter
3. Triggers staging deployment

### Full CI Check

```
"@claude run full CI pipeline - lint, build, and test"
```

Result:
1. Runs all checks
2. Reports results
3. Creates summary

## Security

- ⚠️ **MCP server runs with user permissions** - be cautious with untrusted code
- 🔐 GitHub Actions secrets are available
- 📝 All operations are logged via GitHub Actions
- 🔒 Use branch protection rules for production deployments

## Development

### Add New Tools

Edit `mcp-server/src/tools.ts`:

```typescript
export const customTools: ToolDefinition[] = [
  {
    name: "my_tool",
    description: "What it does",
    category: "custom",
    input_schema: { ... },
    handler: async (input) => {
      // Implementation
    }
  }
];
```

### Test Locally

```bash
cd mcp-server
npm run dev
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MCP server won't start | Check Node.js version (≥18) |
| Tools not available | Run `npm run build` in mcp-server |
| Git operations fail | Ensure git is installed and configured |
| Deploy fails | Check GitHub secrets are set |

## Future Enhancements

- [ ] Database migration tools
- [ ] Webflow API integration
- [ ] Slack notifications
- [ ] Automatic dependency updates
- [ ] Performance monitoring
- [ ] Custom script execution

## References

- [MCP Protocol Specification](https://github.com/anthropics/anthropic-sdk-python)
- [Claude Code Documentation](https://claude.com/claude-code)
- [GitHub Actions Documentation](https://docs.github.com/actions)
