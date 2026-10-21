// Map projection: x = (lon + 5.5) * 28, y = (51.5 - lat) * 40
const project = ([lon, lat]) => [(lon + 5.5) * 28, (51.5 - lat) * 40];

const FRANCE = [
  [-4.8, 48.4], [-1.5, 48.7], [-1.9, 49.7], [1.5, 50.1], [2.5, 51.1], [4.2, 50.0],
  [5.8, 49.5], [8.2, 49.0], [7.6, 47.6], [6.0, 46.2], [7.0, 45.9], [7.6, 44.1],
  [6.9, 43.5], [4.8, 43.4], [3.0, 42.5], [1.8, 42.5], [-1.8, 43.4], [-1.2, 45.5],
  [-1.1, 46.2], [-2.2, 47.2], [-4.3, 47.8]
];

const PLACES = {
  versailles: { name: "Versailles", lonlat: [2.12, 48.8], dx: -10, dy: 20, anchor: "end" },
  paris: { name: "Paris", lonlat: [2.35, 48.86], dx: 10, dy: -8, anchor: "start" },
  varennes: { name: "Varennes", lonlat: [5.19, 49.23], dx: 10, dy: 4, anchor: "start" }
};

const EVENTS = [
  { date: "5 May 1789", short: "May 1789", title: "Estates-General opens", place: "versailles",
    summary: "King Louis XVI calls representatives of the three Estates to Versailles to solve the money crisis. It is the first such meeting since 1614.",
    why: "The Third Estate arrives demanding that votes be counted by head, not by order. The argument starts the revolution." },
  { date: "20 June 1789", short: "June 1789", title: "Tennis Court Oath", place: "versailles",
    summary: "Locked out of their hall, Third Estate deputies meet on a royal tennis court and swear not to separate until France has a constitution.",
    why: "Ordinary people's representatives claim to speak for the nation, not the king." },
  { date: "14 July 1789", short: "July 1789", title: "Storming of the Bastille", place: "paris",
    summary: "Parisians, afraid of royal troops, seize weapons and attack the Bastille fortress-prison, which holds few prisoners but symbolizes royal power.",
    why: "It shows that the people can defeat the king's authority. 14 July is still France's national day." },
  { date: "26 August 1789", short: "Aug 1789", title: "Declaration of the Rights of Man", place: "versailles",
    summary: "The National Assembly adopts a statement that all men are born free and equal in rights, and that power comes from the nation.",
    why: "It ends legal privilege in principle and becomes a model for later human-rights texts." },
  { date: "5–6 October 1789", short: "Oct 1789", title: "Women's March on Versailles", place: "versailles", routes: "march",
    summary: "Thousands of Parisian women, angry about bread prices, march to Versailles. The next day the royal family is brought to Paris.",
    why: "The king now lives among the people and under their pressure." },
  { date: "20–21 June 1791", short: "June 1791", title: "Flight to Varennes", place: "varennes", routes: "flight",
    summary: "The royal family tries to escape toward the eastern border in disguise, but is recognized and stopped at Varennes.",
    why: "Many French stop trusting the king, and the idea of a republic grows." },
  { date: "21–22 September 1792", short: "Sep 1792", title: "The Republic is proclaimed", place: "paris",
    summary: "With France at war and the king in prison, the new National Convention abolishes the monarchy and declares France a republic.",
    why: "For the first time France has no king." },
  { date: "21 January 1793", short: "Jan 1793", title: "Louis XVI is executed", place: "paris",
    summary: "The Convention finds the former king guilty of treason. He is guillotined in Paris.",
    why: "It shocks Europe's monarchies and deepens the war and the divisions inside France." },
  { date: "Sept 1793 – July 1794", short: "1793–94", title: "The Reign of Terror", place: "paris",
    summary: "Fearing enemies at home and abroad, the Committee of Public Safety, led by Robespierre, uses special courts and the guillotine against suspected opponents.",
    why: "About 16,600 official death sentences were passed, and many more people died without trial or in prison. The Terror helped the republic raise armies but frightened its own supporters." },
  { date: "27 July 1794", short: "Jul 1794", title: "Fall of Robespierre", place: "paris",
    summary: "On 9 Thermidor in the revolutionary calendar, deputies turn on Robespierre. He is arrested and guillotined the next day.",
    why: "The Terror ends and a calmer, more cautious phase begins." },
  { date: "Autumn 1795", short: "Nov 1795", title: "The Directory takes over", place: "paris",
    summary: "A new constitution creates a five-man Directory and two councils, meant to prevent both kings and dictators.",
    why: "The Directory is weak and unpopular and relies on the army more and more." },
  { date: "9 November 1799", short: "Nov 1799", title: "Napoleon's coup (18 Brumaire)", place: "paris",
    summary: "General Napoleon Bonaparte and allies overthrow the Directory and set up a new government, the Consulate, with Napoleon at its head.",
    why: "Most historians use this date to mark the end of the Revolution." }
];

