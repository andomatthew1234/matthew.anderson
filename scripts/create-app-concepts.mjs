// Original fictional interface studies for the Apps page. No real client or financial data.
// Run with node scripts/create-app-concepts.mjs. Set PLAYWRIGHT_MODULE for another installation.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "file:///C:/Users/muman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/apps");
await mkdir(output, { recursive: true });

const icon = (name, size = 20) => {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    chat: '<path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z"/><path d="M8 10h8m-8 4h5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M10 22h4"/>',
    arrow: '<path d="M6 18 18 6M6 6h12v12"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    arrowRight: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 2v6M16 2v6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
    chart: '<path d="M4 20V10m8 10V4m8 16v-7"/>',
    folder: '<path d="M3 6h7l2 3h9v12H3z"/>',
    swap: '<path d="M4 7h16l-4-4M20 17H4l4 4"/>',
    play: '<path d="m8 4 12 8-12 8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    plant: '<path d="M12 22V9M12 16C3 16 3 7 3 7s9 0 9 9ZM12 10c0-7 9-8 9-8s0 9-9 8Z"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
};

const nav = (items, active = 0) => `<nav class="bottom-nav">${items.map(([name, glyph], i) => `<div class="${i === active ? "active" : ""}">${icon(glyph)}<span>${name}</span></div>`).join("")}</nav>`;
const top = (brand, right = icon("bell")) => `<header class="brand-row"><span class="brand">${brand}</span><span class="round-icon">${right}</span></header>`;
const line = (label, value, color = "") => `<div class="detail-line"><span>${label}</span><strong ${color ? `style="color:${color}"` : ""}>${value}</strong></div>`;
const avatar = (letters, color = "#d3dfc8") => `<span class="avatar" style="background:${color}">${letters}</span>`;
const css = `
  * { box-sizing:border-box; } html,body { margin:0; width:390px; height:844px; overflow:hidden; }
  body { color:var(--ink,#252924); background:var(--paper,#f5f3ed); font-family:Arial,Helvetica,sans-serif; font-size:14px; }
  .screen { height:844px; display:flex; flex-direction:column; position:relative; }
  .status { flex:none; height:48px; padding:17px 28px 0; display:flex; justify-content:space-between; align-items:flex-start; font-size:13px; font-weight:700; }
  .status svg { width:64px;height:13px; }
  main { flex:1; min-height:0; padding:10px 26px 0; }
  h1,h2,h3,p { margin:0; } h1 { font-family:Georgia,'Times New Roman',serif; font-size:37px; line-height:1.04; letter-spacing:-1.8px; font-weight:400; }
  h2 { font-size:16px; letter-spacing:-.3px; } p { line-height:1.5; }
  .muted { color:var(--muted,#747b71); } .small { font-size:12px; } .tiny { font-size:10px; } .eyebrow { font-size:10px; letter-spacing:1.8px; text-transform:uppercase; font-weight:700; }
  .brand-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:26px; }
  .brand { font-size:17px; letter-spacing:-.65px; font-weight:600; }
  .round-icon { display:grid; place-items:center; width:35px; height:35px; border:1px solid #20251d22; border-radius:50%; }
  .row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .section-label { display:flex; justify-content:space-between; align-items:center; margin:25px 0 15px; }
  .tag { display:inline-block; padding:7px 10px; background:#ffffff99; border-radius:25px; font-size:10px; font-weight:600; }
  .card { border-radius:20px; padding:21px; background:#e6e9df; }
  .detail-line { display:flex; align-items:center; justify-content:space-between; margin-top:15px; font-size:12px; }.detail-line strong { font-weight:500; }
  .bottom-nav { height:79px; flex:none; display:flex; align-items:flex-start; justify-content:space-around; padding:13px 20px 0; margin-top:10px; border-top:1px solid #2222220d; background:var(--paper,#f5f3ed); }
  .bottom-nav div { min-width:52px; display:flex; gap:5px; flex-direction:column; align-items:center; color:var(--muted,#747b71); font-size:9px; }.bottom-nav .active { color:var(--accent,#783631); }
  .home-indicator { position:absolute; bottom:8px; left:135px; width:120px; height:4px; border-radius:4px; background:currentColor; opacity:.8; }
  .avatar { width:36px; height:36px; flex:none; display:grid; place-items:center; border-radius:50%; color:#253c2c; font-size:12px;font-weight:600; }
  .button { display:flex; align-items:center; justify-content:center; gap:12px; border-radius:12px; background:var(--accent,#783631); color:white; padding:15px 18px; font-size:13px; }
  .rule { height:1px;background:#25292420;margin:20px 0; }
  .utility .brand-row { margin-bottom:20px; }
  .utility h1 { font-size:36px!important; }
  .utility .card { padding:17px 21px!important; margin-top:16px!important; }
  .utility .card .row { margin-top:12px!important; }
  .utility .card .row:first-child { margin-top:0!important; }
  .utility .section-label { margin-top:19px; margin-bottom:12px; }
  .messaging .brand-row { margin-bottom:20px; }
  .messaging h1 { font-size:34px; }
  .messaging .card { margin-top:14px!important; padding:18px!important; }
`;

