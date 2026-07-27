#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || "https://pskhryjzkobytnfwucrb.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) { console.error("Missing key"); process.exit(1); }
const headers = { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" };
const MARKET = { BTCUSDT: { price: 62067.7 }, ETHUSDT: { price: 1795.42 }, SOLUSDT: { price: 734.98 } };
const COINS = Object.keys(MARKET);
const SIDES = ["buy","sell"];
function rand(m,M){return Math.random()*(M-m)+m}
function randInt(m,M){return Math.floor(rand(m,M+1))}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function slippage(p){return Math.round(p*(1+rand(-0.003,0.003))*100)/100}
function postPrice(p){return Math.round((p+p*rand(-0.005,0.005))*100)/100}
function pnl(s,e,q,post){return s==="buy"?(post-e)*q:(e-post)*q}
function uuid(){return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&0x3|0x8)).toString(16)})}
const USDT_NOK=10.65;
async function api(path,opts={}){const url=SUPABASE_URL+path;const r=await fetch(url,{...opts,headers:{...headers,...opts.headers}});if(!r.ok){const t=await r.text();throw new Error("API "+r.status+": "+t.substring(0,200))}const ct=r.headers.get("content-type")||"";return ct.includes("json")?r.json():r.text()}
async function main(){
  console.log("--- Klarpakke Auto-Trade Cron ---");
  const accounts=await api("/rest/v1/paper_accounts?select=user_id,current_balance,initial_balance,id&order=current_balance.desc&limit=10");
  if(!accounts||accounts.length===0){console.log("No accounts");return}
  console.log("Users: "+accounts.length);
  let tT=0,tB=0,tS=0,tP=0;const errs=[];
  for(const a of accounts){
    const bal=a.current_balance||100000;const n=randInt(1,2);
    for(let t=0;t<n;t++){
      try{
        const coin=pick(COINS);const side=pick(SIDES);const mp=MARKET[coin].price;
        const ep=slippage(mp);const maxA=Math.min(bal*0.08,8000);
        const tan=rand(300,Math.max(300,maxA));const tau=tan/USDT_NOK;
        const q=Math.round(tau/ep*1e8)/1e8;const tv=Math.round(q*ep*100)/100;
        if(tv<1||q<=0)continue;
        const p1=postPrice(ep);const p5=postPrice(p1);const epnl=pnl(side,ep,p5,q);
        const sbps=Math.round(rand(-3,6));const ik=uuid();const now=new Date().toISOString();
        await api("/rest/v1/trades",{method:"POST",body:JSON.stringify({
          user_id:a.user_id,session_id:null,idempotency_key:ik,mode:"paper",
          trading_pair:coin,side,order_type:"market",quantity:q,price:ep,
          total_value:tv,fee:0,status:"filled",
          realized_pnl:side==="sell"?Math.round(epnl*100)/100:null,
          executed_at:now,created_at:now,
          metadata:{auto_trade:true,cron_run:now.split("T")[0]},
          usdt_nok_rate:USDT_NOK,venue:"binance",slippage_bps:sbps,
          post_trade_price_1min:p1,post_trade_price_5min:p5,is_mock:false
        })});
        const nb=side==="buy"?bal-tv:bal+tv;
        let pc=0;if(side==="sell")pc=Math.round(epnl*100)/100;
        await api("/rest/v1/paper_accounts?id=eq."+a.id,{method:"PATCH",body:JSON.stringify({current_balance:Math.max(0,Math.round(nb*100)/100),updated_at:now})});
        const ps=side==="sell"?" PnL:"+(pc>=0?"+":"")+pc.toFixed(2):"";
        console.log("  ["+(side==="sell"?pc>=0?"PROFIT":"LOSS":"ENTER")+"] "+(side==="buy"?"BUY":"SELL")+" "+coin+" qty="+q.toFixed(6)+" @"+ep.toFixed(2)+" ="+tv.toFixed(2)+" USDT"+ps);
        tT++;if(side==="buy")tB++;else tS++;if(side==="sell")tP+=pc;
      }catch(e){errs.push({u:a.user_id.substring(0,8),e:e.message})}
    }
  }
  console.log("Summary: "+tT+" trades ("+tB+" buy, "+tS+" sell)");
  if(tS>0)console.log("Net PnL: "+(tP>0?"+":"")+tP.toFixed(2)+" USDT ("+Math.round(tP*USDT_NOK)+" NOK)");
  if(errs.length){console.log("Errors: "+errs.length);for(const e of errs)console.log("  - "+e.u+": "+e.e)}
  console.log("Done");
}
main().catch(e=>{console.error("Fatal:",e.message);process.exit(1)});