// Power bands: start/end as decimal years (May 1789 to Nov 1799)
const POWER = [
  { name: "National Assembly", note: "Constitutional monarchy", from: 1789.4, to: 1792.7, color: "#3b6fd8" },
  { name: "Convention", note: "Republic, the Terror", from: 1792.7, to: 1795.8, color: "#e0453f" },
  { name: "Directory", note: "Five directors", from: 1795.8, to: 1799.85, color: "#8a5fd0" }
];

// Routes are approximate: straight lines between the main stops.
const PARIS = [2.35, 48.86];
const ROUTES = {
  flight: {
    target: "main", dy: 5, caption: "Flight route (approximate). Red: the escape east. Gold: the family is brought back to Paris.",
    out: [PARIS, [2.88, 48.96], [4.37, 48.96], [4.9, 49.09], [5.19, 49.23]]
  },
  march: {
    target: "inset", dy: 7, caption: "Zoom: Paris to Versailles, about 20 km. Red: the women march out. Gold: the royal family is brought to Paris.",
    out: [[2.35, 48.857], [2.21, 48.824], [2.12, 48.805]]
  }
};
const projectInset = ([lon, lat]) => [(lon - 2.05) * 876, (48.9 - lat) * 1332];
const INSET_PLACES = {
  paris: { name: "Paris", lonlat: [2.35, 48.857], dx: -10, dy: -10, anchor: "end" },
  versailles: { name: "Versailles", lonlat: [2.12, 48.805], dx: 10, dy: 22, anchor: "start" }
};

const STAGES = [
  { name: "Absolute monarchy", note: "The king rules alone." },
  { name: "Constitutional monarchy", note: "The king shares power with an elected Assembly." },
  { name: "Republic", note: "No king. The Convention governs." },
  { name: "Terror", note: "The Committee of Public Safety governs by emergency rule." },
  { name: "Thermidor", note: "The Convention, without Robespierre, governs more cautiously." },
  { name: "Directory", note: "Five directors and two councils share power." },
  { name: "Consulate", note: "Napoleon holds the real power." }
];
const STAGE_OF = [0, 0, 1, 1, 1, 1, 2, 2, 3, 4, 5, 6];
const STEP_MS = 6000;

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
let current = 0;

// ---------- Map ----------
$("france").setAttribute("points", FRANCE.map((p) => project(p).join(",")).join(" "));
const svgNS = "http://www.w3.org/2000/svg";
for (const [key, p] of Object.entries(PLACES)) {
  const [x, y] = project(p.lonlat);
  const g = document.createElementNS(svgNS, "g");
  g.setAttribute("class", "pin");
  g.dataset.place = key;
  g.innerHTML = `<circle class="pulse" cx="${x}" cy="${y}" r="8"></circle>
    <circle class="core" cx="${x}" cy="${y}" r="5"></circle>
    <text x="${x + p.dx}" y="${y + p.dy}" text-anchor="${p.anchor}">${p.name}</text>`;
  $("map").appendChild(g);
}

