#!/bin/bash
# Linear MCP Wrapper - Bruker Linear GraphQL API direkte

LINEAR_API_KEY="${LINEAR_API_KEY}"

if [ -z "$LINEAR_API_KEY" ]; then
    echo '{"error": "LINEAR_API_KEY not set"}' >&2
    exit 1
fi

while IFS= read -r line; do
    method=$(echo "$line" | jq -r '.method // empty')
    id=$(echo "$line" | jq -r '.id // empty')
    params=$(echo "$line" | jq -r '.params // {}')
    
    case "$method" in
        "initialize")
            echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"serverInfo\":{\"name\":\"linear-mcp\",\"version\":\"1.0.0\"}}}"
            ;;
        "tools/list")
            echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":{\"tools\":[\
                {\"name\":\"linear_viewer\",\"description\":\"Get current user info\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}},\
                {\"name\":\"linear_issues\",\"description\":\"Get issues from Linear\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"first\":{\"type\":\"number\",\"default\":10},\"filter\":{\"type\":\"string\"}}}},\
                {\"name\":\"linear_teams\",\"description\":\"Get teams from Linear\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}},\
                {\"name\":\"linear_create_issue\",\"description\":\"Create a new issue\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"title\":{\"type\":\"string\"},\"description\":{\"type\":\"string\"},\"teamId\":{\"type\":\"string\"}},\"required\":[\"title\",\"teamId\"]}}\
            ]}}"
            ;;
        "tools/call")
            tool=$(echo "$params" | jq -r '.name')
            tool_params=$(echo "$params" | jq -r '.arguments // {}')
            
            case "$tool" in
                "linear_viewer")
                    result=$(curl -s https://api.linear.app/graphql \
                        -H "Authorization: $LINEAR_API_KEY" \
                        -H "Content-Type: application/json" \
                        -d '{"query":"{ viewer { id name email } }"}' 2>/dev/null)
                    echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":{\"content\":[{\"type\":\"text\",\"text\":$(echo "$result" | jq -sR .)}]}}"
                    ;;
                "linear_issues")
                    first=$(echo "$tool_params" | jq -r '.first // 10')
                    result=$(curl -s https://api.linear.app/graphql \
                        -H "Authorization: $LINEAR_API_KEY" \
                        -H "Content-Type: application/json" \
                        -d "{\"query\":\"query { issues(first: $first) { nodes { id identifier title state { name } assignee { name } createdAt } } }\"}" 2>/dev/null)
                    echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":{\"content\":[{\"type\":\"text\",\"text\":$(echo "$result" | jq -sR .)}]}}"
                    ;;
                "linear_teams")
                    result=$(curl -s https://api.linear.app/graphql \
                        -H "Authorization: $LINEAR_API_KEY" \
                        -H "Content-Type: application/json" \
                        -d '{"query":"query { teams { nodes { id name key } } }"}' 2>/dev/null)
                    echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":{\"content\":[{\"type\":\"text\",\"text\":$(echo "$result" | jq -sR .)}]}}"
                    ;;
                "linear_create_issue")
                    title=$(echo "$tool_params" | jq -r '.title')
                    description=$(echo "$tool_params" | jq -r '.description // ""')
                    teamId=$(echo "$tool_params" | jq -r '.teamId')
                    result=$(curl -s https://api.linear.app/graphql \
                        -H "Authorization: $LINEAR_API_KEY" \
                        -H "Content-Type: application/json" \
                        -d "{\"query\":\"mutation { issueCreate(input: { title: \\\"$title\\\" description: \\\"$description\\\" teamId: \\\"$teamId\\\" }) { success issue { id identifier title } } }\"}" 2>/dev/null)
                    echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"result\":{\"content\":[{\"type\":\"text\",\"text\":$(echo "$result" | jq -sR .)}]}}"
                    ;;
                *)
                    echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"error\":{\"code\":-32601,\"message\":\"Tool not found\"}}"
                    ;;
            esac
            ;;
        *)
            echo "{\"jsonrpc\":\"2.0\",\"id\":$id,\"error\":{\"code\":-32601,\"message\":\"Method not found\"}}"
            ;;
    esac
done
