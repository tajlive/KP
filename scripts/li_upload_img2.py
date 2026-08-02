#!/usr/bin/env python3
"""Klikk Add media -> finn file input -> injiser bilde via DataTransfer."""
import json, time, urllib.request

DAEMON = "http://127.0.0.1:10086/command"
SESSION = "linkedin-post"

def cmd(action, args):
    body = json.dumps({"action": action, "args": args, "session": SESSION}).encode()
    req = urllib.request.Request(DAEMON, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

# Sjekk at b64-buffer fortsatt finnes
chk = cmd("evaluate", {"code": "String(window.__b64 ? window.__b64.length : 0)"})
print("b64-buffer:", chk.get("data", {}).get("value"))

# 1. Klikk Add media (shadow DOM-sikker)
click_js = """
(()=>{
  let btn=null;
  const walk=(r)=>{
    r.querySelectorAll('button').forEach(b=>{
      if((b.getAttribute('aria-label')||'')==='Add media') btn=b;
    });
    r.querySelectorAll('*').forEach(el=>{ if(el.shadowRoot) walk(el.shadowRoot); });
  };
  walk(document);
  if(!btn) return 'no-btn';
  btn.click();
  return 'clicked';
})()
"""
print("addmedia:", cmd("evaluate", {"code": click_js}).get("data", {}).get("value"))
time.sleep(2)

# 2. Finn input og injiser
inject_js = """
(()=>{
  let input=null;
  const walk=(r)=>{
    r.querySelectorAll('input[type=file]').forEach(i=>{ if((i.accept||'').includes('image')) input=i; });
    r.querySelectorAll('*').forEach(el=>{ if(el.shadowRoot) walk(el.shadowRoot); });
  };
  walk(document);
  if(!input) return 'no-input';
  const bin = atob(window.__b64);
  const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  const file = new File([bytes], 'linkedin_skoeske_illustrasjon.png', {type:'image/png'});
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change',{bubbles:true}));
  return JSON.stringify({ok:true, files:input.files.length});
})()
"""
print("inject:", cmd("evaluate", {"code": inject_js}).get("data", {}).get("value"))
time.sleep(4)

# 3. Sjekk om media-editor / preview dukket opp
check_js = """
(()=>{
  const bodyTxt=document.body.innerText;
  return JSON.stringify({
    editImage: /Edit image|Rediger bilde/i.test(bodyTxt),
    altText: /Alternative text|alt.?text/i.test(bodyTxt),
    next: /\\bNext\\b|\\bNest\\b/i.test(bodyTxt)
  });
})()
"""
print("check:", cmd("evaluate", {"code": check_js}).get("data", {}).get("value"))
