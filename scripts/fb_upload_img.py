#!/usr/bin/env python3
"""Laster opp bilde i FB-composer via DataTransfer-injeksjon."""
import base64, json, time, urllib.request

DAEMON = "http://127.0.0.1:10086/command"
SESSION = "facebook-meta"
IMG = "/Users/taj/klarpakke/linkedin_skoeske_illustrasjon.png"
CHUNK = 90000

def cmd(action, args):
    body = json.dumps({"action": action, "args": args, "session": SESSION}).encode()
    req = urllib.request.Request(DAEMON, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

# 1. Klikk Foto/video-knappen i dialogen
click_js = """
(()=>{
  const dlg=document.querySelector('[role=dialog]');
  if(!dlg) return 'no-dialog';
  const btns=[...dlg.querySelectorAll('[role=button], button')];
  const photo=btns.find(b=>/foto|photo|bilde|image/i.test((b.getAttribute('aria-label')||'')+' '+(b.innerText||'')));
  if(!photo) return 'no-photo-btn: '+btns.map(b=>b.getAttribute('aria-label')).filter(Boolean).slice(0,10).join('|');
  photo.click();
  return 'clicked';
})()
"""
print("foto-btn:", cmd("evaluate", {"code": click_js}).get("data", {}).get("value"))
time.sleep(2)

# 2. Last b64 til window.__b64
b64 = base64.b64encode(open(IMG, "rb").read()).decode()
chunks = [b64[i:i + CHUNK] for i in range(0, len(b64), CHUNK)]
cmd("evaluate", {"code": "window.__b64=''; 'reset'"})
for i, c in enumerate(chunks):
    cmd("evaluate", {"code": f"window.__b64+='{c}'; window.__b64.length"})
print(f"b64 klar ({len(chunks)} chunks)")

# 3. Injiser i file input
inject_js = """
(()=>{
  const inputs=[...document.querySelectorAll('input[type=file]')].filter(i=>(i.accept||'').includes('image'));
  if(!inputs.length) return 'no-input';
  const input=inputs[inputs.length-1];
  const bin=atob(window.__b64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  const file=new File([bytes],'skoeske.png',{type:'image/png'});
  const dt=new DataTransfer();
  dt.items.add(file);
  input.files=dt.files;
  input.dispatchEvent(new Event('change',{bubbles:true}));
  return JSON.stringify({ok:true,files:input.files.length});
})()
"""
print("inject:", cmd("evaluate", {"code": inject_js}).get("data", {}).get("value"))
time.sleep(5)

# 4. Sjekk preview
check_js = """
(()=>{
  const dlg=document.querySelector('[role=dialog]');
  if(!dlg) return 'dialog gone';
  const imgs=[...dlg.querySelectorAll('img')].map(i=>i.src.slice(0,30));
  const postBtn=[...dlg.querySelectorAll('[role=button]')].some(b=>/del|post|share|publiser/i.test(b.innerText||''));
  return JSON.stringify({imgCount:imgs.length,postBtn});
})()
"""
print("check:", cmd("evaluate", {"code": check_js}).get("data", {}).get("value"))
