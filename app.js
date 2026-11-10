"use strict";
// Lift Log — everything is stored on this phone in localStorage.
const KEY = "liftlog.v1";
const PROVIDERS = {
  nvidia: { name: "NVIDIA (free key + bridge)" },
  groq: { name: "Groq (free key, easiest)" },
  gemini: { name: "Google Gemini (free key)" }
};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayIso = () => iso(new Date());
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => "x" + Math.random().toString(36).slice(2, 9);
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MON_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const UNITS = { kg: "kg", lb: "lb", plates: "plates", pin: "pin" };
const UNIT_HELP = { kg: "kilograms", lb: "pounds", plates: "plates per side (unknown weight)", pin: "machine pin / stack number" };
const STEP = { kg: 2.5, lb: 5, plates: 1, pin: 1 };
const niceDate = s => { const d = fromIso(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtN = n => (Math.round(n * 100) / 100).toString();

function fresh(){
  return {
    v: 1, split: "ppl", splits: clone(DEFAULT_SPLITS), logs: {}, journal: {},
    timer: { dur: 180, auto: true },
    ai: { provider: "nvidia", nvKey: "", nvProxy: "", nvModel: "nvidia/nemotron-3-super-120b-a12b", groqKey: "", groqModel: "llama-3.3-70b-versatile", gemKey: "", gemModel: "gemini-flash-latest", share: true },
    chat: []
  };
}
function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw), f = fresh();
      for (const k in f) if (!(k in s)) s[k] = f[k];
      s.ai = { ...f.ai, ...s.ai }; if (!PROVIDERS[s.ai.provider]) s.ai.provider = "nvidia"; if (s.ai.nvModel === "meta/llama-3.3-70b-instruct") s.ai.nvModel = f.ai.nvModel; s.timer = { ...f.timer, ...s.timer };
      return s;
    }
  } catch (e) {}
  return fresh();
}
let S = load();
let saveT;
function save(){ clearTimeout(saveT); saveT = setTimeout(saveNow, 250); }
function saveNow(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Could not save — phone storage full?"); } }
window.addEventListener("pagehide", saveNow);

function toast(msg, ms = 2400){
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}

// ---------- tabs ----------
let tab = "workout";
const TITLES = { workout: "Workout", timer: "Rest Timer", journal: "Journal", advisor: "Advisor" };
function go(t){
  tab = t;
  $$("nav.bottom button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  $$("section.tab").forEach(s => s.classList.toggle("on", s.id === "tab-" + t));
  $("#title").textContent = TITLES[t];
  if (t === "workout") renderWorkout();
  if (t === "timer") renderTimer(true);
  if (t === "journal") renderJournal();
  if (t === "advisor") renderAdvisor();
  updateMini();
  window.scrollTo(0, 0);
}
$$("nav.bottom button").forEach(b => b.onclick = () => go(b.dataset.tab));
$("#miniTimer").onclick = () => go("timer");

// ---------- sheet (bottom modal) ----------
function sheet(title, html, onMount){
  closeSheet();
  const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.id = "sheetBg";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-label="${esc(title)}"><div class="sh-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div><div class="sh-body">${html}</div></div>`;
  bg.addEventListener("click", e => { if (e.target === bg || e.target.closest("[data-close]")) closeSheet(); });
  document.body.appendChild(bg); document.body.style.overflow = "hidden";
  if (onMount) onMount($(".sh-body", bg));
}
function closeSheet(){ const b = $("#sheetBg"); if (b) b.remove(); document.body.style.overflow = ""; }

// ================= WORKOUT =================
let viewMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let selDate = todayIso();

function hasData(log){
  return !!log && Object.values(log.entries || {}).some(e => e.sets.some(s => s.w !== "" || s.r !== ""));
}
function dayFor(date){
  const L = S.logs[date];
  if (L && L.day) return { split: L.split, day: L.day };
  return { split: S.split, day: S.splits[S.split].week[fromIso(date).getDay()] };
}
function dayName(split, day){
  if (day === "rest") return "Rest";
  return S.splits[split]?.days[day]?.name || day;
}
function ensureLog(date){
  if (!S.logs[date]) { const d = dayFor(date); S.logs[date] = { split: d.split, day: d.day, entries: {} }; }
  return S.logs[date];
}
function ensureEntry(date, ex){
  const L = ensureLog(date);
  let e = L.entries[ex.uid];
  if (!e) e = L.entries[ex.uid] = { name: ex.name, unit: ex.unit, sets: [] };
  e.name = ex.name;
  while (e.sets.length < ex.sets) e.sets.push({ w: "", r: "", done: false });
  return e;
}
function findLast(ex, beforeDate){
  const nm = ex.name.trim().toLowerCase();
  const dates = Object.keys(S.logs).filter(d => d < beforeDate).sort().reverse();
  for (const d of dates) {
    const ents = S.logs[d].entries || {};
    let e = ents[ex.uid];
    if (!e || !e.sets.some(s => s.w !== "" || s.r !== "")) {
      e = Object.values(ents).find(x => x.name.trim().toLowerCase() === nm && x.sets.some(s => s.w !== "" || s.r !== ""));
    }
    if (e && e.sets.some(s => s.w !== "" || s.r !== "")) return { date: d, entry: e };
  }
  return null;
}
function setsText(entry){
  const u = UNITS[entry.unit] || "";
  return entry.sets.filter(s => s.w !== "" || s.r !== "").map(s => `${s.w === "" ? "–" : s.w}${s.w !== "" ? " " + u : ""} × ${s.r === "" ? "–" : s.r}`).join("  ·  ");
}
function suggestion(ex, last){
  const sets = last.entry.sets.filter(s => s.r !== "");
  if (!sets.length) return "";
  const u = last.entry.unit || ex.unit, step = STEP[u] || 1;
  const top = Math.max(...sets.map(s => parseFloat(s.w) || 0));
  const allHit = sets.length >= Math.min(ex.sets, sets.length) && sets.every(s => +s.r >= ex.rmax);
  const unitTxt = UNITS[u];
  if (allHit && top > 0) return `🔥 You hit ${ex.rmax} reps on every set. Add weight today: try <b>${fmtN(top + step)} ${unitTxt}</b> and aim for ${ex.rmin}+ reps.`;
  if (allHit) return `🔥 You hit ${ex.rmax} reps on every set. Make it harder today (more weight or slower reps).`;
  const best = Math.max(...sets.map(s => +s.r || 0));
  return `🎯 Beat last time: same ${top > 0 ? `<b>${fmtN(top)} ${unitTxt}</b>` : "weight"}, get <b>1 more rep</b> on at least one set (best was ${best}). When all sets reach ${ex.rmax}, add weight.`;
}
function muscles(ex){
  const g = GUIDES[ex.guide];
  if (ex.muscles && ex.muscles.trim()) return { p: ex.muscles.split(",").map(s => s.trim()).filter(Boolean), s: [] };
  return g ? { p: g.primary, s: g.secondary } : { p: [], s: [] };
}

function renderWorkout(){
  const el = $("#tab-workout");
  el.innerHTML = `
    <div class="seg" style="margin-bottom:12px">
      <button data-split="ppl" class="${S.split === "ppl" ? "on" : ""}">Push / Pull / Legs</button>
      <button data-split="ul" class="${S.split === "ul" ? "on" : ""}">Upper / Lower</button>
    </div>
    <div class="card" id="calCard"></div>
    <div id="session"></div>`;
  $$("[data-split]", el).forEach(b => b.onclick = () => {
    if (S.split === b.dataset.split) return;
    S.split = b.dataset.split; save(); renderWorkout();
    toast(`Switched to ${S.splits[S.split].name}. Past logs are kept.`);
  });
  renderCal(); renderSession();
}

function renderCal(){
  const c = $("#calCard"); if (!c) return;
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const first = new Date(y, m, 1), start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // week starts Monday
  const t = todayIso();
  let cells = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (i >= 35 && d.getMonth() !== m) break;
    const ds = iso(d), info = dayFor(ds), log = S.logs[ds];
    const tag = info.day === "rest" ? "" : dayName(info.split, info.day);
    const col = DAY_COLORS[info.day] || "var(--faint)";
    cells += `<button class="d ${d.getMonth() !== m ? "out" : ""} ${ds === t ? "today" : ""} ${ds === selDate ? "sel" : ""}" data-date="${ds}" aria-label="${ds} ${esc(tag || "rest")}">
      ${hasData(log) ? '<span class="ok"></span>' : ""}<span class="n">${d.getDate()}</span><span class="tag" style="color:${col}">${esc(tag) || "&nbsp;"}</span></button>`;
  }
  const sp = S.splits[S.split];
  const legend = Object.keys(sp.days).map(k => `<span><i style="background:${DAY_COLORS[k]}"></i>${esc(sp.days[k].name)}</span>`).join("") + `<span><i style="background:var(--good);border-radius:50%"></i>Logged</span>`;
  c.innerHTML = `
    <div class="cal-head">
      <button class="icon-btn" data-m="-1" aria-label="Previous month">‹</button>
      <b>${MON_LONG[m]} ${y}</b>
      <button class="icon-btn" data-m="1" aria-label="Next month">›</button>
    </div>
    <div class="cal">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x => `<div class="dow">${x}</div>`).join("")}${cells}</div>
    <div class="legend">${legend}</div>
    <div class="row" style="margin-top:10px;gap:6px">
      <button class="btn sm" id="todayBtn">Today</button>
      <button class="btn sm" id="editPlan">✏️ Edit plan & exercises</button>
    </div>`;
  $$("[data-m]", c).forEach(b => b.onclick = () => { viewMonth = new Date(y, m + +b.dataset.m, 1); renderCal(); });
  $$("[data-date]", c).forEach(b => b.onclick = () => { selDate = b.dataset.date; renderCal(); renderSession(); });
  $("#todayBtn", c).onclick = () => { const d = new Date(); viewMonth = new Date(d.getFullYear(), d.getMonth(), 1); selDate = todayIso(); renderCal(); renderSession(); };
  $("#editPlan", c).onclick = openPlanEditor;
}

function dayOptions(split, cur){
  const sp = S.splits[split];
  return Object.keys(sp.days).map(k => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(sp.days[k].name)}</option>`).join("") + `<option value="rest" ${cur === "rest" ? "selected" : ""}>Rest day</option>`;
}

function renderSession(){
  const el = $("#session"); if (!el) return;
  const date = selDate, d = fromIso(date), info = dayFor(date);
  const split = S.splits[info.split] ? info.split : S.split;
  const isToday = date === todayIso();
  const head = `<div class="card">
    <div class="day-title">
      <div style="flex:1;min-width:0"><div class="small muted">${isToday ? "Today · " : ""}${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MON_LONG[d.getMonth()]}</div>
      <h2 style="margin:2px 0 0">${info.day === "rest" ? "Rest day 😴" : esc(dayName(split, info.day)) + " day"}</h2></div>
      ${info.day !== "rest" ? `<span class="badge" style="background:${DAY_COLORS[info.day] || "var(--faint)"}">${esc(S.splits[split].name)}</span>` : ""}
    </div>
    <label class="f" for="daySwap">Change this day's workout (e.g. you missed a day)</label>
    <select id="daySwap">${dayOptions(split, info.day)}</select>
  </div>`;
  if (info.day === "rest") {
    el.innerHTML = head + `<div class="card"><p style="margin:0">Recovery is when muscle actually grows. Sleep 7–9 hours, eat enough protein (about 1.6–2.2 g per kg body weight), and go for a light walk.</p><p class="small muted" style="margin:8px 0 0">Want to train anyway? Pick a workout above.</p></div>`;
    bindSwap(date, split); return;
  }
  const tpl = S.splits[split].days[info.day];
  const log = S.logs[date];
  const inPlan = new Set(tpl.ex.map(e => e.uid));
  const extra = log ? Object.entries(log.entries).filter(([k, e]) => !inPlan.has(k) && e.sets.some(s => s.w !== "" || s.r !== "")) : [];
  let html = head;
  tpl.ex.forEach((ex, i) => { html += exCard(ex, date, log?.entries[ex.uid], i); });
  extra.forEach(([k, e]) => { html += `<div class="card"><b>${esc(e.name)}</b> <span class="chip">removed from plan</span><div class="small muted" style="margin-top:6px">${esc(setsText(e))}</div></div>`; });
  html += `<div class="card small muted">💡 Tip: tick ✓ after each set to start the ${fmtDur(S.timer.dur)} rest timer${S.timer.auto ? "" : " (auto-start is off — turn it on in the Timer tab)"}.</div>`;
  el.innerHTML = html;
  bindSwap(date, split);
  bindExCards(el, date, tpl);
}
function bindSwap(date, split){
  $("#daySwap").onchange = e => {
    const L = ensureLog(date); L.split = split; L.day = e.target.value; save(); renderCal(); renderSession();
  };
}
function exCard(ex, date, entry, idx){
  const m = muscles(ex), last = findLast(ex, date);
  const nSets = Math.max(ex.sets, entry?.sets.length || 0);
  const unit = entry?.unit || ex.unit;
  const lastHtml = last
    ? `<div class="last"><div class="lt">Last time · ${niceDate(last.date)}</div><div style="margin:2px 0 4px;font-variant-numeric:tabular-nums">${esc(setsText(last.entry))}</div><div>${suggestion(ex, last)}</div></div>`
    : `<div class="last none">No history yet. Pick a weight you can do for ${ex.rmin}–${ex.rmax} clean reps, leaving 1–2 reps in the tank.</div>`;
  let rows = `<div class="h">Set</div><div class="h">${esc(UNITS[unit])}</div><div class="h">Reps</div><div class="h"></div>`;
  for (let i = 0; i < nSets; i++) {
    const s = entry?.sets[i] || { w: "", r: "", done: false };
    const ls = last?.entry.sets[i];
    rows += `<div class="no">${i + 1}</div>
      <div class="inp"><input inputmode="decimal" type="text" data-uid="${ex.uid}" data-i="${i}" data-f="w" value="${esc(s.w)}" placeholder="${ls && ls.w !== "" ? esc(ls.w) : "–"}" aria-label="Set ${i + 1} ${UNITS[unit]}"><span>${esc(UNITS[unit])}</span></div>
      <div class="inp"><input inputmode="numeric" type="text" data-uid="${ex.uid}" data-i="${i}" data-f="r" value="${esc(s.r)}" placeholder="${ls && ls.r !== "" ? esc(ls.r) : ex.rmin + "–" + ex.rmax}" aria-label="Set ${i + 1} reps"><span>reps</span></div>
      <button class="tick ${s.done ? "on" : ""}" data-tick="${ex.uid}" data-i="${i}" aria-label="Set ${i + 1} done">✓</button>`;
  }
  return `<div class="card ex" data-ex="${ex.uid}">
    <div class="ex-head">
      <div class="nm"><b>${idx + 1}. ${esc(ex.name)}</b>
        <div class="small muted">${ex.sets} sets × ${ex.rmin}–${ex.rmax} reps</div>
        <div class="chips">${m.p.map(x => `<span class="chip p">${esc(x)}</span>`).join("")}${m.s.map(x => `<span class="chip">${esc(x)}</span>`).join("")}</div>
      </div>
      <button class="btn sm" data-guide="${ex.uid}">📋 Coach</button>
    </div>
    ${lastHtml}
    <div class="sets">${rows}</div>
    <div class="ex-foot">
      <select data-unit="${ex.uid}" aria-label="Weight unit">${Object.keys(UNITS).map(u => `<option value="${u}" ${u === unit ? "selected" : ""}>${UNIT_HELP[u]}</option>`).join("")}</select>
      <button class="btn sm" data-addset="${ex.uid}">+ Set</button>
      ${last ? `<button class="btn sm" data-copy="${ex.uid}">↺ Use last weights</button>` : ""}
    </div>
  </div>`;
}
function bindExCards(el, date, tpl){
  const exOf = u => tpl.ex.find(e => e.uid === u);
  $$("input[data-uid]", el).forEach(inp => inp.oninput = () => {
    const ex = exOf(inp.dataset.uid), e = ensureEntry(date, ex), i = +inp.dataset.i;
    while (e.sets.length <= i) e.sets.push({ w: "", r: "", done: false });
    e.sets[i][inp.dataset.f] = inp.value.replace(",", ".").trim();
    save(); refreshCalDot();
  });
  $$("[data-tick]", el).forEach(b => b.onclick = () => {
    const ex = exOf(b.dataset.tick), e = ensureEntry(date, ex), i = +b.dataset.i;
    while (e.sets.length <= i) e.sets.push({ w: "", r: "", done: false });
    const s = e.sets[i]; s.done = !s.done; b.classList.toggle("on", s.done); save();
    if (s.done && (s.w === "" || s.r === "")) toast("Tip: type the weight and reps too, so next time you can beat it.");
    if (s.done && S.timer.auto) { timerReset(); timerStart(); toast(`Rest timer started · ${fmtDur(S.timer.dur)}`); }
  });
  $$("[data-unit]", el).forEach(sel => sel.onchange = () => {
    const ex = exOf(sel.dataset.unit), e = ensureEntry(date, ex); e.unit = sel.value;
    ex.unit = sel.value; save(); renderSession();
  });
  $$("[data-addset]", el).forEach(b => b.onclick = () => {
    const ex = exOf(b.dataset.addset), e = ensureEntry(date, ex); e.sets.push({ w: "", r: "", done: false }); save(); renderSession();
  });
  $$("[data-copy]", el).forEach(b => b.onclick = () => {
    const ex = exOf(b.dataset.copy), last = findLast(ex, date), e = ensureEntry(date, ex);
    e.unit = last.entry.unit || e.unit;
    last.entry.sets.forEach((s, i) => { while (e.sets.length <= i) e.sets.push({ w: "", r: "", done: false }); if (e.sets[i].w === "") e.sets[i].w = s.w; });
    save(); renderSession(); toast("Weights copied. Now try to beat the reps!");
  });
  $$("[data-guide]", el).forEach(b => b.onclick = () => openGuide(exOf(b.dataset.guide)));
}
function refreshCalDot(){
  const b = $(`.cal [data-date="${selDate}"]`);
  if (b) { const has = hasData(S.logs[selDate]), dot = $(".ok", b); if (has && !dot) b.insertAdjacentHTML("afterbegin", '<span class="ok"></span>'); if (!has && dot) dot.remove(); }
}

function openGuide(ex){
  const g = GUIDES[ex.guide];
  if (!g) {
    sheet(ex.name, `<p>No coach guide is linked to this exercise yet.</p><p class="muted small">Open <b>Edit plan</b> → tap the exercise → choose a guide from the list, or ask the Advisor tab how to do it.</p>`);
    return;
  }
  const m = muscles(ex);
  sheet(ex.name, `<div class="guide">
    ${ex.name !== g.name ? `<p class="small muted" style="margin-top:0">Guide: ${esc(g.name)}</p>` : ""}
    <div class="chips">${m.p.map(x => `<span class="chip p">${esc(x)}</span>`).join("")}${m.s.map(x => `<span class="chip">${esc(x)}</span>`).join("")}</div>
    <h4>Set up</h4><ul>${g.setup.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <h4>How to do it</h4><ol>${g.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
    <h4>Coach cues</h4><ul>${g.cues.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <h4>Mistakes I see every day</h4>${g.mistakes.map(([a, b]) => `<div class="mist"><b>✗ ${esc(a)}</b><br>${esc(b)}</div>`).join("")}
    <div class="tipbox">💡 ${esc(g.tip)}</div>
    <p class="tiny faint">Sharp pain, clicking with pain, or numbness = stop the exercise. Ache in the muscle is normal; pain in the joint is not.</p>
  </div>`);
}

// ---------- plan editor ----------
let planDay = null;
function openPlanEditor(){
  const sp = S.splits[S.split];
  if (!planDay || !sp.days[planDay]) planDay = Object.keys(sp.days)[0];
  const d = sp.days[planDay];
  const weekRows = [1,2,3,4,5,6,0].map(i => `<div class="small"><b>${DOW_LONG[i]}</b></div><select data-wk="${i}">${dayOptions(S.split, sp.week[i])}</select>`).join("");
  sheet(`Edit ${sp.name}`, `
    <div class="seg" style="margin-bottom:10px">${Object.keys(sp.days).map(k => `<button data-pd="${k}" class="${k === planDay ? "on" : ""}">${esc(sp.days[k].name)}</button>`).join("")}</div>
    <div class="card">
      <label class="f" for="dayNm" style="margin-top:0">Day name</label>
      <input type="text" id="dayNm" value="${esc(d.name)}">
      <div style="margin-top:6px">${d.ex.map((ex, i) => `<div class="plan-ex">
        <div class="nm"><b>${esc(ex.name)}</b><div class="small muted">${ex.sets} × ${ex.rmin}–${ex.rmax} · ${UNITS[ex.unit]}${GUIDES[ex.guide] ? "" : " · no guide"}</div></div>
        <button class="mini" data-up="${i}" aria-label="Move up">↑</button>
        <button class="mini" data-dn="${i}" aria-label="Move down">↓</button>
        <button class="btn sm" data-ed="${i}">Edit</button></div>`).join("")}</div>
      <button class="btn primary" id="addEx" style="width:100%;margin-top:10px">+ Add exercise</button>
    </div>
    <div class="card"><h3 style="margin-bottom:8px">Weekly schedule</h3><div class="weekgrid">${weekRows}</div>
      <p class="tiny faint" style="margin:8px 0 0">Changing the schedule doesn't touch days you already logged.</p></div>
    <button class="btn ghost danger" id="resetPlan" style="width:100%">Reset ${esc(sp.name)} to the default plan</button>
  `, body => {
    $$("[data-pd]", body).forEach(b => b.onclick = () => { planDay = b.dataset.pd; openPlanEditor(); });
    $("#dayNm", body).onchange = e => { d.name = e.target.value.trim() || d.name; save(); openPlanEditor(); refreshWorkoutBg(); };
    $$("[data-up]", body).forEach(b => b.onclick = () => { const i = +b.dataset.up; if (i > 0) { [d.ex[i - 1], d.ex[i]] = [d.ex[i], d.ex[i - 1]]; save(); openPlanEditor(); refreshWorkoutBg(); } });
    $$("[data-dn]", body).forEach(b => b.onclick = () => { const i = +b.dataset.dn; if (i < d.ex.length - 1) { [d.ex[i + 1], d.ex[i]] = [d.ex[i], d.ex[i + 1]]; save(); openPlanEditor(); refreshWorkoutBg(); } });
    $$("[data-ed]", body).forEach(b => b.onclick = () => openExEditor(d, +b.dataset.ed));
    $("#addEx", body).onclick = () => openExEditor(d, -1);
    $$("[data-wk]", body).forEach(s => s.onchange = () => { sp.week[+s.dataset.wk] = s.value; save(); refreshWorkoutBg(); });
    $("#resetPlan", body).onclick = () => {
      if (!confirm(`Reset ${sp.name} exercises and schedule to the default? Your logged workouts stay.`)) return;
      S.splits[S.split] = clone(DEFAULT_SPLITS[S.split]); save(); planDay = null; openPlanEditor(); refreshWorkoutBg();
    };
  });
}
function refreshWorkoutBg(){ if (tab === "workout") { renderCal(); renderSession(); } }
function openExEditor(day, idx){
  const isNew = idx < 0;
  const ex = isNew ? { uid: uid(), name: "", guide: "", sets: 3, rmin: 8, rmax: 12, unit: "kg", muscles: "" } : day.ex[idx];
  const gOpts = `<option value="">— No guide (custom exercise) —</option>` + Object.entries(GUIDES).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, g]) => `<option value="${k}" ${k === ex.guide ? "selected" : ""}>${esc(g.name)}</option>`).join("");
  sheet(isNew ? "Add exercise" : "Edit exercise", `
    <label class="f" for="exName" style="margin-top:0">Exercise name (call it anything)</label>
    <input type="text" id="exName" value="${esc(ex.name)}" placeholder="e.g. Smith machine incline press">
    <label class="f" for="exGuide">Coach guide & target muscles</label>
    <select id="exGuide">${gOpts}</select>
    <p class="tiny faint" style="margin:4px 0 0">Pick the closest movement. Choosing a guide fills the name if it's empty.</p>
    <label class="f" for="exMus">Target muscles (optional — overrides the guide, separate with commas)</label>
    <input type="text" id="exMus" value="${esc(ex.muscles || "")}" placeholder="e.g. Upper chest, Front shoulders">
    <div class="row" style="gap:8px">
      <div style="flex:1"><label class="f" for="exSets">Sets</label><input type="number" id="exSets" min="1" max="10" value="${ex.sets}"></div>
      <div style="flex:1"><label class="f" for="exMin">Reps from</label><input type="number" id="exMin" min="1" max="50" value="${ex.rmin}"></div>
      <div style="flex:1"><label class="f" for="exMax">to</label><input type="number" id="exMax" min="1" max="50" value="${ex.rmax}"></div>
    </div>
    <label class="f" for="exUnit">Log weight as</label>
    <select id="exUnit">${Object.keys(UNITS).map(u => `<option value="${u}" ${u === ex.unit ? "selected" : ""}>${UNIT_HELP[u]}</option>`).join("")}</select>
    <div class="row" style="margin-top:16px;gap:8px">
      ${isNew ? "" : `<button class="btn danger" id="exDel">Delete</button>`}
      <button class="btn" id="exCancel" style="margin-left:auto">Cancel</button>
      <button class="btn primary" id="exSave">Save</button>
    </div>
    ${isNew ? "" : `<p class="tiny faint">Renaming keeps this exercise's history and "last time" reminder.</p>`}
  `, body => {
    $("#exGuide", body).onchange = e => { const n = $("#exName", body); if (!n.value.trim() && GUIDES[e.target.value]) n.value = GUIDES[e.target.value].name; };
    $("#exCancel", body).onclick = openPlanEditor;
    if (!isNew) $("#exDel", body).onclick = () => {
      if (!confirm(`Remove "${ex.name}" from ${day.name}? Your past logs of it stay.`)) return;
      day.ex.splice(idx, 1); save(); openPlanEditor(); refreshWorkoutBg();
    };
    $("#exSave", body).onclick = () => {
      const name = $("#exName", body).value.trim();
      if (!name) { toast("Give the exercise a name"); return; }
      let rmin = Math.max(1, +$("#exMin", body).value || 8), rmax = Math.max(1, +$("#exMax", body).value || 12);
      if (rmin > rmax) [rmin, rmax] = [rmax, rmin];
      Object.assign(ex, { name, guide: $("#exGuide", body).value, muscles: $("#exMus", body).value.trim(), sets: Math.min(10, Math.max(1, +$("#exSets", body).value || 3)), rmin, rmax, unit: $("#exUnit", body).value });
      if (isNew) day.ex.push(ex);
      save(); openPlanEditor(); refreshWorkoutBg(); toast("Saved");
    };
  });
}

// ================= TIMER =================
const T = { running: false, endAt: 0, remain: S.timer.dur * 1000, done: false, actx: null };
const DURS = [60, 90, 120, 180, 240, 300];
const fmtDur = s => `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`;
const fmtMs = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
function remaining(){ return T.running ? Math.max(0, T.endAt - Date.now()) : T.remain; }

async function swPost(msg){
  try { const reg = await navigator.serviceWorker?.ready; reg?.active?.postMessage(msg); } catch (e) {}
}
async function askNotif(){
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") { try { await Notification.requestPermission(); } catch (e) {} }
  return Notification.permission;
}
function timerStart(){
  if (T.running) return;
  if (T.remain <= 0) T.remain = S.timer.dur * 1000;
  askNotif().then(() => { if (tab === "timer") renderTimer(true); });
  try { T.actx = T.actx || new (window.AudioContext || window.webkitAudioContext)(); T.actx.resume(); } catch (e) {}
  T.endAt = Date.now() + T.remain; T.running = true; T.done = false;
  swPost({ type: "timer-start", endAt: T.endAt, title: "Rest is over 💪", body: "Time for your next set. Go!" });
  tick();
}
function timerPause(){ if (!T.running) return; T.remain = Math.max(0, T.endAt - Date.now()); T.running = false; swPost({ type: "timer-cancel" }); tick(); }
function timerReset(){ T.running = false; T.done = false; T.remain = S.timer.dur * 1000; swPost({ type: "timer-cancel" }); tick(); }
function beep(){
  try {
    const ctx = T.actx; if (!ctx) return;
    [0, 0.35, 0.7].forEach((t0, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = i === 2 ? 1175 : 880; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t0);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + 0.28);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + 0.3);
    });
  } catch (e) {}
}
function timerFinished(){
  T.running = false; T.remain = 0; T.done = true;
  beep(); try { navigator.vibrate?.([300, 120, 300, 120, 600]); } catch (e) {}
  // Backup: if the service worker was stopped and didn't notify, notify from the page.
  setTimeout(async () => {
    try {
      if (Notification.permission !== "granted") return;
      const reg = await navigator.serviceWorker?.ready; if (!reg) return;
      const open = await reg.getNotifications({ tag: "rest-timer" });
      if (!open.length) reg.showNotification("Rest is over 💪", { body: "Time for your next set. Go!", tag: "rest-timer", icon: "icons/icon-192.png", badge: "icons/icon-192.png", vibrate: [300, 120, 300, 120, 600], requireInteraction: true, data: { tab: "timer" } });
    } catch (e) {}
  }, 2500);
}
function tick(){
  if (T.running && Date.now() >= T.endAt) timerFinished();
  updateMini();
  if (tab === "timer") renderTimer(false);
}
setInterval(tick, 250);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") tick(); });

function updateMini(){
  const b = $("#miniTimer");
  const show = (T.running || T.done) && tab !== "timer";
  b.classList.toggle("hidden", !show);
  b.classList.toggle("done", T.done);
  if (show) b.textContent = T.done ? "✓ Rest done" : "⏱ " + fmtMs(remaining());
}
function renderTimer(full){
  const el = $("#tab-timer");
  const rem = remaining(), total = S.timer.dur * 1000;
  const frac = T.done ? 0 : Math.min(1, rem / total);
  const R = 120, C = 2 * Math.PI * R;
  if (full || !$("#ringArc")) {
    const perm = "Notification" in window ? Notification.permission : "unsupported";
    el.innerHTML = `<div class="card timer">
      <div class="ring">
        <svg viewBox="0 0 270 270"><circle cx="135" cy="135" r="${R}" fill="none" stroke="var(--card2)" stroke-width="14"/>
        <circle id="ringArc" cx="135" cy="135" r="${R}" fill="none" stroke="var(--accent)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
        <div class="t" id="tTime"></div><div class="s" id="tSub"></div>
      </div>
      <div class="tbtns"><button class="btn" id="tReset">Reset</button><button class="btn primary" id="tMain"></button></div>
      <div class="durs">${DURS.map(s => `<button data-dur="${s}" class="${s === S.timer.dur ? "on" : ""}">${fmtDur(s)}</button>`).join("")}</div>
    </div>
    <div class="card">
      <div class="switch"><div><b>Auto-start after each set</b><div class="small muted">Starts when you tick ✓ in Workout</div></div><input type="checkbox" id="tAuto" ${S.timer.auto ? "checked" : ""} aria-label="Auto-start timer"></div>
    </div>
    <div class="card small">
      <b>Notifications: ${perm === "granted" ? '<span style="color:var(--good)">ON ✓</span>' : perm === "denied" ? '<span style="color:var(--bad)">blocked</span>' : perm === "unsupported" ? "not supported in this browser" : "not allowed yet"}</b>
      <p class="muted" style="margin:6px 0">When the rest is over you get a phone notification, even while you use other apps. ${perm === "denied" ? "Turn it back on in your phone: Settings → Apps → (this app or Chrome) → Notifications." : ""}</p>
      <ul class="muted" style="margin:0;padding-left:18px"><li>Install the app to your home screen first (Chrome menu ⋮ → Add to Home screen / Install).</li><li>Don't swipe the app away from recent apps while resting — just switch apps.</li><li>Battery saver can delay notifications. If it's late, set this app's battery to “Unrestricted”.</li></ul>
      <button class="btn sm" id="tTest" style="margin-top:8px">Send test notification (5 s)</button>
    </div>`;
    $("#tMain").onclick = () => { if (T.running) timerPause(); else { if (T.done) timerReset(); timerStart(); } };
    $("#tReset").onclick = timerReset;
    $$("[data-dur]", el).forEach(b => b.onclick = () => { S.timer.dur = +b.dataset.dur; save(); timerReset(); renderTimer(true); });
    $("#tAuto").onchange = e => { S.timer.auto = e.target.checked; save(); };
    $("#tTest").onclick = async () => {
      const p = await askNotif(); renderTimer(true);
      if (p !== "granted") { toast("Notifications are not allowed yet"); return; }
      swPost({ type: "timer-start", endAt: Date.now() + 5000, title: "Test ✓", body: "Notifications work. Switch apps — you'll still get this." });
      toast("Test sent — switch to another app now");
    };
  }
  $("#tTime").textContent = T.done ? "0:00" : fmtMs(rem);
  $("#tSub").textContent = T.done ? "Rest done — go!" : T.running ? "resting…" : rem < total ? "paused" : "ready";
  $("#ringArc").setAttribute("stroke-dashoffset", String(C * (1 - frac)));
  $("#ringArc").setAttribute("stroke", T.done ? "var(--good)" : "var(--accent)");
  $("#tMain").textContent = T.running ? "Pause" : T.done ? "Start again" : rem < total ? "Resume" : "Start";
}

// ================= JOURNAL =================
let jDate = todayIso();
const MOODS = [["😤", "Angry"], ["😔", "Down"], ["😐", "Okay"], ["🙂", "Good"], ["💪", "Strong"]];
function renderJournal(){
  const el = $("#tab-journal");
  const j = S.journal[jDate] || { mood: "", vent: "", mistakes: "", lesson: "" };
  const d = fromIso(jDate), isToday = jDate === todayIso();
  const past = Object.keys(S.journal).filter(k => { const x = S.journal[k]; return x.vent || x.mistakes || x.lesson || x.mood; }).sort().reverse();
  el.innerHTML = `
    <div class="card">
      <div class="row between">
        <button class="icon-btn" id="jPrev" aria-label="Previous day">‹</button>
        <div style="text-align:center"><b>${isToday ? "Today" : DOW_LONG[d.getDay()]}</b><div class="small muted">${d.getDate()} ${MON_LONG[d.getMonth()]} ${d.getFullYear()}</div></div>
        <button class="icon-btn" id="jNext" aria-label="Next day" ${isToday ? "disabled style='opacity:.35'" : ""}>›</button>
      </div>
      <label class="f">How do you feel?</label>
      <div class="moods">${MOODS.map(([e, n]) => `<button data-mood="${n}" class="${j.mood === n ? "on" : ""}">${e} ${n}</button>`).join("")}</div>
      <label class="f" for="jVent">Vent — let it all out</label>
      <textarea id="jVent" data-j="vent" placeholder="What's on your mind? Nobody reads this but you.">${esc(j.vent)}</textarea>
      <label class="f" for="jMist">Mistakes I made today</label>
      <textarea id="jMist" data-j="mistakes" placeholder="In the gym, with food, sleep, people, study…">${esc(j.mistakes)}</textarea>
      <label class="f" for="jLes">What I'll do better tomorrow</label>
      <textarea id="jLes" data-j="lesson" style="min-height:70px" placeholder="One small thing.">${esc(j.lesson)}</textarea>
      <div class="tiny faint" id="jSaved" style="margin-top:6px">Saved on this phone only. Auto-saves as you type.</div>
    </div>
    <div class="card"><h3 style="margin-bottom:4px">Past entries</h3>
      ${past.length ? `<div class="jlist">${past.map(k => { const x = S.journal[k]; const m = MOODS.find(mm => mm[1] === x.mood); const first = (x.vent || x.mistakes || x.lesson || "").split("\n")[0].slice(0, 70); return `<button data-jd="${k}"><b>${niceDate(k)}</b> ${m ? m[0] : ""}<div class="small muted">${esc(first) || "—"}</div></button>`; }).join("")}</div>` : `<p class="small muted" style="margin:4px 0 0">Nothing yet. Your entries will show here.</p>`}
    </div>`;
  const cur = () => S.journal[jDate] || (S.journal[jDate] = { mood: "", vent: "", mistakes: "", lesson: "" });
  $$("[data-j]", el).forEach(t => t.oninput = () => { cur()[t.dataset.j] = t.value; save(); $("#jSaved").textContent = "Saved ✓"; });
  $$("[data-mood]", el).forEach(b => b.onclick = () => { const c = cur(); c.mood = c.mood === b.dataset.mood ? "" : b.dataset.mood; save(); renderJournal(); });
  $("#jPrev").onclick = () => { const x = fromIso(jDate); x.setDate(x.getDate() - 1); jDate = iso(x); renderJournal(); };
  $("#jNext").onclick = () => { if (isToday) return; const x = fromIso(jDate); x.setDate(x.getDate() + 1); jDate = iso(x); renderJournal(); };
  $$("[data-jd]", el).forEach(b => b.onclick = () => { jDate = b.dataset.jd; renderJournal(); window.scrollTo(0, 0); });
}

// ================= ADVISOR =================
const PROXY_CODE = `// Cloudflare Worker: lets the Lift Log app talk to NVIDIA's free AI.
// NVIDIA blocks calls straight from web pages, so this passes them along.
const ALLOWED_ORIGIN = "https://hafiz123cm.github.io";
export default {
  async fetch(req) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
    const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": req.headers.get("Authorization") || "", "Content-Type": "application/json" },
      body: await req.text()
    });
    return new Response(r.body, { status: r.status, headers: { ...cors, "Content-Type": r.headers.get("Content-Type") || "application/json" } });
  }
};`;
let aiBusy = false;
function mdLite(s){
  let h = esc(s.replace(/<think>[\s\S]*?<\/think>/g, "").trim());
  h = h.replace(/^#{1,6}\s*(.+)$/gm, "<b>$1</b>")
       .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
       .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>")
       .replace(/^\s*[-*•]\s+/gm, "• ")
       .replace(/`([^`]+)`/g, "<code>$1</code>")
       .replace(/\n/g, "<br>");
  return h;
}
function workoutContext(){
  const sp = S.splits[S.split], t = todayIso(), info = dayFor(t);
  const lines = [];
  lines.push(`Split: ${sp.name}. Week: ${[1,2,3,4,5,6,0].map(i => `${DOW[i]} ${dayName(S.split, sp.week[i])}`).join(", ")}.`);
  for (const [k, d] of Object.entries(sp.days)) lines.push(`${d.name} day exercises: ${d.ex.map(e => `${e.name} ${e.sets}x${e.rmin}-${e.rmax}`).join("; ")}.`);
  lines.push(`Today is ${DOW_LONG[new Date().getDay()]} ${t}: ${dayName(info.split, info.day)} day.`);
  const recent = Object.keys(S.logs).filter(d => hasData(S.logs[d])).sort().reverse().slice(0, 8);
  if (recent.length) {
    lines.push("Recent logged sessions (weight x reps):");
    for (const d of recent) {
      const L = S.logs[d];
      const ex = Object.values(L.entries).filter(e => e.sets.some(s => s.w !== "" || s.r !== "")).map(e => `${e.name}: ${setsText(e)}`).join(" | ");
      lines.push(`- ${d} ${dayName(L.split, L.day)}: ${ex}`);
    }
  } else lines.push("No sessions logged yet.");
  lines.push("Units: 'plates' = number of plates per side of unknown weight; 'pin' = machine stack pin number.");
  return lines.join("\n");
}
function systemPrompt(){
  let p = `You are Coach, a very experienced strength and muscle-building coach. You have watched thousands of people train in commercial gyms and you know every common mistake (ego lifting, half reps, swinging, bad bracing, flared elbows, knees caving, no progressive overload, poor sleep and protein). The user lives in Malaysia. Talk in simple, friendly English with short sentences. Be practical and specific: exact sets, reps, weight changes, form cues and the mistakes to avoid. Push safe progressive overload. Keep answers short (under ~180 words) unless the user asks for detail. Use bullet points. If the user mentions sharp pain, numbness, a pop, or an injury, tell them to stop that exercise and see a doctor or physiotherapist — do not diagnose.`;
  if (S.ai.share) p += `\n\nThe user's training data from their Lift Log app:\n${workoutContext()}`;
  return p;
}
async function callAI(messages){
  const a = S.ai;
  let url, headers = { "Content-Type": "application/json" }, body;
  if (a.provider === "nvidia") {
    if (!a.nvKey || !a.nvProxy) throw new Error("NVIDIA needs your API key and bridge link. Open “AI settings” below.");
    url = a.nvProxy.trim(); headers.Authorization = "Bearer " + a.nvKey.trim();
    body = { model: a.nvModel || "nvidia/nemotron-3-super-120b-a12b", messages, temperature: 0.6, max_tokens: 1024 };
  } else if (a.provider === "groq") {
    if (!a.groqKey) throw new Error("Groq needs your free API key. Open “AI settings” below.");
    url = "https://api.groq.com/openai/v1/chat/completions"; headers.Authorization = "Bearer " + a.groqKey.trim();
    body = { model: a.groqModel || "llama-3.3-70b-versatile", messages, temperature: 0.6, max_tokens: 1024 };
  } else {
    if (!a.gemKey) throw new Error("Gemini needs your free API key. Open “AI settings” below.");
    url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"; headers.Authorization = "Bearer " + a.gemKey.trim();
    body = { model: a.gemModel || "gemini-flash-latest", messages, temperature: 0.6 };
  }
  const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 90000);
  let res;
  try { res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal }); }
  catch (e) { throw new Error(e.name === "AbortError" ? "The AI took too long. Try again." : "Couldn't reach the AI. Check your internet" + (a.provider === "nvidia" ? " and the bridge link." : ".")); }
  finally { clearTimeout(to); }
  const txt = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("The API key was rejected. Check it in AI settings.");
    if ((res.status === 404 || res.status === 400) && /model/i.test(txt)) throw new Error("That AI model isn't available any more. Pick another model in AI settings.");
    if (res.status === 429) throw new Error("Too many questions too fast (free limit). Wait a minute and try again.");
    throw new Error(`AI error ${res.status}. ${txt.slice(0, 160)}`);
  }
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error("The AI sent back something unexpected. Try again."); }
  const out = j.choices?.[0]?.message?.content;
  if (!out) throw new Error("The AI gave an empty answer. Try again.");
  return out;
}
async function ask(text){
  text = text.trim(); if (!text || aiBusy) return;
  S.chat.push({ role: "user", content: text }); save();
  aiBusy = true; renderChat();
  try {
    const msgs = [{ role: "system", content: systemPrompt() }, ...S.chat.slice(-12).map(m => ({ role: m.role, content: m.content }))];
    const out = await callAI(msgs);
    S.chat.push({ role: "assistant", content: out.replace(/<think>[\s\S]*?<\/think>/g, "").trim() });
  } catch (e) {
    S.chat.push({ role: "error", content: e.message });
  }
  aiBusy = false; save(); renderChat();
}
const QUICK = ["Review my last workout", "How do I break a bench plateau?", "My lower back hurts after squats", "What should I eat to build muscle?", "Fix my lateral raise form"];
function renderAdvisor(){
  const el = $("#tab-advisor"), a = S.ai;
  el.innerHTML = `
    <div class="card small"><b>Coach 🤖</b> <span class="muted">— ${esc(PROVIDERS[a.provider].name)}${a.share ? " · can see your workout log" : ""}</span></div>
    <div class="chat" id="chat"></div>
    <div class="qchips" id="qchips">${QUICK.map(q => `<button>${esc(q)}</button>`).join("")}</div>
    <div class="composer"><textarea id="aiIn" rows="1" placeholder="Ask your coach…" aria-label="Message"></textarea><button class="btn primary" id="aiSend" style="height:44px">Send</button></div>
    <details class="card" id="aiSet"><summary>⚙️ AI settings</summary>
      <label class="f">Which AI</label>
      <select id="aiProv">${Object.entries(PROVIDERS).map(([k, p]) => `<option value="${k}" ${k === a.provider ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
      <div id="provBox"></div>
      <div class="switch" style="margin-top:12px"><div><b>Let Coach see my workout log</b><div class="small muted">Sends your plan and last 8 sessions with each question. Journal is never sent.</div></div><input type="checkbox" id="aiShare" ${a.share ? "checked" : ""} aria-label="Share workout log"></div>
      <button class="btn sm danger" id="aiClear" style="margin-top:12px">Clear chat</button>
    </details>`;
  renderProvBox(); renderChat();
  const inp = $("#aiIn");
  inp.oninput = () => { inp.style.height = "auto"; inp.style.height = Math.min(140, inp.scrollHeight) + "px"; };
  $("#aiSend").onclick = () => { const v = inp.value; inp.value = ""; inp.style.height = ""; ask(v); };
  inp.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); $("#aiSend").click(); } };
  $$("#qchips button").forEach(b => b.onclick = () => ask(b.textContent));
  $("#aiProv").onchange = e => { a.provider = e.target.value; save(); renderProvBox(); $(".card.small .muted", el).textContent = `— ${PROVIDERS[a.provider].name}${a.share ? " · can see your workout log" : ""}`; };
  $("#aiShare").onchange = e => { a.share = e.target.checked; save(); };
  $("#aiClear").onclick = () => { if (confirm("Clear the whole chat?")) { S.chat = []; save(); renderChat(); } };
}
const NV_MODELS = ["nvidia/nemotron-3-super-120b-a12b", "deepseek-ai/deepseek-v4.1-flash", "moonshotai/kimi-k2.6", "mistralai/mistral-large-4-1t-a52b", "openai/gpt-oss-20b", "nvidia/llama-3.1-nemotron-70b-instruct"];
// Groq and Gemini can list their models from the phone, so we fill the picker and fix a retired default.
async function fetchModels(kind){
  const a = S.ai, key = kind === "groq" ? a.groqKey : a.gemKey; if (!key) return;
  const url = kind === "groq" ? "https://api.groq.com/openai/v1/models" : "https://generativelanguage.googleapis.com/v1beta/openai/models";
  try {
    const r = await fetch(url, { headers: { Authorization: "Bearer " + key } }); if (!r.ok) return;
    const ids = ((await r.json()).data || []).map(m => String(m.id).replace(/^models\//, "")).filter(i => !/whisper|tts|embed|guard|imagen|veo|image|audio|live|vision|orpheus|playai/i.test(i));
    const dl = $("#mList"); if (dl) dl.innerHTML = ids.map(i => `<option value="${esc(i)}">`).join("");
    const field = kind === "groq" ? "groqModel" : "gemModel";
    if (ids.length && !ids.includes(a[field])) {
      const pref = kind === "groq" ? ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"] : ["gemini-flash-latest", "gemini-2.5-flash"];
      a[field] = pref.find(p => ids.includes(p)) || ids.find(i => /flash|70b|120b/.test(i)) || ids[0]; save();
      const inp = $(kind === "groq" ? "#gModel" : "#gmModel"); if (inp) inp.value = a[field];
    }
  } catch (e) {}
}
function renderProvBox(){
  const a = S.ai, box = $("#provBox"); if (!box) return;
  if (a.provider === "gemini") {
    box.innerHTML = `
      <p class="small muted">Google gives a free Gemini key with a daily limit. Works straight from this app. Get one at <b>aistudio.google.com/apikey</b> (sign in with Google → Create API key).</p>
      <label class="f" for="gmKey">Gemini API key</label><input type="password" id="gmKey" value="${esc(a.gemKey)}" placeholder="AIza..." autocomplete="off">
      <label class="f" for="gmModel">Model</label><input type="text" id="gmModel" list="mList" value="${esc(a.gemModel)}"><datalist id="mList"></datalist>
      <p class="tiny faint">Your key stays on this phone.</p>`;
    $("#gmKey").onchange = e => { a.gemKey = e.target.value.trim(); save(); renderChat(); fetchModels("gemini"); };
    fetchModels("gemini");
    $("#gmModel").onchange = e => { a.gemModel = e.target.value.trim() || "gemini-flash-latest"; save(); };
  } else if (a.provider === "nvidia") {
    box.innerHTML = `
      <p class="small muted">NVIDIA gives a free API key (rate-limited, for personal use), but it blocks calls straight from web apps. So it needs a tiny free “bridge” (a Cloudflare Worker) that you make once:</p>
      <ol class="small muted" style="padding-left:18px">
        <li>Get a free key at <b>build.nvidia.com</b> → sign in → any model → “Get API Key”. It starts with <code>nvapi-</code>.</li>
        <li>Make a free account at <b>dash.cloudflare.com</b> → Workers &amp; Pages → Create → Start with Hello World → Deploy → Edit code.</li>
        <li>Delete everything there, paste the code below, press Deploy.</li>
        <li>Copy the worker link (like <code>https://xxx.workers.dev</code>) and paste it below.</li>
      </ol>
      <button class="btn sm" id="copyProxy">Copy bridge code</button>
      <div class="code" style="margin-top:6px">${esc(PROXY_CODE)}</div>
      <label class="f" for="nvKey">NVIDIA API key</label><input type="password" id="nvKey" value="${esc(a.nvKey)}" placeholder="nvapi-..." autocomplete="off">
      <label class="f" for="nvProxy">Bridge link (Cloudflare Worker URL)</label><input type="url" id="nvProxy" value="${esc(a.nvProxy)}" placeholder="https://lift-coach.yourname.workers.dev">
      <label class="f" for="nvModel">Model</label><input type="text" id="nvModel" list="mList" value="${esc(a.nvModel)}"><datalist id="mList">${NV_MODELS.map(m => `<option value="${m}">`).join("")}</datalist>
      <p class="tiny faint">Tap the box to pick another. Good ones: nemotron-3-super (NVIDIA's own), deepseek-v4.1-flash, kimi-k2.6. Your key stays on this phone.</p>`;
    $("#copyProxy").onclick = () => navigator.clipboard?.writeText(PROXY_CODE).then(() => toast("Bridge code copied"), () => toast("Copy failed — select the code and copy"));
    $("#nvKey").onchange = e => { a.nvKey = e.target.value.trim(); save(); renderChat(); };
    $("#nvProxy").onchange = e => { a.nvProxy = e.target.value.trim(); save(); renderChat(); };
    $("#nvModel").onchange = e => { a.nvModel = e.target.value.trim() || "nvidia/nemotron-3-super-120b-a12b"; save(); };
  } else {
    box.innerHTML = `
      <p class="small muted">Groq is free, very fast, and works straight from this app — no bridge needed. Sign up free at <b>console.groq.com/keys</b> → Create API Key → paste it here.</p>
      <label class="f" for="gKey">Groq API key</label><input type="password" id="gKey" value="${esc(a.groqKey)}" placeholder="gsk_..." autocomplete="off">
      <label class="f" for="gModel">Model</label><input type="text" id="gModel" list="mList" value="${esc(a.groqModel)}"><datalist id="mList"></datalist>
      <p class="tiny faint">Your key stays on this phone.</p>`;
    $("#gKey").onchange = e => { a.groqKey = e.target.value.trim(); save(); renderChat(); fetchModels("groq"); };
    fetchModels("groq");
    $("#gModel").onchange = e => { a.groqModel = e.target.value.trim() || "llama-3.3-70b-versatile"; save(); };
  }
}
function aiReady(){
  const a = S.ai;
  return a.provider === "nvidia" ? !!(a.nvKey && a.nvProxy) : a.provider === "groq" ? !!a.groqKey : !!a.gemKey;
}
function renderChat(){
  const c = $("#chat"); if (!c) return;
  if (!aiReady() && !S.chat.length) {
    c.innerHTML = `<div class="msg a"><b>Set up your coach first (one time, free).</b><br>Open <b>⚙️ AI settings</b> below and follow the steps.<br><br>• <b>NVIDIA</b> — the one you asked for. Free key, plus a small free Cloudflare “bridge” (about 5 minutes).<br>• <b>Groq</b> — easiest. Free key, paste and go (about 1 minute).<br>• <b>Gemini</b> — free Google key, paste and go.</div>`;
    const d = $("#aiSet"); if (d) d.open = true;
  } else if (!S.chat.length && !aiBusy) {
    c.innerHTML = `<div class="msg a">Hi! I'm your coach. Ask me about form, a plateau, pain, food, or tell me to review your last workout. I can see your log, so I'll tell you exactly what to do next session.</div>`;
  } else {
    c.innerHTML = S.chat.map(m => m.role === "user" ? `<div class="msg u">${esc(m.content)}</div>` : m.role === "error" ? `<div class="msg a err">⚠️ ${esc(m.content)}</div>` : `<div class="msg a">${mdLite(m.content)}</div>`).join("") + (aiBusy ? `<div class="msg a muted">Coach is thinking<span class="dots"></span></div>` : "");
  }
  const q = $("#qchips"); if (q) q.classList.toggle("hidden", S.chat.length > 0);
  if (tab === "advisor") setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30);
}

// ================= SETTINGS / BACKUP =================
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; });
$("#gear").onclick = () => {
  const nLogs = Object.keys(S.logs).filter(d => hasData(S.logs[d])).length, nJ = Object.keys(S.journal).length;
  sheet("Settings & backup", `
    ${installEvt ? `<div class="card"><b>Install on your phone</b><p class="small muted" style="margin:4px 0 8px">Puts Lift Log on your home screen like a normal app. Needed for timer notifications.</p><button class="btn primary" id="doInstall">Install app</button></div>` : `<div class="card small muted"><b style="color:var(--text)">Install on your phone</b><br>Chrome menu ⋮ → <b>Add to Home screen</b> (or <b>Install app</b>). On iPhone Safari: Share → Add to Home Screen.</div>`}
    <div class="card"><b>Backup</b><p class="small muted" style="margin:4px 0 8px">Your data lives only on this phone (${nLogs} workouts, ${nJ} journal days). Clearing Chrome data deletes it, so save a backup file now and then. API keys are not included.</p>
      <div class="row" style="gap:8px"><button class="btn" id="bkOut">⬇ Save backup</button><label class="btn" style="display:inline-block">⬆ Restore<input type="file" id="bkIn" accept=".json,application/json" hidden></label></div></div>
    <p class="tiny faint" style="text-align:center">Lift Log · works offline · nothing is uploaded except your Advisor questions</p>`, body => {
    const ib = $("#doInstall", body); if (ib) ib.onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; closeSheet(); };
    $("#bkOut", body).onclick = () => {
      const data = clone(S); data.ai = { ...data.ai, nvKey: "", groqKey: "" };
      const blob = new Blob([JSON.stringify({ app: "lift-log", saved: new Date().toISOString(), data }, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `lift-log-backup-${todayIso()}.json`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    };
    $("#bkIn", body).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (j.app !== "lift-log" || !j.data || !j.data.splits) throw new Error();
        if (!confirm("Replace everything in the app with this backup?")) return;
        const keys = { nvKey: S.ai.nvKey, groqKey: S.ai.groqKey };
        S = j.data; S.ai = { ...fresh().ai, ...S.ai, ...keys }; saveNow(); closeSheet(); go(tab); toast("Backup restored ✓");
      } catch (err) { toast("That file isn't a Lift Log backup"); }
    };
  });
};

// ================= START =================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  navigator.serviceWorker.addEventListener("message", e => { if (e.data?.type === "open-tab") go(e.data.tab); });
}
const startTab = new URLSearchParams(location.search).get("tab");
go(TITLES[startTab] ? startTab : "workout");
