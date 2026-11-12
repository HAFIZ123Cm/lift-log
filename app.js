"use strict";
// Lift Log — everything is stored on this phone in localStorage.
const KEY = "liftlog.v1";
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
    v: 2, split: "ppl", splits: clone(DEFAULT_SPLITS), logs: {}, notes: [], moods: {},
    timer: { dur: 180, auto: true }
  };
}
// Bring older saved data up to date (also used when restoring a backup).
function upgrade(s){
  const f = fresh();
  if (!Array.isArray(s.notes)) {
    // v1 journal had one entry per day: { mood, vent, mistakes, lesson } -> separate notes
    s.notes = []; s.moods = {};
    for (const [d, j] of Object.entries(s.journal || {})) {
      if (j.mood) s.moods[d] = j.mood;
      const L = s.logs?.[d], split = L?.split || s.split || "ppl";
      const day = L?.day || s.splits?.[split]?.week[fromIso(d).getDay()] || "rest";
      const base = fromIso(d).getTime() + 12 * 3600e3;
      const add = (cat, text, k) => { if (text && text.trim()) s.notes.push({ id: uid(), date: d, cat, text: text.trim(), ts: base + k, split, day }); };
      add("vent", j.vent, 0); add("learn", j.mistakes && "Mistake: " + j.mistakes, 1); add("learn", j.lesson, 2);
    }
  }
  delete s.journal; delete s.ai; delete s.chat;
  for (const k in f) if (!(k in s)) s[k] = f[k];
  s.timer = { ...f.timer, ...s.timer }; s.v = 2;
  return s;
}
function load(){
  try { const raw = localStorage.getItem(KEY); if (raw) return upgrade(JSON.parse(raw)); } catch (e) {}
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
const TITLES = { workout: "Workout", timer: "Rest Timer", journal: "Journal", lessons: "Lessons" };
function go(t){
  tab = t;
  $$("nav.bottom button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  $$("section.tab").forEach(s => s.classList.toggle("on", s.id === "tab-" + t));
  $("#title").textContent = TITLES[t];
  if (t === "workout") renderWorkout();
  if (t === "timer") renderTimer(true);
  if (t === "journal") renderJournal();
  if (t === "lessons") renderLessons();
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
    sheet(ex.name, `<p>No coach guide is linked to this exercise yet.</p><p class="muted small">Open <b>Edit plan</b> → tap the exercise → choose a guide from the list.</p>`);
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
// Each note: { id, date, cat: "vent" | "learn", text, ts, split, day }.
// Learning notes remember which workout day they came from (push / pull / legs ...).
let jDate = todayIso();
let jCat = "vent";
const MOODS = [["😤", "Angry"], ["😔", "Down"], ["😐", "Okay"], ["🙂", "Good"], ["💪", "Strong"]];
const CATS = { vent: { name: "Venting", icon: "💭" }, learn: { name: "Learning", icon: "📘" } };
const timeOf = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const notesOn = date => S.notes.filter(n => n.date === date).sort((a, b) => a.ts - b.ts);
function tagName(split, day){ return day === "rest" ? "Rest day" : dayName(S.splits[split] ? split : S.split, day); }
// All places a lesson can be filed: days of the current split first, then the other split, then rest.
function tagOptions(){
  const out = [], seen = new Set();
  for (const sp of [S.split, ...Object.keys(S.splits).filter(k => k !== S.split)]) {
    for (const k of Object.keys(S.splits[sp].days)) if (!seen.has(k)) { seen.add(k); out.push({ split: sp, day: k, name: S.splits[sp].days[k].name }); }
  }
  out.push({ split: S.split, day: "rest", name: "Rest day / other" });
  return out;
}
function tagSelect(id, cur){
  return `<select id="${id}">${tagOptions().map(o => `<option value="${o.split}:${o.day}" ${o.day === cur.day ? "selected" : ""}>${esc(o.name)}</option>`).join("")}</select>`;
}
const readTag = v => { const [split, day] = v.split(":"); return { split, day }; };
function addNote(date, cat, text, tag){
  const t = tag || dayFor(date);
  const ts = date === todayIso() ? Date.now() : fromIso(date).getTime() + 12 * 3600e3 + S.notes.length;
  const n = { id: uid(), date, cat, text, ts, split: t.split, day: t.day };
  S.notes.push(n); save(); return n;
}
function noteBadge(n){
  const c = CATS[n.cat];
  const tag = n.cat === "learn" ? ` · <span style="color:${DAY_COLORS[n.day] || "var(--muted)"}">${esc(tagName(n.split, n.day))}</span>` : "";
  return `<span class="nbadge ${n.cat}">${c.icon} ${c.name}${tag}</span>`;
}

function renderJournal(){
  const el = $("#tab-journal");
  const d = fromIso(jDate), isToday = jDate === todayIso();
  const mood = S.moods[jDate] || "";
  const today = dayFor(jDate);
  const list = notesOn(jDate);
  const pastDates = [...new Set([...S.notes.map(n => n.date), ...Object.keys(S.moods).filter(k => S.moods[k])])].filter(k => k !== jDate).sort().reverse();
  el.innerHTML = `
    <div class="card">
      <div class="row between">
        <button class="icon-btn" id="jPrev" aria-label="Previous day">‹</button>
        <div style="text-align:center"><b>${isToday ? "Today" : DOW_LONG[d.getDay()]}</b><div class="small muted">${d.getDate()} ${MON_LONG[d.getMonth()]} ${d.getFullYear()} · ${esc(tagName(today.split, today.day))}</div></div>
        <button class="icon-btn" id="jNext" aria-label="Next day" ${isToday ? "disabled style='opacity:.35'" : ""}>›</button>
      </div>
      <label class="f">How do you feel?</label>
      <div class="moods">${MOODS.map(([e, n]) => `<button data-mood="${n}" class="${mood === n ? "on" : ""}">${e} ${n}</button>`).join("")}</div>
    </div>
    <div class="card">
      <div class="seg" style="margin-bottom:10px">${Object.entries(CATS).map(([k, c]) => `<button data-cat="${k}" class="${jCat === k ? "on" : ""}">${c.icon} ${c.name}</button>`).join("")}</div>
      ${jCat === "learn"
        ? `<label class="f" for="jTag" style="margin-top:0">Goes to Lessons → <b>${esc(tagName(today.split, today.day))}</b> (today's workout). Change if needed:</label>${tagSelect("jTag", today)}`
        : `<p class="small muted" style="margin:0 0 8px">Let it all out. Nobody reads this but you.</p>`}
      <textarea id="jText" style="margin-top:8px" placeholder="${jCat === "learn" ? "What did you learn or get wrong today? e.g. Elbows flared on bench — tuck them next time." : "What's on your mind?"}"></textarea>
      <button class="btn primary" id="jAdd" style="width:100%;margin-top:8px">+ Add ${CATS[jCat].name.toLowerCase()} note</button>
    </div>
    <div class="card"><h3 style="margin-bottom:6px">${isToday ? "Today's" : "This day's"} notes (${list.length})</h3>
      ${list.length ? list.map(n => `<div class="note">
        <div class="row between"><div>${noteBadge(n)}</div><span class="tiny faint">${timeOf(n.ts)}</span></div>
        <div class="ntext">${esc(n.text)}</div>
        <div class="row" style="gap:6px;margin-top:6px"><button class="btn sm" data-edit="${n.id}">Edit</button></div>
      </div>`).join("") : `<p class="small muted" style="margin:0">No notes yet. Add as many as you want.</p>`}
    </div>
    <div class="card"><h3 style="margin-bottom:4px">Other days</h3>
      ${pastDates.length ? `<div class="jlist">${pastDates.slice(0, 60).map(k => {
        const ns = S.notes.filter(n => n.date === k), m = MOODS.find(mm => mm[1] === S.moods[k]);
        const v = ns.filter(n => n.cat === "vent").length, l = ns.length - v;
        const first = (ns[0]?.text || "").split("\n")[0].slice(0, 70);
        return `<button data-jd="${k}"><b>${niceDate(k)}</b> ${m ? m[0] : ""} <span class="tiny faint">${v ? `💭 ${v}` : ""} ${l ? `📘 ${l}` : ""}</span><div class="small muted">${esc(first) || "—"}</div></button>`;
      }).join("")}</div>` : `<p class="small muted" style="margin:4px 0 0">Nothing yet.</p>`}
    </div>`;
  $$("[data-mood]", el).forEach(b => b.onclick = () => { S.moods[jDate] = S.moods[jDate] === b.dataset.mood ? "" : b.dataset.mood; save(); renderJournal(); });
  $$("[data-cat]", el).forEach(b => b.onclick = () => { const t = $("#jText").value; jCat = b.dataset.cat; renderJournal(); $("#jText").value = t; });
  $("#jAdd").onclick = () => {
    const text = $("#jText").value.trim();
    if (!text) { toast("Write something first"); return; }
    const tag = jCat === "learn" ? readTag($("#jTag").value) : dayFor(jDate);
    addNote(jDate, jCat, text, tag); renderJournal();
    toast(jCat === "learn" ? `Saved to Lessons → ${tagName(tag.split, tag.day)}` : "Saved");
  };
  $$("[data-edit]", el).forEach(b => b.onclick = () => openNoteEditor(b.dataset.edit, renderJournal));
  $("#jPrev").onclick = () => { const x = fromIso(jDate); x.setDate(x.getDate() - 1); jDate = iso(x); renderJournal(); };
  $("#jNext").onclick = () => { if (isToday) return; const x = fromIso(jDate); x.setDate(x.getDate() + 1); jDate = iso(x); renderJournal(); };
  $$("[data-jd]", el).forEach(b => b.onclick = () => { jDate = b.dataset.jd; renderJournal(); window.scrollTo(0, 0); });
}
function openNoteEditor(id, after){
  const n = S.notes.find(x => x.id === id); if (!n) return;
  sheet("Edit note", `
    <div class="small muted" style="margin-bottom:8px">${niceDate(n.date)} · ${timeOf(n.ts)}</div>
    <label class="f" for="neCat" style="margin-top:0">Type</label>
    <select id="neCat">${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === n.cat ? "selected" : ""}>${c.icon} ${c.name}</option>`).join("")}</select>
    <div id="neTagBox" class="${n.cat === "learn" ? "" : "hidden"}"><label class="f" for="neTag">Lesson for</label>${tagSelect("neTag", n)}</div>
    <label class="f" for="neText">Note</label>
    <textarea id="neText" style="min-height:140px">${esc(n.text)}</textarea>
    <div class="row" style="margin-top:14px;gap:8px">
      <button class="btn danger" id="neDel">Delete</button>
      <button class="btn" data-close style="margin-left:auto">Cancel</button>
      <button class="btn primary" id="neSave">Save</button>
    </div>`, body => {
    $("#neCat", body).onchange = e => $("#neTagBox", body).classList.toggle("hidden", e.target.value !== "learn");
    $("#neDel", body).onclick = () => { if (!confirm("Delete this note?")) return; S.notes = S.notes.filter(x => x.id !== id); save(); closeSheet(); after(); };
    $("#neSave", body).onclick = () => {
      const text = $("#neText", body).value.trim(); if (!text) { toast("Note is empty"); return; }
      n.text = text; n.cat = $("#neCat", body).value;
      if (n.cat === "learn") Object.assign(n, readTag($("#neTag", body).value));
      save(); closeSheet(); after(); toast("Saved");
    };
  });
}

// ================= LESSONS =================
// Every "Learning" note from the journal, sorted into the workout day it belongs to.
let lTab = null;
function lessonTabs(){
  const opts = tagOptions(), used = new Set(S.notes.filter(n => n.cat === "learn").map(n => n.day));
  const cur = Object.keys(S.splits[S.split].days);
  return opts.filter(o => cur.includes(o.day) || used.has(o.day));
}
function renderLessons(){
  const el = $("#tab-lessons"), tabs = lessonTabs();
  if (!lTab || !tabs.some(t => t.day === lTab)) {
    const t = dayFor(todayIso()).day;
    lTab = tabs.some(x => x.day === t) ? t : tabs[0].day;
  }
  const curTab = tabs.find(t => t.day === lTab);
  const items = S.notes.filter(n => n.cat === "learn" && n.day === lTab).sort((a, b) => b.ts - a.ts);
  const count = k => S.notes.filter(n => n.cat === "learn" && n.day === k).length;
  el.innerHTML = `
    <div class="subtabs">${tabs.map(t => `<button data-lt="${t.day}" class="${t.day === lTab ? "on" : ""}" style="--dc:${DAY_COLORS[t.day] || "var(--muted)"}">${esc(t.name)}<span>${count(t.day)}</span></button>`).join("")}</div>
    <div class="card">
      <label class="f" for="lText" style="margin-top:0">Add a ${esc(curTab.name)} lesson</label>
      <textarea id="lText" style="min-height:70px" placeholder="e.g. Pause at the bottom of every rep — no bouncing."></textarea>
      <button class="btn primary" id="lAdd" style="width:100%;margin-top:8px">+ Add lesson</button>
      <p class="tiny faint" style="margin:6px 0 0">Lessons you write in Journal → Learning land here by themselves.</p>
    </div>
    ${items.length ? items.map(n => `<div class="card lesson" style="border-left:4px solid ${DAY_COLORS[n.day] || "var(--line)"}">
      <div class="ntext" style="margin-top:0">${esc(n.text)}</div>
      <div class="row between" style="margin-top:8px"><button class="linkish small" data-goj="${n.date}">📅 ${niceDate(n.date)}</button><button class="btn sm" data-edit="${n.id}">Edit</button></div>
    </div>`).join("") : `<div class="card small muted">No ${esc(curTab.name)} lessons yet. After a ${esc(curTab.name)} session, write what you learned in Journal → Learning.</div>`}`;
  $$("[data-lt]", el).forEach(b => b.onclick = () => { lTab = b.dataset.lt; renderLessons(); });
  $("#lAdd").onclick = () => {
    const text = $("#lText").value.trim(); if (!text) { toast("Write something first"); return; }
    addNote(todayIso(), "learn", text, { split: curTab.split, day: curTab.day }); renderLessons(); toast("Lesson saved");
  };
  $$("[data-edit]", el).forEach(b => b.onclick = () => openNoteEditor(b.dataset.edit, renderLessons));
  $$("[data-goj]", el).forEach(b => b.onclick = () => { jDate = b.dataset.goj; jCat = "learn"; go("journal"); });
}

// ================= SETTINGS / BACKUP =================
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; });
$("#gear").onclick = () => {
  const nLogs = Object.keys(S.logs).filter(d => hasData(S.logs[d])).length, nJ = S.notes.length;
  sheet("Settings & backup", `
    ${installEvt ? `<div class="card"><b>Install on your phone</b><p class="small muted" style="margin:4px 0 8px">Puts Lift Log on your home screen like a normal app. Needed for timer notifications.</p><button class="btn primary" id="doInstall">Install app</button></div>` : `<div class="card small muted"><b style="color:var(--text)">Install on your phone</b><br>Chrome menu ⋮ → <b>Add to Home screen</b> (or <b>Install app</b>). On iPhone Safari: Share → Add to Home Screen.</div>`}
    <div class="card"><b>Backup</b><p class="small muted" style="margin:4px 0 8px">Your data lives only on this phone (${nLogs} workouts, ${nJ} journal notes). Clearing Chrome data deletes it, so save a backup file now and then.</p>
      <div class="row" style="gap:8px"><button class="btn" id="bkOut">⬇ Save backup</button><label class="btn" style="display:inline-block">⬆ Restore<input type="file" id="bkIn" accept=".json,application/json" hidden></label></div></div>
    <p class="tiny faint" style="text-align:center">Lift Log · works offline · nothing is uploaded</p>`, body => {
    const ib = $("#doInstall", body); if (ib) ib.onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; closeSheet(); };
    $("#bkOut", body).onclick = () => {
      const data = clone(S);
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
        S = upgrade(j.data); saveNow(); closeSheet(); go(tab); toast("Backup restored ✓");
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
