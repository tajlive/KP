#!/usr/bin/env python3
"""Laster opp bilde til LinkedIn composer via DataTransfer-injeksjon (shadow DOM-safe)."""
import base64, json, time, urllib.request

DAEMON = "http://127.0.0.1:10086/command"
SESSION = "linkedin-post"
IMG = "/Users/taj/klarpakke/linkedin_skoeske_illustrasjon.png"
CHUNK = 90000

def cmd(action, args):
    body = json.dumps({"action": action, "args": args, "session": SESSION}).encode()
    req = urllib.request.Request(DAEMON, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

b64 = base64.b64encode(open(IMG, "rb").read()).decode()
chunks = [b64[i:i + CHUNK] for i in range(0, len(b64), CHUNK)]
print(f"b64: {len(b64)} tegn i {len(chunks)} chunks")

# Nullstill buffer
print(cmd("evaluate", {"code": "window.__b64=''; 'reset'"}))
for i, c in enumerate(chunks):
    res = cmd("evaluate", {"code": f"window.__b64+='{c}'; window.__b64.length"})
    if i % 10 == 0 or i == len(chunks) - 1:
        print(f"chunk {i+1}/{len(chunks)}: len={res.get('data',{}).get('value')}")

inject_js = """
(()=>{
  const bin = atob(window.__b64);
  const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  const file = new File([bytes], 'linkedin_skoeske_illustrasjon.png', {type:'image/png'});
  const dt = new DataTransfer();
  dt.items.add(file);
  let input=null;
  const walk=(r)=>{r.querySelectorAll('*').forEach(el=>{if(el.shadowRoot)walk(el.shadowRoot);});
    r.querySelectorAll('input[type=file]').forEach(i=>{if(i.accept.includes('image'))input=i;});};
  walk(document);
  if(!input) return 'no-input';
  input.files = dt.files;
  input.dispatchEvent(new Event('change',{bubbles:true}));
  input.dispatchEvent(new Event('input',{bubbles:true}));
  return JSON.stringify({ok:true, files:input.files.length, size:file.size});
})()
"""
print("inject:", cmd("evaluate", {"code": inject_js}))
time.sleep(3)

check_js = """
(()=>{
  const imgs=[...document.querySelectorAll('.share-creation-state img, [class*=media] img, [class*=editor] img')].map(i=>i.src.slice(0,60));
  const txt=document.body.innerText.includes('Edit image')||document.body.innerText.includes('Alt');
  return JSON.stringify({mediaImgs:imgs.slice(0,5), editorHint:txt});
})()
"""
print("check:", cmd("evaluate", {"code": check_js}))