const concepts = [
  {
    name:"customer-portal", theme:"--paper:#f5f2eb;--accent:#344e40;",
    body:`${top("fieldnotes.", avatar("JD"))}<p class="eyebrow muted">Your client space</p><h1 style="margin-top:12px">Good morning,<br>Jamie.</h1><p class="muted small" style="margin-top:12px">A little closer to something great.</p>
    <article class="card" style="background:#314b3e;color:#fcfbf5;margin-top:24px;position:relative;overflow:hidden"><div class="row"><span class="eyebrow" style="color:#bdccba">Your project</span><span class="tag" style="background:#ffffff18">In progress</span></div><h2 style="font-family:Georgia,serif;font-size:29px;font-weight:400;line-height:1.1;margin-top:30px">A new chapter<br>for your brand.</h2><div class="row" style="margin-top:27px;font-size:11px"><span>Design &amp; development</span><span>75%</span></div><div style="height:4px;background:#ffffff26;border-radius:4px;margin-top:10px"><div style="height:4px;width:75%;background:#dce9b7;border-radius:4px"></div></div></article>
    <div class="section-label"><h2>Up next</h2><span class="muted small">View all</span></div><div class="row" style="border-bottom:1px solid #25292420;padding-bottom:15px"><span class="round-icon">${icon("calendar")}</span><div style="flex:1"><strong class="small">Your design review</strong><p class="small muted" style="margin-top:5px">Thursday, 10:30 am</p></div>${icon("arrowRight",17)}</div>
    <div class="row" style="margin-top:18px"><span class="round-icon">${icon("folder")}</span><div style="flex:1"><strong class="small">Everything, in one place</strong><p class="small muted" style="margin-top:5px">6 files ready for you</p></div>${icon("arrowRight",17)}</div>
    <div class="row" style="margin-top:24px;padding:16px;border-radius:12px;background:#e8e7df">${avatar("MS","#d5d0c4")}<p class="small" style="flex:1">A note from your designer<br><span class="muted">“The first look is ready.”</span></p><span class="tiny muted">2h</span></div>`,
    nav:nav([["Home","home"],["Projects","grid"],["Messages","chat"],["Profile","user"]]),
  },
  {
    name:"login",theme:"--paper:#e7e3f0;--ink:#39313f;--accent:#413149;--muted:#79707e;",
    body:`${top("morrow",icon("plant"))}<div style="height:175px;position:relative;margin:5px 0 24px;display:grid;place-items:center"><svg viewBox="0 0 300 190" width="300" height="190"><ellipse cx="150" cy="155" rx="90" ry="13" fill="#493c5c" opacity=".07"/><path d="M147 155V53" stroke="#5a4c6c" stroke-width="2"/><path d="M147 122C60 123 69 48 69 48s81-2 78 74" fill="#b9adc9"/><path d="M148 95c-3-71 78-85 78-85s6 80-78 85" fill="#796889"/><path d="M147 155c-4-52 61-72 61-72s13 65-61 72" fill="#d2c7df"/><path d="m86 67 61 55m56-88-55 61m40 11-40 49" fill="none" stroke="#e9e3ef" stroke-width="1.2"/></svg></div><h1 style="font-size:38px;text-align:center">A little space<br>for your ideas.</h1><p class="small muted" style="text-align:center;margin-top:15px">Welcome back. Make room for what’s next.</p><div style="margin-top:29px"><div class="small" style="margin-bottom:9px">Email address</div><div style="padding:16px;border:1px solid #5d4c6730;border-radius:10px;font-size:13px;background:#ffffff22">hello@example.com</div><div class="row small" style="margin:17px 0 9px"><span>Password</span><span class="muted">Forgot password?</span></div><div class="row" style="padding:16px;border:1px solid #5d4c6730;border-radius:10px;background:#ffffff22"><span style="letter-spacing:3px">••••••••</span>${icon("lock",16)}</div><div class="button" style="margin-top:19px">Sign in ${icon("arrowRight",16)}</div><p class="small muted" style="text-align:center;margin-top:22px">New here? <span style="color:#413149">Make yourself at home</span></p></div>`,nav:"",
  },
  {
    name:"web-app",theme:"--paper:#f5f4ee;--accent:#6d7744;--muted:#777b6e;",
    body:`${top("daylight",icon("sun"))}<p class="eyebrow muted">Monday, 18 November</p><div class="row" style="margin-top:13px"><h1>Your day,<br>a little clearer.</h1><span style="font-size:38px;color:#8b9465">✳</span></div><div style="display:flex;justify-content:space-between;gap:7px;margin:27px 0"><div style="text-align:center;border-radius:30px;background:#37472b;color:#fff;padding:13px 12px;font-size:11px">M<br><strong style="display:block;margin-top:10px;font-size:17px">18</strong></div>${["T|19","W|20","T|21","F|22","S|23","S|24"].map(x=>`<div style="text-align:center;padding:13px 8px;color:#727a65;font-size:11px">${x.split("|")[0]}<strong style="display:block;margin-top:10px;font-size:17px;font-weight:400;color:#303b2a">${x.split("|")[1]}</strong></div>`).join("")}</div>
    <div class="card" style="background:#dee5c8;padding:23px"><div class="row"><span class="eyebrow">Make space to focus</span>${icon("sun",19)}</div><h2 style="font:30px Georgia,serif;letter-spacing:-1px;margin:18px 0 12px">One thing at a time.</h2><div class="row"><span class="small muted">Your next 25 minutes</span><span class="round-icon" style="background:#35452c;color:white;border:0">${icon("play",15)}</span></div></div>
    <div class="section-label"><h2>On your list</h2><span class="small muted">2 of 4 complete</span></div><div class="row" style="padding:13px 0;border-bottom:1px solid #20261b16"><span class="round-icon" style="width:22px;height:22px;background:#d9e1cd;border:0">${icon("check",12)}</span><span style="flex:1;text-decoration:line-through;color:#828777;font-size:13px">A slow start &amp; a good coffee</span></div><div class="row" style="padding:16px 0;border-bottom:1px solid #20261b16"><span class="round-icon" style="width:22px;height:22px"></span><span style="flex:1;font-size:13px">Finish the first draft</span><span class="tag" style="background:#ebe4d1">Work</span></div><div class="row" style="padding:16px 0"><span class="round-icon" style="width:22px;height:22px"></span><span style="flex:1;font-size:13px">Take the long way home</span><span class="tag" style="background:#e2e9dd">Life</span></div>`,nav:nav([["Today","sun"],["Plan","calendar"],["Notes","folder"],["You","user"]]),
  },
  {
    name:"utility",theme:"--paper:#1e2524;--ink:#f0f2e9;--accent:#d2e2b9;--muted:#a5afa6;",
    body:`${top("elsewhere",icon("globe"))}<p class="eyebrow muted">A pocketful of useful</p><h1 style="margin-top:14px;font-size:42px">Less figuring.<br>More exploring.</h1><div style="display:flex;gap:8px;margin-top:27px;font-size:11px"><span class="tag" style="background:#d2e2b9;color:#243026">Currency</span><span class="tag" style="background:#ffffff0c">Distance</span><span class="tag" style="background:#ffffff0c">Time zones</span></div><div class="card" style="background:#303b36;margin-top:23px;padding:23px"><div class="row"><span class="small muted">From</span><span class="small">Australian dollar</span></div><div class="row" style="margin-top:19px"><span style="font-size:40px;font-weight:400;letter-spacing:-2px">250.00</span><span class="tag" style="background:#ffffff12">AUD</span></div><div class="row" style="margin:19px 0"><span style="height:1px;background:#ffffff20;flex:1"></span><span class="round-icon" style="border-color:#ffffff30">${icon("swap",17)}</span><span style="height:1px;background:#ffffff20;flex:1"></span></div><div class="row"><span class="small muted">To</span><span class="small">Japanese yen</span></div><div class="row" style="margin-top:19px"><span style="font-size:40px;font-weight:400;letter-spacing:-2px;color:#d2e2b9">24,625</span><span class="tag" style="background:#ffffff12">JPY</span></div><p style="font-size:10px;color:#9eaca0;margin-top:18px">Illustrative exchange rate · 1 AUD = 98.50 JPY</p></div><div class="section-label"><h2 style="font-weight:400">Here &amp; there</h2>${icon("plus",18)}</div><div class="row" style="padding-bottom:19px;border-bottom:1px solid #ffffff20"><div><p style="font-size:14px">Melbourne</p><p class="small muted" style="margin-top:5px">Your home time</p></div><span style="font-size:25px;letter-spacing:-1px">10:41 <small style="font-size:11px;color:#a5afa6">AM</small></span></div><div class="row" style="padding-top:19px"><div><p style="font-size:14px">Tokyo</p><p class="small muted" style="margin-top:5px">2 hours behind</p></div><span style="font-size:25px;letter-spacing:-1px">08:41 <small style="font-size:11px;color:#a5afa6">AM</small></span></div>`,nav:nav([["Tools","grid"],["Places","globe"],["Saved","folder"],["Settings","user"]]),
  },
  {
    name:"dashboard",theme:"--paper:#f5f2ee;--accent:#77382f;--muted:#8a7c74;",
    body:`${top("form &amp; field",avatar("AL","#e1c5b8"))}<div class="row"><h1>Overview.</h1><span class="tag" style="background:#eae5de">This month ▾</span></div><p class="small muted" style="margin-top:12px">A good view of how things are growing.</p><div class="card" style="background:#e9ddd3;margin-top:27px;padding-bottom:17px"><div class="row"><span class="small muted">Total revenue</span>${icon("chart",19)}</div><div class="row" style="margin-top:14px"><span style="font-size:40px;letter-spacing:-2px">$12,840</span><span class="tag" style="background:#d8e1cc;color:#47603d">+18.6%</span></div><svg viewBox="0 0 292 105" width="292" height="105" style="display:block;margin-top:24px"><path d="M0 89H292M0 49H292M0 9H292" stroke="#8b776522" stroke-dasharray="3 4"/><path d="M0 91 22 79 43 85 67 66 91 72 114 57 137 63 158 41 182 49 206 26 229 33 251 18 272 24 292 5V105H0Z" fill="#8a493a" opacity=".08"/><path d="M0 91 22 79 43 85 67 66 91 72 114 57 137 63 158 41 182 49 206 26 229 33 251 18 272 24 292 5" fill="none" stroke="#854638" stroke-width="2.5"/><circle cx="292" cy="5" r="4" fill="#854638"/></svg><div class="row muted tiny" style="margin-top:10px"><span>1 NOV</span><span>15 NOV</span><span>30 NOV</span></div></div>
    <div class="row" style="margin-top:14px;gap:14px"><div class="card" style="flex:1;background:#e8e9e1;padding:18px"><p class="small muted">Orders</p><div style="font-size:29px;letter-spacing:-1px;margin:9px 0">148</div><span class="tiny" style="color:#5a6e46">↑ 12 this week</span></div><div class="card" style="flex:1;background:#eee5d9;padding:18px"><p class="small muted">Returning</p><div style="font-size:29px;letter-spacing:-1px;margin:9px 0">68%</div><span class="tiny" style="color:#5a6e46">↑ 8% this month</span></div></div><div class="section-label"><h2>Recent activity</h2><span class="small muted">See all</span></div><div class="row">${avatar("EK","#e6d4c2")}<div style="flex:1"><p class="small">A new order from Emma</p><p class="tiny muted" style="margin-top:6px">Order #1048 · just now</p></div><strong style="font-size:13px;font-weight:500">+$86.00</strong></div>`,nav:nav([["Overview","chart"],["Orders","folder"],["People","user"],["More","grid"]]),
  },
  {
    name:"messaging",theme:"--paper:#f5f1e9;--accent:#7b3731;--muted:#8b7e71;",
    body:`${top("together",icon("plus"))}<div class="row"><h1>Good things<br>start here.</h1><span class="tag" style="background:#e9dfd0">3 new</span></div><div class="row" style="margin:25px 0 22px;padding:13px 15px;border-radius:12px;background:#eae5da;color:#938779;justify-content:start;gap:10px">${icon("search",17)}<span class="small">Find a conversation</span></div><div style="display:flex;gap:11px;margin-bottom:25px"><span class="tag" style="background:#78382f;color:#fff">All messages</span><span class="tag" style="background:#e9e3d8">Your teams</span><span class="tag" style="background:#e9e3d8">Unread</span></div>
    <div class="row" style="padding-bottom:20px;border-bottom:1px solid #3c2a1917">${avatar("ST","#e3cbb6")}<div style="flex:1"><div class="row"><strong class="small">Studio team</strong><span class="tiny muted">9:38</span></div><p class="small muted" style="margin-top:8px">Alex: This is coming together beautifully.</p></div></div>
    <div class="card" style="background:#eae4da;margin-top:20px;padding:20px"><div class="row"><div class="row" style="gap:10px">${avatar("AL","#b9c5a6")}<div><strong class="small">Alex</strong><p class="tiny muted" style="margin-top:4px">Studio team</p></div></div>${icon("more",20)}</div><div style="margin-top:21px;padding:14px 16px;border-radius:14px 14px 14px 3px;background:#faf7f0;max-width:245px"><p style="font-size:13px;line-height:1.5">The first concepts are ready. I think you’re going to love this direction.</p><span class="tiny muted" style="display:block;margin-top:8px">9:34 am</span></div><div style="margin:14px 0 0 auto;padding:14px 16px;border-radius:14px 14px 3px 14px;background:#78382f;color:#fff8ee;max-width:224px"><p style="font-size:13px;line-height:1.5">This feels just right. Let’s make it happen!</p><span class="tiny" style="display:block;margin-top:8px;color:#ddbbb3">9:38 am · Read</span></div><div class="row" style="margin-top:22px;padding-top:15px;border-top:1px solid #3c2a1917;color:#988b7e"><span class="small">Write something good…</span><span class="round-icon" style="background:#78382f;color:#fff;border:0">${icon("arrowRight",16)}</span></div></div>`,nav:nav([["Messages","chat"],["People","user"],["Files","folder"],["You","home"]]),
  },
  {
    name:"payments",theme:"--paper:#edf0e9;--accent:#263f36;--muted:#788278;",
    body:`${top("pocket.",avatar("JD","#d6dfc9"))}<p class="eyebrow muted">A little more clarity</p><h1 style="margin-top:12px">Your money.<br>At a glance.</h1><div class="card" style="background:#2d483e;color:#f4f7ec;margin-top:26px;padding:24px;height:195px;position:relative;overflow:hidden"><svg width="210" height="210" viewBox="0 0 210 210" style="position:absolute;right:-82px;top:-25px;color:#adc49e;opacity:.2" fill="none" stroke="currentColor"><circle cx="105" cy="105" r="92"/><circle cx="105" cy="105" r="76"/><circle cx="105" cy="105" r="60"/><circle cx="105" cy="105" r="44"/></svg><div class="row"><span class="small" style="color:#c4d3bd">Available balance</span>${icon("card",22)}</div><div style="font-size:40px;letter-spacing:-1.5px;margin:18px 0 24px">$2,480<span style="font-size:24px;opacity:.6">.00</span></div><div class="row small" style="color:#c4d3bd"><span>•••• &nbsp; 4821</span><span>DEMO ACCOUNT</span></div></div><div class="row" style="margin-top:17px;gap:10px"><div class="button" style="flex:1;border-radius:10px;background:#dde5d3;color:#2e4635;padding:13px">${icon("arrow",16)} Send</div><div class="button" style="flex:1;border-radius:10px;background:#dde5d3;color:#2e4635;padding:13px">${icon("down",16)} Request</div><div class="button" style="border-radius:10px;background:#dde5d3;color:#2e4635;padding:13px">${icon("more",16)}</div></div><div class="section-label"><h2>Recent activity</h2><span class="small muted">See all</span></div>${[["sun","Morning coffee","Today, 8:42 am","−$5.50"],["folder","Studio payment","Yesterday","+$420.00"],["globe","Around the corner","Yesterday","−$28.00"]].map(([glyph,title,time,amount])=>`<div class="row" style="padding:13px 0;border-bottom:1px solid #23392812"><span class="round-icon" style="background:#e0e6d9;border:0">${icon(glyph,17)}</span><div style="flex:1"><p class="small">${title}</p><p class="tiny muted" style="margin-top:4px">${time}</p></div><span style="font-size:13px;color:${amount.startsWith("+")?"#63834b":"#2f3d32"}">${amount}</span></div>`).join("")}`,nav:nav([["Home","home"],["Activity","chart"],["Cards","card"],["Profile","user"]]),
  },
];

