#!/usr/bin/env python3
import sys, os, subprocess, json
from pathlib import Path
import re

PALACE_PATH = Path.home() / '.mempalace'
TOOLS = {
  'list_tools': {'description': 'List available MemPalace tools', 'params': {}},
  'search': {'description': 'Søk i MemPalace minner', 'params': {'query': {'type': 'string'}}},
  'mine': {'description': 'Indekser filer', 'params': {'path': {'type': 'string'}}},
  'status': {'description': 'MemPalace status', 'params': {}}
}

def handle_request(line):
  try:
    parts = line.strip().split('|', 2)
    if len(parts) < 2:
      return 'ERROR|Invalid MCP format'
    tool = parts[1]
    args_str = parts[2] if len(parts) > 2 else '{}'
    args = json.loads(args_str)
    
    if tool == 'list_tools':
      return json.dumps({'tools': list(TOOLS.keys())})
    
    if tool == 'search':
      query = args.get('query', '')
      cmd = ['mempalace', 'search', query, '--palace', str(PALACE_PATH)]
      result = subprocess.run(cmd, cwd=str(PALACE_PATH), capture_output=True, text=True, timeout=30)
      if result.returncode == 0:
        return json.dumps({'result': result.stdout.strip()})
      return json.dumps({'error': result.stderr})
    
    if tool == 'status':
      cmd = ['mempalace', 'status', '--palace', str(PALACE_PATH)]
      result = subprocess.run(cmd, cwd=str(PALACE_PATH), capture_output=True, text=True)
      return json.dumps({'result': result.stdout.strip()})
    
    return json.dumps({'error': f'Unknown tool: {tool}'})
  except Exception as e:
    return json.dumps({'error': str(e)})

if __name__ == '__main__':
  print('MCP MemPalace ready', flush=True)
  for line in sys.stdin:
    response = handle_request(line)
    print(response, flush=True)