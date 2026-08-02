#!/usr/bin/env python3
"""Fyller LinkedIn-composeren (Quill i shadow DOM) linje for linje via trusted CDP."""
import json, time, urllib.request

DAEMON = "http://127.0.0.1:10086/command"
SESSION = "linkedin-post"
TEXT = open("/Users/taj/klarpakke/linkedin_kortversjon.txt").read().strip()

def cmd(action, args):
    body = json.dumps({"action": action, "args": args, "session": SESSION}).encode()
    req = urllib.request.Request(DAEMON, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# 1. Fokuser ql-editor inne i shadow root
focus_js = (
    "(()=>{let ed=null;const walk=(r)=>{r.querySelectorAll('*').forEach(el=>{"
    "if(el.shadowRoot)walk(el.shadowRoot);"
    "if(el.classList&&el.classList.contains('ql-editor'))ed=el;});};"
    "walk(document);if(!ed)return 'no-editor';ed.focus();"
    "return JSON.stringify({ok:true,blank:ed.classList.contains('ql-blank')})})()"
)
print("focus:", cmd("evaluate", {"code": focus_js}))
time.sleep(0.5)

# 2. Skriv linje for linje med ekte Enter-tastetrykk
lines = TEXT.split("\n")
for i, line in enumerate(lines):
    if line.strip():
        res = cmd("cdp", {"method": "Input.insertText", "params": {"text": line}})
        if not res.get("ok"):
            print(f"line {i} insertText FAIL: {res}")
    for t in ("rawKeyDown", "keyUp"):
        cmd("cdp", {"method": "Input.dispatchKeyEvent", "params": {
            "type": t, "key": "Enter", "code": "Enter",
            "windowsVirtualKeyCode": 13, "nativeVirtualKeyCode": 13}})
    time.sleep(0.12)

print(f"skrev {len(lines)} linjer")
time.sleep(1)

# 3. Verifiser innholdet
verify_js = (
    "(()=>{let ed=null;const walk=(r)=>{r.querySelectorAll('*').forEach(el=>{"
    "if(el.shadowRoot)walk(el.shadowRoot);"
    "if(el.classList&&el.classList.contains('ql-editor'))ed=el;});};"
    "walk(document);if(!ed)return 'no-editor';"
    "const t=ed.innerText;return JSON.stringify({len:t.length,head:t.slice(0,80),tail:t.slice(-80)})})()"
)
print("verify:", cmd("evaluate", {"code": verify_js}))