function addPins(svg, places, proj) {
  for (const [key, p] of Object.entries(places)) {
    const [x, y] = proj(p.lonlat);
    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("class", "pin");
    g.dataset.place = key;
    g.innerHTML = `<circle class="pulse" cx="${x}" cy="${y}" r="8"></circle>
      <circle class="core" cx="${x}" cy="${y}" r="5"></circle>
      <text x="${x + p.dx}" y="${y + p.dy}" text-anchor="${p.anchor}">${p.name}</text>`;
    svg.appendChild(g);
  }
}
addPins($("inset"), INSET_PLACES, projectInset);

function pathD(pts, proj, dy) {
  return pts.map((p, i) => { const [x, y] = proj(p); return `${i ? "L" : "M"}${x.toFixed(1)} ${(y + dy).toFixed(1)}`; }).join(" ");
}
function drawRoutes(key) {
  document.querySelectorAll(".route").forEach((n) => n.remove());
  const r = key && ROUTES[key];
  const inset = r && r.target === "inset";
  $("inset-box").hidden = !inset;
  $("map-caption").textContent = r ? r.caption : "Where it happened";
  if (!r) return;
  const svg = $(inset ? "inset" : "map");
  const proj = inset ? projectInset : project;
  const legs = [
    { cls: "out", d: pathD(r.out, proj, 0), delay: 0.2 },
    { cls: "back", d: pathD([...r.out].reverse(), proj, r.dy), delay: 2.4 }
  ];
  legs.forEach((leg) => {
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("class", "route " + leg.cls);
    path.setAttribute("d", leg.d);
    path.setAttribute("pathLength", "1");
    path.style.animationDelay = leg.delay + "s";
    svg.insertBefore(path, svg.querySelector(".pin"));
  });
}

// ---------- Power stages ----------
const stagesEl = $("stages");
STAGES.forEach((st, i) => {
  const li = document.createElement("li");
  li.textContent = st.name;
  li.dataset.i = i;
  stagesEl.appendChild(li);
});

// ---------- Timeline ----------
const track = $("track");
EVENTS.forEach((ev, i) => {
  const li = document.createElement("li");
  li.innerHTML = `<button type="button" class="node" data-i="${i}">
      <span class="dot"></span><span class="n-date">${ev.short}</span><span class="n-title">${ev.title}</span></button>`;
  track.appendChild(li);
});

