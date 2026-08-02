;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="85652d16-3cbd-e27f-af3f-60d883980c34")}catch(e){}}();
module.exports=[420464,856911,234135,257859,e=>{"use strict";var t=e.i(50377);let r=null,i=null;async function n(){if(r)return r;try{return r=await import("opik")}catch(e){return t.logger.warn("[Opik] Kunne ikke laste Opik SDK"),null}}class a{static instance=null;initialized=!1;initializing=!1;projectName="klarpakke-ai-signals";static getInstance(){return a.instance||(a.instance=new a),a.instance}async initialize(){if(this.initialized||this.initializing)return;this.initializing=!0;let e=process.env.OPIK_API_KEY;if(!e){t.logger.debug("[Opik] OPIK_API_KEY ikke satt - tracing deaktivert"),this.initializing=!1;return}try{let r=await n();if(!r){this.initializing=!1;return}i=new r.Opik({apiKey:e,projectName:this.projectName}),this.initialized=!0,t.logger.info(`[Opik] Klient initialisert for prosjekt: ${this.projectName}`)}catch(e){t.logger.error("[Opik] Feil ved initialisering:",e),this.initialized=!1}finally{this.initializing=!1}}isInitialized(){return this.initialized&&null!==i}startTrace(e){if(this.initialized||this.initializing||this.initialize().catch(()=>{}),!i||!this.initialized)return null;try{return i.trace({name:e.name,input:e.input?JSON.stringify(e.input):void 0,tags:e.tags||[],metadata:e.metadata?JSON.stringify({...e.metadata,environment:"production",timestamp:new Date().toISOString()}):void 0}),{id:`${e.name}_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,name:e.name}}catch(e){return t.logger.error("[Opik] Feil ved start av trace:",e),null}}endTrace(e,r){if(e&&i&&this.initialized)try{t.logger.debug(`[Opik] Trace ${e} avsluttet`,{hasOutput:!!r.output,hasError:!!r.error})}catch(e){t.logger.error("[Opik] Feil ved avslutting av trace:",e)}}}let s=a.getInstance(),o=process.env.PERPLEXITY_API_KEY||process.env.SONAR_API_KEY||"",l=process.env.SONAR_API_BASE_URL||"https://api.perplexity.ai",c={sonar:"sonar","sonar-pro":"sonar-pro"};function d(e){return c[e]}let m={low:"low",medium:"medium",high:"high"};function u(e){return m[e]}function g(e){return e?Math.min(e,12e4):3e4}let k={maxRetries:3,baseDelayMs:1e3,maxDelayMs:1e4,retryableStatusCodes:[408,429,500,502,503,504]};function h(e,t=k){return Math.min(t.baseDelayMs*Math.pow(2,e),t.maxDelayMs)+1e3*Math.random()}let p={sonar:{tokensPerMinute:100,burstSize:10},"sonar-pro":{tokensPerMinute:50,burstSize:5}};function f(){return o?(o.startsWith("pplx-")||t.logger.warn('[Sonar] API key does not start with expected "pplx-" prefix'),{valid:!0}):{valid:!1,error:"PERPLEXITY_API_KEY or SONAR_API_KEY environment variable is required"}}let y={NARRATIVE_SCAN:e=>`
Du er en finansiell analytiker som skal analysere nyheter og narrativet rundt kryptovalutaen ${e}.

INSTRUKSJONER:
1. S\xf8k i \xe5pne webkilder (nyheter, bloggposter, offentlige data) for informasjon om ${e} fra de siste 12-24 timer
2. Fokuser p\xe5 de viktigste driverne som p\xe5virker prisen
3. Returner KUN gyldig JSON som matcher det eksakte skjemaet nedenfor
4. Inkluder kilder med tittel og URL
5. Vurder sentiment fra -1 (sv\xe6rt negativt) til 1 (sv\xe6rt positivt)
6. Vurder event_risk fra 0 (ingen risiko) til 1 (ekstrem risiko)

RETURNSKJEMA:
{
  "symbol": "${e}",
  "sentiment": 0.5,
  "event_risk": 0.3,
  "key_events": [
    { "title": "Kort beskrivelse av hendelsen", "impact": "low|medium|high" }
  ],
  "reasoning_excerpt": "Kort oppsummering av analysen (maks 200 tegn)",
  "sources": [
    { "title": "Kildenavn", "url": "https://..." }
  ]
}

VIKTIG:
- Bruk KUN \xe5pne, offentlige kilder
- IKKE inkluder personlige data (PII)
- Sentiment m\xe5 v\xe6re ett av: -1, -0.5, 0, 0.5, 1
- Impact m\xe5 v\xe6re ett av: "low", "medium", "high"
- JSON m\xe5 v\xe6re gyldig og komplett
`,REGIME_SCAN:`
Du er en makroanalytiker som skal vurdere det overordnede markedsregimet for kryptovaluta-markedet.

INSTRUKSJONER:
1. Analyser hele kryptomarkedet (ikke \xe9n spesifikk coin)
2. Vurder om vi er i: bull (oppgang), bear (nedgang), range (sideways), eller unclear (uklart)
3. Identifiser hoveddrivere og risikofaktorer
4. Returner KUN gyldig JSON som matcher skjemaet nedenfor

RETURNSKJEMA:
{
  "regime": "bull|bear|range|unclear",
  "confidence": 0.75,
  "reasoning_excerpt": "Kort begrunnelse for regime-vurderingen (maks 200 tegn)",
  "risk_flags": ["regulatory_crackdown", "exchange_risk", "liquidity_concern"],
  "sources": [
    { "title": "Kildenavn", "url": "https://..." }
  ]
}

VIKTIG:
- Regime m\xe5 v\xe6re ett av: "bull", "bear", "range", "unclear"
- Confidence m\xe5 v\xe6re 0-1
- Risk_flags er valgfri liste med risikofaktorer
- JSON m\xe5 v\xe6re gyldig og komplett
`,EXPLAIN_SIGNAL:e=>`
Du er en pedagogisk investeringsveileder for Klarpakke Universitet. Forklar et trading-signal p\xe5 en enkel m\xe5te for en norsk sm\xe5sparere med lav teknisk kompetanse.

SIGNALEINFO:
- Symbol: ${e.symbol}
- Tidsramme: ${e.timeframe}
- Anbefaling: ${e.decision}
- Score: ${e.score}/100
- Risikoniv\xe5: ${e.risk_level}/5
- Brukerens risikoprofil: ${e.userRiskProfile}

FAKTORER:
${Object.entries(e.factors).map(([e,t])=>`- ${e}: ${t.toFixed(2)}`).join("\n")}

INSTRUKSJONER:
1. Bruk enkel, forst\xe5elig norsk (ikke fagsjargong)
2. V\xe6r n\xf8ktern - ikke overdriv eller hype
3. Inkluder alltid en risikoadvarsel
4. Presiser at historisk avkastning ikke garanterer fremtidig resultat
5. Returner KUN gyldig JSON

RETURNSKJEMA:
{
  "title": "Kort, beskrivende tittel p\xe5 signalet",
  "summary": "2-4 setninger med lettlest forklaring",
  "key_points": [
    "Viktig poeng 1",
    "Viktig poeng 2"
  ],
  "risk_warnings": [
    "Tydelig risikoadvarsel 1",
    "Tydelig risikoadvarsel 2"
  ],
  "sources": [
    { "title": "Kildenavn", "url": "https://..." }
  ]
}

VIKTIG:
- Hold tittelen under 60 tegn
- Summary skal v\xe6re forst\xe5elig for noen uten trading-erfaring
- Alltid inkluder minst \xe9n risikoadvarsel om at trading er risikofullt
- JSON m\xe5 v\xe6re gyldig og komplett
`,MARKET_SENTIMENT:e=>`
Du er en finansiell nyhetsanalytiker for en krypto trading-plattform. Analyser SISTE NYHETER for ${e.symbol} fra de siste 12-24 timer.

OPPGAVE:
1. S\xf8k i \xe5pne webkilder etter nyheter om ${e.symbol}
2. Vurder om nyhetene er: POSITIVE (kan kj\xf8pe), NEUTRALE (hold), eller NEGATIVE (unng\xe5)
3. Returner KUN gyldig JSON med strukturen nedenfor

RETURNSKJEMA:
{
  "symbol": "${e.symbol}",
  "recommendation": "buy|hold|avoid",
  "confidence": 0.85,
  "sentiment_score": 0.3,
  "news_count": 12,
  "key_headlines": [
    "Kort oppsummering av viktig nyhet 1",
    "Kort oppsummering av viktig nyhet 2"
  ],
  "reasoning_excerpt": "Kort begrunnelse for anbefalingen (maks 150 tegn)",
  "sources": [
    { "title": "Kildenavn", "url": "https://..." }
  ],
  "risk_flags": ["regulatory_concern", "exchange_issue"]
}

FELT-BESKRIVELSER:
- recommendation: "buy" hvis nyheter er positive, "hold" hvis n\xf8ytrale/usikre, "avoid" hvis negative
- confidence: 0.0 til 1.0 (hvor sikker er du p\xe5 anbefalingen)
- sentiment_score: -1.0 (veldig negativt) til 1.0 (veldig positivt)
- news_count: antall relevante nyheter funnet
- key_headlines: opptil 3 viktige nyhetshodesett
- risk_flags: valgfri liste med risikofaktorer (f.eks. "hack", "regulatory", "liquidity")

VIKTIG:
- Bruk KUN \xe5pne, offentlige kilder
- IKKE inkluder personlige data (PII)
- recommendation M\xc5 v\xe6re \xe9n av: "buy", "hold", "avoid"
- H\xf8y confidence (>0.7) med "avoid" vil BLOKKERE trades automatisk
- JSON m\xe5 v\xe6re gyldig og komplett
`};e.s(["DEFAULT_CACHE_CONFIG",0,{regimeTtlMs:144e5,explanationTtlMs:18e5,narrativeTtlMs:72e5},"DEFAULT_RETRY_CONFIG",0,k,"FALLBACK_VALUES",0,{narrative_sentiment:0,event_risk:0,market_regime:"unclear"},"PROMPT_TEMPLATES",0,y,"RATE_LIMIT_CONFIG",0,p,"SONAR_API_BASE_URL",0,l,"SONAR_API_KEY",0,o,"calculateBackoff",0,h,"getModelForTier",0,d,"getSearchContextForMode",0,u,"getTimeout",0,g,"validateConfig",0,f],856911);class v extends Error{code;statusCode;retryable;constructor(e,t,r,i=!1){super(e),this.code=t,this.statusCode=r,this.retryable=i,this.name="SonarError"}}e.s(["SonarError",0,v,"SonarValidationError",0,class extends v{constructor(e){super(e,"VALIDATION_ERROR",void 0,!1),this.name="SonarValidationError"}}],234135);let _=e=>new Promise(t=>setTimeout(t,e));class R{buckets=new Map;constructor(){Object.keys(p).forEach(e=>{this.buckets.set(e,{tokens:p[e].burstSize,lastRefill:Date.now()})})}consume(e){let t=this.buckets.get(e);if(!t)return{allowed:!1,remaining:0};let r=p[e],i=Date.now(),n=(i-t.lastRefill)/6e4*r.tokensPerMinute;return(t.tokens=Math.min(r.burstSize,t.tokens+n),t.lastRefill=i,t.tokens>=1)?(t.tokens-=1,{allowed:!0,remaining:Math.floor(t.tokens)}):{allowed:!1,remaining:0}}getTimeUntilNextToken(e){return this.buckets.get(e)?Math.ceil(6e4/p[e].tokensPerMinute):0}}let E=new R,w=new class{metrics={callsTotal:0,callsByTier:{sonar:0,"sonar-pro":0},callsByMode:{low:0,medium:0,high:0},errorsTotal:0,cacheHits:0,cacheMisses:0,averageLatencyMs:0};latencies=[];recordCall(e,t,r){this.metrics.callsTotal++,this.metrics.callsByTier[e]++,this.metrics.callsByMode[t]++,this.latencies.push(r),this.latencies.length>100&&this.latencies.shift(),this.metrics.averageLatencyMs=this.latencies.reduce((e,t)=>e+t,0)/this.latencies.length}recordError(){this.metrics.errorsTotal++}recordCacheHit(){this.metrics.cacheHits++}recordCacheMiss(){this.metrics.cacheMisses++}getMetrics(){return{...this.metrics}}reset(){this.metrics={callsTotal:0,callsByTier:{sonar:0,"sonar-pro":0},callsByMode:{low:0,medium:0,high:0},errorsTotal:0,cacheHits:0,cacheMisses:0,averageLatencyMs:0},this.latencies=[]}};async function S(e,t){let r=f();if(!r.valid)throw new v(r.error||"Invalid configuration","API_ERROR",void 0,!1);let i=d(t.tier),n=u(t.mode),a=g(t.timeoutMs),s=new AbortController,c=setTimeout(()=>s.abort(),a);try{let t=await fetch(`${l}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},body:JSON.stringify({model:i,messages:[{role:"user",content:e}],search_context:n}),signal:s.signal});if(clearTimeout(c),!t.ok){let e=await t.text().catch(()=>"Unknown error"),r=k.retryableStatusCodes.includes(t.status);throw new v(`Sonar API error: ${t.status} - ${e}`,429===t.status?"RATE_LIMIT":"API_ERROR",t.status,r)}return await t.json()}catch(e){if(clearTimeout(c),e instanceof v)throw e;if(e instanceof Error){if("AbortError"===e.name)throw new v("Request timed out","TIMEOUT",void 0,!0);throw new v(`Network error: ${e.message}`,"NETWORK_ERROR",void 0,!0)}throw new v("Unknown error occurred","API_ERROR",void 0,!1)}}async function T(e,r){let i=s.startTrace({name:"callSonar",input:{prompt:e.slice(0,1e3),tier:r.tier,mode:r.mode,jsonMode:r.jsonMode},tags:["trading",r.tier,r.mode]});if(!E.consume(r.tier).allowed){let e=E.getTimeUntilNextToken(r.tier),t=new v(`Rate limit exceeded. Try again in ${Math.ceil(e/1e3)}s`,"RATE_LIMIT",429,!0);throw s.endTrace(i?.id||null,{error:`${t.code}: ${t.message}`,metadata:{rateLimited:!0,waitMs:e,exceptionType:t.code}}),t}let n=Date.now(),a=null;for(let o=0;o<=k.maxRetries;o++)try{let a=await S(e,r),l=a.choices[0]?.message?.content;if(!l)throw new v("Empty response from Sonar API","API_ERROR",void 0,!1);let c=Date.now()-n;return w.recordCall(r.tier,r.mode,c),t.logger.debug(`[Sonar] Request succeeded - tier: ${r.tier}, mode: ${r.mode}, latency: ${c}ms`),s.endTrace(i?.id||null,{output:{content:l.slice(0,1e3),model:a.model,usage:a.usage},metadata:{latencyMs:c,tier:r.tier,mode:r.mode,attempts:o+1}}),l}catch(e){if(e instanceof v){if(a=e,!e.retryable||o===k.maxRetries)break;let r=h(o);t.logger.warn(`[Sonar] Request failed (attempt ${o+1}/${k.maxRetries+1}), retrying in ${r}ms: ${e.message}`),await _(r)}else{a=new v(String(e),"API_ERROR",void 0,!1);break}}throw w.recordError(),t.logger.error(`[Sonar] Request failed after ${k.maxRetries+1} attempts. Error: ${a?.message}, Code: ${a?.code}, Tier: ${r.tier}, Mode: ${r.mode}`),s.endTrace(i?.id||null,{error:a?`${a.code}: ${a.message}`:"API_ERROR: Unknown error after retries",metadata:{errorCode:a?.code,attempts:k.maxRetries+1,tier:r.tier,mode:r.mode}}),a||new v("Unknown error after retries","API_ERROR",void 0,!1)}async function x(){let e=f();return e.valid?{healthy:!0}:{healthy:!1,error:e.error}}async function I(e,t){let{tier:r="sonar-pro",mode:i="high",useCache:n=!0}=t||{};if(n){var a;let t=await A(e);if(t&&(a=t.timestamp,Date.now()-a<9e5))return t.data}let s=y.MARKET_SENTIMENT({symbol:e}),o=function(e,t){try{var r,i,n;let a,s,o=JSON.parse(e),l=(r=o.recommendation,"string"==typeof r&&["buy","hold","avoid"].includes(r)?r:"hold"),c=(i=o.confidence,a="number"==typeof i?i:parseFloat(i),!isNaN(a)&&a>=0&&a<=1?a:.5);return{symbol:o.symbol||t.toUpperCase(),recommendation:l,confidence:c,sentiment_score:(n=o.sentiment_score,s="number"==typeof n?n:parseFloat(n),!isNaN(s)&&s>=-1&&s<=1?s:0),news_count:o.news_count??0,key_headlines:o.key_headlines||[],reasoning_excerpt:o.reasoning_excerpt||"",sources:o.sources||[],risk_flags:o.risk_flags||[],analyzed_at:new Date().toISOString()}}catch(e){return{symbol:t.toUpperCase(),recommendation:"hold",confidence:.5,sentiment_score:0,news_count:0,key_headlines:[],reasoning_excerpt:"Failed to parse sentiment response",sources:[],risk_flags:["parse_error"],analyzed_at:new Date().toISOString()}}}(await T(s,{tier:r,mode:i,jsonMode:!0}),e);return n&&await b(e,o),o}async function A(t){try{let{createServerClient:r}=await e.A(26551),i=await r(),{data:n,error:a}=await i.from("sonar_sentiment_cache").select("sentiment_data, created_at").eq("symbol",t.toUpperCase()).single();if(a||!n)return null;return{data:n.sentiment_data,timestamp:new Date(n.created_at).getTime()}}catch(e){return null}}async function b(t,r){try{let{createServerClient:i}=await e.A(26551),n=await i();await n.from("sonar_sentiment_cache").upsert({symbol:t.toUpperCase(),sentiment_data:r,recommendation:r.recommendation,confidence:r.confidence,created_at:new Date().toISOString()},{onConflict:"symbol"})}catch(e){}}e.s(["callSonar",0,T,"checkSonarHealth",0,x],257859),e.s(["getMarketSentiment",0,I],420464)}];

//# debugId=85652d16-3cbd-e27f-af3f-60d883980c34
//# sourceMappingURL=src_lib_ai_sonar_marketSentiment_ts_19h4-rz._.js.map