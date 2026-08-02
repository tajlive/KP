#!/usr/bin/env python3
"""Fyller FB-composeren (Lexical) linje for linje via trusted CDP."""
import json, time, urllib.request

DAEMON = "http://127.0.0.1:10086/command"
SESSION = "facebook-meta"
TEXT = open("/Users/taj/klarpakke/fb-post-skeptiker.txt").read().strip()

def cmd(action, args):
    body = json.dumps({"action": action, "args": args, "session": SESSION}).encode()
    req = urllib.request.Request(DAEMON, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# Fokuser editoren på nytt (sikkerhet)
print("focus:", cmd("evaluate", {"code":
    "(()=>{const ed=document.querySelector('[role=dialog] [contenteditable=true]');if(!ed)return 'no-editor';ed.focus();return 'ok'})()"
}).get("data", {}).get("value"))
time.sleep(0.5)

lines = TEXT.split("\n")
for i, line in enumerate(lines):
    if line.strip():
        res = cmd("cdp", {"method": "Input.insertText", "params": {"text": line}})
        if not res.get("ok"):
            print(f"line {i} FAIL: {res}")
    for t in ("rawKeyDown", "keyUp"):
        cmd("cdp", {"method": "Input.dispatchKeyEvent", "params": {
            "type": t, "key": "Enter", "code": "Enter",
            "windowsVirtualKeyCode": 13, "nativeVirtualKeyCode": 13}})
    time.sleep(0.12)

print(f"skrev {len(lines)} linjer")
time.sleep(1)
print("verify:", cmd("evaluate", {"code":
    "(()=>{const ed=document.querySelector('[role=dialog] [contenteditable=true]');if(!ed)return 'gone';const t=ed.innerText;return JSON.stringify({len:t.length,head:t.slice(0,60),tail:t.slice(-60)})})()"
}).get("data", {}).get("value"))