function select(i, { scroll = true } = {}) {
  current = Math.max(0, Math.min(EVENTS.length - 1, i));
  const ev = EVENTS[current];
  $("d-date").textContent = ev.date;
  $("d-title").textContent = ev.title;
  $("d-place").textContent = "📍 " + PLACES[ev.place].name;
  $("d-summary").textContent = ev.summary;
  $("d-why").textContent = ev.why;
  $("counter").textContent = `${current + 1} / ${EVENTS.length}`;
  $("prev").disabled = current === 0;
  $("next").disabled = current === EVENTS.length - 1;

  document.querySelectorAll(".node").forEach((n) => {
    if (Number(n.dataset.i) === current) n.setAttribute("aria-current", "true");
    else n.removeAttribute("aria-current");
  });
  document.querySelectorAll(".pin").forEach((p) => p.classList.toggle("active", p.dataset.place === ev.place || (ev.routes === "march" && !!p.closest("#inset"))));
  drawRoutes(ev.routes);
  const stage = STAGE_OF[current];
  stagesEl.querySelectorAll("li").forEach((li) => {
    const n = Number(li.dataset.i);
    li.classList.toggle("on", n === stage);
    li.classList.toggle("past", n < stage);
  });
  $("stage-note").innerHTML = `<strong>${STAGES[stage].name}:</strong> ${STAGES[stage].note}`;

  const d = $("detail");
  d.classList.remove("swap");
  if (!reduce) { void d.offsetWidth; d.classList.add("swap"); }
  if (scroll) {
    const wrap = document.querySelector(".timeline-wrap");
    const li = track.children[current];
    wrap.scrollTo({ left: li.offsetLeft - (wrap.clientWidth - li.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }
}

// ---------- Autoplay ----------
let timer = null;
function setPlaying(on) {
  clearTimeout(timer);
  const b = $("play");
  b.setAttribute("aria-pressed", String(on));
  b.textContent = on ? "⏸ Pause" : "▶ Autoplay";
  $("progress").hidden = !on;
  if (on) {
    if (current === EVENTS.length - 1) select(0);
    schedule();
  }
}
function schedule() {
  clearTimeout(timer);
  const bar = $("progress").firstElementChild;
  bar.style.animation = "none";
  void bar.offsetWidth;
  bar.style.animation = "";
  timer = setTimeout(() => {
    if (current >= EVENTS.length - 1) { setPlaying(false); return; }
    select(current + 1);
    schedule();
  }, STEP_MS);
}
const userSelect = (i, opts) => { setPlaying(false); select(i, opts); };
$("play").addEventListener("click", () => setPlaying($("play").getAttribute("aria-pressed") !== "true"));

track.addEventListener("click", (e) => {
  const b = e.target.closest(".node");
  if (b) userSelect(Number(b.dataset.i));
});
$("prev").addEventListener("click", () => userSelect(current - 1));
$("next").addEventListener("click", () => userSelect(current + 1));
document.addEventListener("keydown", (e) => {
  if (e.target.closest("button") && !e.target.closest(".node")) return;
  if (e.key === "ArrowRight") { e.preventDefault(); userSelect(current + 1); document.querySelector(`.node[data-i="${current}"]`).focus({ preventScroll: true }); }
  if (e.key === "ArrowLeft") { e.preventDefault(); userSelect(current - 1); document.querySelector(`.node[data-i="${current}"]`).focus({ preventScroll: true }); }
});
select(0, { scroll: false });

// ---------- Bar charts ----------
function fillBars(root) {
  root.querySelectorAll(".bars").forEach((bars) => {
    const max = Number(bars.dataset.max);
    bars.querySelectorAll(".fill").forEach((f) => { f.style.width = (Number(f.dataset.value) / max) * 100 + "%"; });
  });
}

// ---------- Estates ----------
const SEATS = { clergy: 291, nobles: 270, third: 578 };
const MAX_SEATS = 578;
const estateCaption = {
  order: "By order, each Estate gets one vote. Clergy and nobles can outvote the Third Estate 2 to 1, even though the Third Estate is about 98% of France.",
  head: "By head, every deputy counts. The Third Estate has 578 of 1,139 seats and, with a few allies, can win."
};
function setEstates(mode) {
  document.querySelectorAll(".toggle button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  document.querySelectorAll(".estate").forEach((row) => {
    const key = ["clergy", "nobles", "third"].find((k) => row.classList.contains(k));
    const f = row.querySelector(".fill");
    f.style.width = (mode === "order" ? 100 : (SEATS[key] / MAX_SEATS) * 100) + "%";
    row.querySelector(".votes").textContent = mode === "order" ? "1 vote" : SEATS[key] + " votes";
  });
  $("estates-caption").textContent = estateCaption[mode];
}
document.querySelector(".toggle").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) setEstates(b.dataset.mode);
});

// ---------- Power bands ----------
const power = $("power-chart");
POWER.forEach((p) => {
  const d = document.createElement("div");
  d.className = "band";
  d.style.background = p.color;
  d.dataset.w = p.to - p.from;
  d.innerHTML = `<span>${p.name}</span><small>${p.note}</small>`;
  power.appendChild(d);
});
function growBands() {
  const bands = [...power.querySelectorAll(".band")];
  const total = bands.reduce((s, b) => s + Number(b.dataset.w), 0);
  bands.forEach((b) => { b.style.width = (Number(b.dataset.w) / total) * 100 + "%"; });
}

// ---------- Reveal on scroll ----------
const triggers = {
  why: () => fillBars(document.getElementById("why")),
  estates: () => setEstates("order"),
  power: growBands
};
setEstates("order");
document.querySelectorAll(".estate .fill").forEach((f) => (f.style.width = "0"));

if (reduce || !("IntersectionObserver" in window)) {
  document.querySelectorAll(".reveal").forEach((s) => { s.classList.add("in"); triggers[s.id]?.(); });
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      triggers[en.target.id]?.();
      if (en.target.id === "estates") setEstates("order");
      io.unobserve(en.target);
    });
  }, { threshold: 0.2 });
  document.querySelectorAll(".reveal").forEach((s) => io.observe(s));
}