const status = '<div class="status"><span>9:41</span><svg viewBox="0 0 64 13" fill="currentColor"><rect x="0" y="8" width="3" height="5" rx=".7"/><rect x="5" y="6" width="3" height="7" rx=".7"/><rect x="10" y="3" width="3" height="10" rx=".7"/><rect x="15" y="0" width="3" height="13" rx=".7"/><path d="M24 4q8-7 16 0l-2 2q-6-5-12 0Zm4 4q4-4 8 0l-4 5Z"/><rect x="45" y="2" width="16" height="9" rx="2" fill="none" stroke="currentColor"/><rect x="47" y="4" width="12" height="5" rx="1"/><rect x="62" y="5" width="2" height="3" rx=".5"/></svg></div>';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const concept of concepts) {
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}</style><title>${concept.name} — fictional interface concept</title></head><body class="${concept.name}" style="${concept.theme}"><div class="screen">${status}<main>${concept.body}</main>${concept.nav}<div class="home-indicator"></div></div></body></html>`);
    const overflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      return main.scrollHeight - main.clientHeight;
    });
    if (overflow > 1) throw new Error(`${concept.name} content overflows by ${overflow}px`);
    const filename = path.join(output, `${concept.name}.png`);
    await page.screenshot({ path: filename });
    console.log(`Created ${filename} (780 × 1688)`);
  }
} finally {
  await browser.close();
}
