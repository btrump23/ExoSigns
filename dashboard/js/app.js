(function () {
  "use strict";

  const STORE_KEY = "exo-ops-v1";
  const C = window.EXO_DATA;
  if (!C) {
    document.getElementById("main").innerHTML = "<p class=\"empty\">Dashboard data failed to load.</p>";
    return;
  }

  const VIEWS = ["today", "leads", "todo", "projects", "financials"];
  const FIN = ["weekly", "monthly", "yearly"];

  const state = { data: null };
  const ui = {
    view: "today",
    leadQuery: "",
    leadType: "all",
    leadWait: "all",
    taskFilter: "open",
    taskOwner: "all",
    projectFilter: "active",
    projectSort: "date-asc",
    finPeriod: "weekly"
  };

  function today() {
    return C.startOfDay(new Date());
  }

  function parseISO(s) {
    if (!s) return null;
    const p = String(s).split("-");
    if (p.length < 3) return null;
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function daysBetween(a, b) {
    const ms = C.startOfDay(b).getTime() - C.startOfDay(a).getTime();
    return Math.round(ms / 86400000);
  }

  function fmtDate(s) {
    const d = parseISO(s);
    if (!d) return "—";
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  }

  function money(n) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0
    }).format(Number(n) || 0);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch];
    });
  }

  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function isWaiting(lead) {
    return !lead.respondedAt;
  }

  function waitingDays(lead, now) {
    const start = parseISO(lead.receivedAt);
    if (!start) return 0;
    const end = lead.respondedAt ? parseISO(lead.respondedAt) : (now || today());
    return Math.max(0, daysBetween(start, end));
  }

  function waitTone(lead, now) {
    if (!isWaiting(lead)) return "ok";
    const d = waitingDays(lead, now);
    if (d >= 3) return "red";
    if (d === 2) return "amber";
    return "ok";
  }

  function staleLeads(now) {
    return waitingLeads(now).filter(function (lead) {
      return waitingDays(lead, now) >= 3;
    });
  }

  function waitLabel(lead, now) {
    const d = waitingDays(lead, now);
    if (!isWaiting(lead)) {
      return d === 0 ? "Same day" : (d === 1 ? "Replied in 1 day" : "Replied in " + d + " days");
    }
    if (d === 0) return "Today";
    if (d === 1) return "1 day waiting";
    return d + " days waiting";
  }

  function inThisWeek(iso, now) {
    const d = parseISO(iso);
    if (!d) return false;
    const start = C.startOfWeek(now);
    const end = C.addDays(start, 7);
    return d >= start && d < end;
  }

  function inThisMonth(iso, now) {
    const d = parseISO(iso);
    if (!d) return false;
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  function waitingLeads(now) {
    return state.data.leads
      .filter(isWaiting)
      .sort(function (a, b) {
        const diff = waitingDays(b, now) - waitingDays(a, now);
        if (diff) return diff;
        return String(a.receivedAt).localeCompare(String(b.receivedAt));
      });
  }

  function typeCounts(list) {
    const counts = {};
    C.TYPES.forEach(function (t) { counts[t] = 0; });
    list.forEach(function (item) {
      if (counts[item.type] == null) counts[item.type] = 0;
      counts[item.type] += 1;
    });
    return counts;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return C.createSampleState(new Date());
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.leads) || !Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
        return C.createSampleState(new Date());
      }
      if (!data.financials || !data.financials.weeks) {
        const fresh = C.createSampleState(new Date());
        data.financials = fresh.financials;
      }
      return data;
    } catch (err) {
      return C.createSampleState(new Date());
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.data));
    } catch (err) {
      toast("Could not save in this browser.");
    }
  }

  function applyHash() {
    const raw = (location.hash || "#today").replace(/^#/, "");
    const parts = raw.split("/");
    const view = parts[0] || "today";
    ui.view = VIEWS.indexOf(view) >= 0 ? view : "today";
    if (ui.view === "financials" && FIN.indexOf(parts[1]) >= 0) {
      ui.finPeriod = parts[1];
    }
    if (ui.view === "leads") {
      if (parts[1] === "stale" || parts[1] === "waiting" || parts[1] === "responded") ui.leadWait = parts[1];
      else ui.leadWait = "all";
    }
  }

  function setHash(view, sub) {
    const next = sub ? "#" + view + "/" + sub : "#" + view;
    if (location.hash !== next) location.hash = next;
    else {
      applyHash();
      render();
    }
  }

  function toast(msg) {
    document.querySelectorAll(".toast").forEach(function (el) { el.remove(); });
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2500);
  }

  function closeDialogs() {
    document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });
  }

  function fillSelect(sel, items, selected) {
    sel.innerHTML = items.map(function (item) {
      const val = typeof item === "string" ? item : item.value;
      const lab = typeof item === "string" ? item : item.label;
      return "<option value=\"" + esc(val) + "\"" + (val === selected ? " selected" : "") + ">" + esc(lab) + "</option>";
    }).join("");
  }

  function setupForms() {
    const leadForm = document.querySelector("#dlg-lead form");
    fillSelect(leadForm.elements.type, C.TYPES);
    fillSelect(leadForm.elements.source, C.SOURCES);
    const taskForm = document.querySelector("#dlg-task form");
    fillSelect(taskForm.elements.owner, C.OWNERS);
    fillSelect(taskForm.elements.priority, C.PRIORITIES, "Medium");
    const projForm = document.querySelector("#dlg-project form");
    fillSelect(projForm.elements.type, C.TYPES);
    fillSelect(projForm.elements.stage, C.STAGES);
    fillSelect(projForm.elements.status, C.PROJECT_STATUSES, "On track");
  }

  function openLeadForm() {
    const form = document.querySelector("#dlg-lead form");
    form.reset();
    form.elements.receivedAt.value = C.toISO(today());
    document.getElementById("dlg-lead").showModal();
    form.elements.name.focus();
  }

  function openTaskForm() {
    const form = document.querySelector("#dlg-task form");
    form.reset();
    fillSelect(form.elements.owner, C.OWNERS);
    fillSelect(form.elements.priority, C.PRIORITIES, "Medium");
    form.elements.dueAt.value = C.toISO(today());
    document.getElementById("dlg-task").showModal();
    form.elements.title.focus();
  }

  function openProjectForm() {
    const form = document.querySelector("#dlg-project form");
    form.reset();
    fillSelect(form.elements.type, C.TYPES);
    fillSelect(form.elements.stage, C.STAGES, "Quote sent");
    fillSelect(form.elements.status, C.PROJECT_STATUSES, "On track");
    form.elements.startAt.value = C.toISO(C.addDays(today(), 7));
    form.elements.value.value = "0";
    document.getElementById("dlg-project").showModal();
    form.elements.client.focus();
  }

  function openConvert(id) {
    const lead = state.data.leads.find(function (l) { return l.id === id; });
    if (!lead) return;
    const form = document.querySelector("#dlg-convert form");
    form.elements.leadId.value = lead.id;
    form.elements.startAt.value = C.toISO(C.addDays(today(), 7));
    form.elements.value.value = "0";
    document.getElementById("convert-summary").textContent =
      lead.business + " — " + lead.type + " for " + lead.name + ".";
    document.getElementById("dlg-convert").showModal();
  }

  function markResponded(id) {
    const lead = state.data.leads.find(function (l) { return l.id === id; });
    if (!lead || lead.respondedAt) return;
    lead.respondedAt = C.toISO(today());
    if (lead.status === "New") lead.status = "Contacted";
    saveState();
    render();
    toast("Marked " + lead.business + " as responded.");
  }

  function convertLead(leadId, startAt, value) {
    const lead = state.data.leads.find(function (l) { return l.id === leadId; });
    if (!lead) return;
    if (!lead.respondedAt) lead.respondedAt = C.toISO(today());
    lead.status = "Won";
    state.data.projects.push({
      id: uid("P"),
      client: lead.business,
      contact: lead.name,
      type: lead.type,
      stage: "Quote sent",
      startAt: startAt,
      value: Number(value) || 0,
      status: "On track"
    });
    saveState();
    closeDialogs();
    setHash("projects");
    toast(lead.business + " moved to projects.");
  }

  function addLead(fields) {
    state.data.leads.unshift({
      id: uid("L"),
      name: fields.name.trim(),
      business: fields.business.trim(),
      type: fields.type,
      source: fields.source,
      receivedAt: fields.receivedAt,
      respondedAt: null,
      status: "New",
      notes: (fields.notes || "").trim()
    });
    saveState();
    closeDialogs();
    setHash("leads");
    toast("Lead added.");
  }

  function addTask(fields) {
    state.data.tasks.unshift({
      id: uid("T"),
      title: fields.title.trim(),
      owner: fields.owner,
      dueAt: fields.dueAt,
      priority: fields.priority,
      linked: (fields.linked || "").trim(),
      done: false
    });
    saveState();
    closeDialogs();
    setHash("todo");
    toast("Task added.");
  }

  function addProject(fields) {
    state.data.projects.unshift({
      id: uid("P"),
      client: fields.client.trim(),
      contact: (fields.contact || "").trim(),
      type: fields.type,
      stage: fields.stage,
      startAt: fields.startAt,
      value: Number(fields.value) || 0,
      status: fields.status
    });
    saveState();
    closeDialogs();
    setHash("projects");
    toast("Project added.");
  }

  function toggleTask(id, done) {
    const task = state.data.tasks.find(function (t) { return t.id === id; });
    if (!task) return;
    task.done = done;
    saveState();
    render();
  }

  function renderKpis(now) {
    const waiting = waitingLeads(now);
    const overdueTasks = state.data.tasks.filter(function (t) {
      return !t.done && parseISO(t.dueAt) && parseISO(t.dueAt) < now;
    });
    const weekStart = C.startOfWeek(now);
    const weekEnd = C.addDays(weekStart, 7);
    const weekProjects = state.data.projects.filter(function (p) {
      const d = parseISO(p.startAt);
      return d && d >= weekStart && d < weekEnd && p.stage !== "Paid" && p.status !== "Complete";
    });
    const outstanding = (state.data.financials.months.slice(-1)[0] || {}).outstanding || 0;
    const waitToneKpi = waiting.some(function (l) { return waitTone(l, now) === "red"; })
      ? "tone-red"
      : (waiting.some(function (l) { return waitTone(l, now) === "amber"; }) ? "tone-amber" : "tone-ok");

    document.getElementById("kpi-bar").innerHTML =
      "<div class=\"kpi-inner\">" +
        kpiTile("Waiting on a reply", waiting.length, waiting.length === 1 ? "unanswered request" : "unanswered requests", waitToneKpi) +
        kpiTile("Overdue tasks", overdueTasks.length, overdueTasks.length ? "need attention" : "none overdue", overdueTasks.length ? "tone-red" : "tone-ok") +
        kpiTile("Projects this week", weekProjects.length, "start or install scheduled", "") +
        kpiTile("Invoices outstanding", money(outstanding), "from sample monthly figures", "") +
      "</div>";
  }

  function kpiTile(label, value, hint, tone) {
    return "<article class=\"kpi " + tone + "\"><p class=\"kicker\">" + esc(label) + "</p>" +
      "<p class=\"num\">" + esc(String(value)) + "</p>" +
      "<p class=\"fine\">" + esc(hint) + "</p></article>";
  }

  function renderNav() {
    document.querySelectorAll(".tabs [data-nav]").forEach(function (a) {
      a.classList.toggle("is-on", a.getAttribute("data-nav") === ui.view);
      if (a.getAttribute("data-nav") === ui.view) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function donutSvg(counts) {
    const entries = C.TYPES.map(function (t) { return { type: t, n: counts[t] || 0, color: C.TYPE_COLORS[t] || "#9aa3a8" }; });
    const total = entries.reduce(function (s, e) { return s + e.n; }, 0) || 1;
    const cx = 70, cy = 70, r = 46, w = 16;
    let angle = 0;
    const parts = [];
    entries.forEach(function (e) {
      if (!e.n) return;
      const sweep = e.n / total * 360;
      const start = angle;
      const end = angle + sweep;
      parts.push("<path d=\"" + donutArc(cx, cy, r, w, start, end) + "\" fill=\"" + e.color + "\"><title>" + esc(e.type) + ": " + e.n + "</title></path>");
      angle = end;
    });
    if (!parts.length) {
      parts.push("<circle cx=\"" + cx + "\" cy=\"" + cy + "\" r=\"" + r + "\" fill=\"none\" stroke=\"#2b2b2b\" stroke-width=\"" + w + "\" />");
    }
    return "<svg viewBox=\"0 0 140 140\" width=\"160\" height=\"160\" role=\"img\" aria-label=\"Requests by type\">" +
      parts.join("") +
      "<text x=\"70\" y=\"66\" text-anchor=\"middle\" fill=\"#f3f6f7\" font-size=\"22\" font-family=\"Oswald, Arial Narrow, sans-serif\" font-weight=\"600\">" + (total === 1 && entries.every(function (e) { return !e.n; }) ? 0 : entries.reduce(function (s, e) { return s + e.n; }, 0)) + "</text>" +
      "<text x=\"70\" y=\"84\" text-anchor=\"middle\" fill=\"#9aa3a8\" font-size=\"10\" font-family=\"Manrope, sans-serif\">requests</text>" +
      "</svg>";
  }

  function polar(cx, cy, r, angle) {
    const a = (angle - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function donutArc(cx, cy, r, w, start, end) {
    if (end - start >= 359.99) {
      const outer = "M " + (cx) + " " + (cy - r) + " A " + r + " " + r + " 0 1 1 " + (cx - 0.01) + " " + (cy - r);
      const innerR = r - w;
      const inner = "M " + (cx) + " " + (cy - innerR) + " A " + innerR + " " + innerR + " 0 1 0 " + (cx - 0.01) + " " + (cy - innerR);
      return outer + " L " + cx + " " + (cy - innerR) + " " + inner + " Z";
    }
    const r2 = r - w;
    const s1 = polar(cx, cy, r, start);
    const e1 = polar(cx, cy, r, end);
    const s2 = polar(cx, cy, r2, end);
    const e2 = polar(cx, cy, r2, start);
    const large = end - start > 180 ? 1 : 0;
    return "M " + s1[0] + " " + s1[1] +
      " A " + r + " " + r + " 0 " + large + " 1 " + e1[0] + " " + e1[1] +
      " L " + s2[0] + " " + s2[1] +
      " A " + r2 + " " + r2 + " 0 " + large + " 0 " + e2[0] + " " + e2[1] + " Z";
  }

  function typeBreakdown(list, title) {
    const counts = typeCounts(list);
    const total = list.length || 1;
    const rows = C.TYPES.map(function (t) {
      const n = counts[t] || 0;
      const pct = Math.round(n / total * 100);
      const color = C.TYPE_COLORS[t];
      return "<div class=\"type-row\">" +
        "<div class=\"type-name\"><span class=\"swatch\" style=\"background:" + color + "\"></span>" + esc(t) + "</div>" +
        "<strong>" + n + "</strong>" +
        "<div class=\"bar-track\" style=\"grid-column:1/-1\"><i style=\"width:" + pct + "%;background:" + color + "\"></i></div>" +
        "</div>";
    }).join("");
    return "<section class=\"panel\"><div class=\"panel-head\"><div><h2>" + esc(title) + "</h2>" +
      "<p class=\"lede\">Sample breakdown of request types.</p></div></div>" +
      "<div class=\"chart-wrap\">" + donutSvg(counts) + "<div class=\"type-legend\" style=\"flex:1;min-width:12rem\">" + rows + "</div></div></section>";
  }

  function workCard(lead, now, withActions) {
    const tone = waitTone(lead, now);
    const d = waitingDays(lead, now);
    const actions = withActions
      ? "<div class=\"btn-row work-actions\">" +
          (isWaiting(lead) ? "<button type=\"button\" class=\"btn btn-primary btn-sm\" data-action=\"respond\" data-id=\"" + esc(lead.id) + "\">Responded</button>" : "") +
          "<button type=\"button\" class=\"btn btn-sm\" data-action=\"convert\" data-id=\"" + esc(lead.id) + "\">Convert to project</button>" +
        "</div>"
      : "";
    return "<article class=\"work-card tone-" + tone + "\">" +
      "<div><p class=\"who\">" + esc(lead.business) + "</p>" +
      "<p class=\"meta\">" + esc(lead.name) + " · received " + esc(fmtDate(lead.receivedAt)) +
      (lead.source ? " · " + esc(lead.source) : "") + "</p>" +
      "<div class=\"chips\"><span class=\"chip\" style=\"background:" + (C.TYPE_COLORS[lead.type] || "#1ba9d6") + "22;color:#fff;border-color:" + (C.TYPE_COLORS[lead.type] || "#1ba9d6") + "55\">" + esc(lead.type) + "</span>" +
      "<span class=\"chip chip-plain\">" + esc(lead.status) + "</span></div></div>" +
      "<div class=\"wait tone-" + tone + "\" title=\"" + esc(waitLabel(lead, now)) + "\">" +
      "<div class=\"days\">" + d + "</div><span class=\"lbl\">" + (isWaiting(lead) ? (d === 0 ? "arrived today" : (d === 1 ? "day wait" : "days wait")) : "days to reply") + "</span></div>" +
      actions + "</article>";
  }

  function renderToday(now) {
    const waiting = waitingLeads(now);
    const red = waiting.filter(function (l) { return waitTone(l, now) === "red"; }).length;
    const amber = waiting.filter(function (l) { return waitTone(l, now) === "amber"; }).length;
    const overdue = state.data.tasks.filter(function (t) { return !t.done && parseISO(t.dueAt) && parseISO(t.dueAt) < now; });
    const list = waiting.length
      ? "<div class=\"work-list\">" + waiting.map(function (l) { return workCard(l, now, true); }).join("") + "</div>"
      : "<p class=\"empty\">You're all caught up — nothing is waiting on a reply.</p>";

    const overdueBlock = overdue.length
      ? "<section class=\"panel\"><div class=\"panel-head\"><div><h2>Overdue to-dos</h2><p class=\"lede\">" + overdue.length + " task" + (overdue.length === 1 ? "" : "s") + " past due.</p></div>" +
        "<a class=\"btn btn-sm\" href=\"#todo\">Open to-do list</a></div>" +
        "<div class=\"task-list\">" + overdue.slice(0, 4).map(function (t) { return taskRow(t, now); }).join("") + "</div></section>"
      : "";

    return "<div class=\"page-head\"><div><h1>Today</h1><p class=\"lede\">Incoming work first — who is waiting, and for how long. Sample data only.</p></div></div>" +
      "<div class=\"grid-2\">" +
        "<section class=\"panel incoming\"><div class=\"panel-head\"><div>" +
          "<p class=\"kicker\">Incoming work</p>" +
          "<p class=\"incoming-count\">" + waiting.length + "</p>" +
          "<p class=\"incoming-meta\">waiting on a reply" +
            (red ? " · <strong style=\"color:#f07171\">" + red + " at 3+ days</strong>" : "") +
            (amber ? " · <strong style=\"color:#e8a54b\">" + amber + " at 2 days</strong>" : "") +
          "</p></div>" +
          "<button type=\"button\" class=\"btn btn-primary\" data-action=\"add-lead\">Add lead</button>" +
        "</div>" + list + "</section>" +
        typeBreakdown(state.data.leads, "Requests by type") +
      "</div>" + overdueBlock;
  }

  function filteredLeads(now) {
    const q = ui.leadQuery.trim().toLowerCase();
    return state.data.leads.filter(function (lead) {
      if (ui.leadType !== "all" && lead.type !== ui.leadType) return false;
      if (ui.leadWait === "waiting" && !isWaiting(lead)) return false;
      if (ui.leadWait === "responded" && isWaiting(lead)) return false;
      if (ui.leadWait === "stale" && !(isWaiting(lead) && waitingDays(lead, now) >= 3)) return false;
      if (!q) return true;
      const blob = [lead.name, lead.business, lead.type, lead.source, lead.status, lead.notes].join(" ").toLowerCase();
      return blob.indexOf(q) >= 0;
    }).sort(function (a, b) {
      const wa = isWaiting(a) ? 1 : 0;
      const wb = isWaiting(b) ? 1 : 0;
      if (wa !== wb) return wb - wa;
      return waitingDays(b, now) - waitingDays(a, now);
    });
  }

  function renderLeads(now) {
    const week = state.data.leads.filter(function (l) { return inThisWeek(l.receivedAt, now); });
    const month = state.data.leads.filter(function (l) { return inThisMonth(l.receivedAt, now); });
    const weekResp = week.filter(function (l) { return !isWaiting(l); }).length;
    const monthResp = month.filter(function (l) { return !isWaiting(l); }).length;
    const allWait = state.data.leads.filter(isWaiting).length;
    const allResp = state.data.leads.length - allWait;
    const rows = filteredLeads(now);

    const options = "<option value=\"all\">All types</option>" + C.TYPES.map(function (t) {
      return "<option value=\"" + esc(t) + "\"" + (ui.leadType === t ? " selected" : "") + ">" + esc(t) + "</option>";
    }).join("");

    const table = rows.length
      ? "<div class=\"table-wrap\"><table class=\"data\"><thead><tr>" +
        "<th>Customer</th><th>Type</th><th class=\"hide-sm\">Source</th><th>Received</th><th>Waiting</th><th class=\"hide-sm\">Status</th><th></th>" +
        "</tr></thead><tbody>" + rows.map(function (lead) {
          const tone = waitTone(lead, now);
          const d = waitingDays(lead, now);
          return "<tr class=\"tone-" + tone + "\"><td><strong>" + esc(lead.business) + "</strong><div class=\"meta\">" + esc(lead.name) + "</div></td>" +
            "<td>" + esc(lead.type) + "</td>" +
            "<td class=\"hide-sm\">" + esc(lead.source) + "</td>" +
            "<td>" + esc(fmtDate(lead.receivedAt)) + "</td>" +
            "<td><div class=\"wait tone-" + tone + "\" style=\"min-width:0;text-align:left\"><div class=\"days\" style=\"font-size:1.45rem;display:inline\">" + d + "</div> " +
            "<span class=\"lbl\" style=\"display:inline\">" + esc(isWaiting(lead) ? (d === 1 ? "day" : "days") : "to reply") + "</span></div>" +
            "<div class=\"meta\">" + esc(waitLabel(lead, now)) + "</div></td>" +
            "<td class=\"hide-sm\">" + esc(lead.status) + "</td>" +
            "<td><div class=\"btn-row\">" +
            (isWaiting(lead) ? "<button type=\"button\" class=\"btn btn-primary btn-sm\" data-action=\"respond\" data-id=\"" + esc(lead.id) + "\">Responded</button>" : "") +
            "<button type=\"button\" class=\"btn btn-sm\" data-action=\"convert\" data-id=\"" + esc(lead.id) + "\">Convert</button>" +
            "</div></td></tr>";
        }).join("") + "</tbody></table></div>"
      : "<p class=\"empty\">No leads match those filters.</p>";

    return "<div class=\"page-head\"><div><h1>Lead pipeline</h1><p class=\"lede\">Who came in, who has had a reply, and how many days each customer has been waiting.</p></div>" +
      "<button type=\"button\" class=\"btn btn-primary\" data-action=\"add-lead\">Add lead</button></div>" +
      "<div class=\"kpi-inner\" style=\"padding:0 0 1rem;background:transparent;border:0\">" +
        kpiTile("This week", week.length, weekResp + " responded · " + (week.length - weekResp) + " waiting", "") +
        kpiTile("This month", month.length, monthResp + " responded · " + (month.length - monthResp) + " waiting", "") +
        kpiTile("Responded", allResp, "of " + state.data.leads.length + " leads in the book", "tone-ok") +
        kpiTile("Still waiting", allWait, "sorted longest wait first", allWait ? "tone-amber" : "tone-ok") +
      "</div>" +
      typeBreakdown(ui.leadType === "all" && !ui.leadQuery && ui.leadWait === "all" ? state.data.leads : rows, "Breakdown by type") +
      "<section class=\"panel\"><div class=\"toolbar\">" +
        "<label class=\"field\">Search<input type=\"search\" name=\"leadQuery\" value=\"" + esc(ui.leadQuery) + "\" placeholder=\"Name, business, source\" data-bind=\"leadQuery\"></label>" +
        "<label class=\"field\">Type<select data-bind=\"leadType\">" + options + "</select></label>" +
        "<label class=\"field\">Waiting<select data-bind=\"leadWait\">" +
          option("all", "All", ui.leadWait) + option("waiting", "Waiting on a reply", ui.leadWait) + option("stale", "3+ days, no reply", ui.leadWait) + option("responded", "Responded", ui.leadWait) +
        "</select></label>" +
      "</div>" + table + "</section>";
  }

  function option(value, label, selected) {
    return "<option value=\"" + esc(value) + "\"" + (value === selected ? " selected" : "") + ">" + esc(label) + "</option>";
  }

  function taskRow(task, now) {
    const due = parseISO(task.dueAt);
    const overdue = !task.done && due && due < now;
    const dueLabel = due ? (overdue ? "Overdue · due " + fmtDate(task.dueAt) : "Due " + fmtDate(task.dueAt)) : "No due date";
    return "<article class=\"task" + (task.done ? " is-done" : "") + (overdue ? " is-overdue" : "") + "\">" +
      "<input class=\"check\" type=\"checkbox\" data-action=\"toggle-task\" data-id=\"" + esc(task.id) + "\"" + (task.done ? " checked" : "") + " aria-label=\"Complete: " + esc(task.title) + "\">" +
      "<div><p class=\"who\">" + esc(task.title) + "</p>" +
      "<p class=\"meta\">" + esc(task.owner) + (task.linked ? " · " + esc(task.linked) : "") + " · " + esc(dueLabel) + "</p></div>" +
      "<span class=\"prio prio-" + esc(String(task.priority).toLowerCase()) + "\">" + esc(task.priority) + "</span>" +
      "</article>";
  }

  function renderTodo(now) {
    const rows = state.data.tasks.filter(function (t) {
      if (ui.taskOwner !== "all" && t.owner !== ui.taskOwner) return false;
      if (ui.taskFilter === "open") return !t.done;
      if (ui.taskFilter === "overdue") return !t.done && parseISO(t.dueAt) && parseISO(t.dueAt) < now;
      if (ui.taskFilter === "done") return t.done;
      return true;
    }).sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const da = parseISO(a.dueAt) || new Date(8640000000000);
      const db = parseISO(b.dueAt) || new Date(8640000000000);
      if (da.getTime() !== db.getTime()) return da - db;
      const rank = { High: 0, Medium: 1, Low: 2 };
      return (rank[a.priority] || 9) - (rank[b.priority] || 9);
    });
    const open = state.data.tasks.filter(function (t) { return !t.done; }).length;
    const overdue = state.data.tasks.filter(function (t) { return !t.done && parseISO(t.dueAt) && parseISO(t.dueAt) < now; }).length;
    const ownerOpts = "<option value=\"all\">Everyone</option>" + C.OWNERS.map(function (o) {
      return option(o, o, ui.taskOwner);
    }).join("");

    return "<div class=\"page-head\"><div><h1>To-do list</h1><p class=\"lede\">Outstanding work, with overdue items highlighted. Sample tasks only.</p></div>" +
      "<button type=\"button\" class=\"btn btn-primary\" data-action=\"add-task\">Add task</button></div>" +
      "<div class=\"kpi-inner\" style=\"padding:0 0 1rem\">" +
        kpiTile("Open", open, "still to do", "") +
        kpiTile("Overdue", overdue, overdue ? "past their due date" : "none overdue", overdue ? "tone-red" : "tone-ok") +
      "</div>" +
      "<section class=\"panel\"><div class=\"toolbar\">" +
        "<label class=\"field\">Show<select data-bind=\"taskFilter\">" +
          option("open", "Outstanding", ui.taskFilter) +
          option("overdue", "Overdue", ui.taskFilter) +
          option("done", "Completed", ui.taskFilter) +
          option("all", "All", ui.taskFilter) +
        "</select></label>" +
        "<label class=\"field\">Owner<select data-bind=\"taskOwner\">" + ownerOpts + "</select></label>" +
      "</div>" +
      (rows.length ? "<div class=\"task-list\">" + rows.map(function (t) { return taskRow(t, now); }).join("") + "</div>" : "<p class=\"empty\">No tasks in this view.</p>") +
      "</section>";
  }

  function renderProjects(now) {
    let rows = state.data.projects.slice();
    rows = rows.filter(function (p) {
      if (ui.projectFilter === "active") return p.status !== "Complete" && p.stage !== "Paid";
      if (ui.projectFilter === "complete") return p.status === "Complete" || p.stage === "Paid";
      return true;
    });
    rows.sort(function (a, b) {
      const da = parseISO(a.startAt);
      const db = parseISO(b.startAt);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return ui.projectSort === "date-desc" ? (db - da) : (da - db);
    });
    const upcomingVal = rows.reduce(function (s, p) { return s + (Number(p.value) || 0); }, 0);
    const table = rows.length
      ? "<div class=\"table-wrap\"><table class=\"data\"><thead><tr>" +
        "<th>Client</th><th>Job type</th><th>Stage</th>" +
        "<th><button type=\"button\" class=\"sortable\" data-action=\"sort-projects\">Start / install</button></th>" +
        "<th>Value</th><th>Status</th></tr></thead><tbody>" +
        rows.map(function (p) {
          const due = parseISO(p.startAt);
          const soon = due && due >= now && daysBetween(now, due) <= 7 && p.status !== "Complete";
          return "<tr class=\"" + (p.status === "At risk" ? "tone-red" : (soon ? "tone-amber" : "")) + "\">" +
            "<td><strong>" + esc(p.client) + "</strong>" + (p.contact ? "<div class=\"meta\">" + esc(p.contact) + "</div>" : "") + "</td>" +
            "<td>" + esc(p.type) + "</td><td>" + esc(p.stage) + "</td>" +
            "<td>" + esc(fmtDate(p.startAt)) + "</td>" +
            "<td class=\"numish\">" + money(p.value) + "</td>" +
            "<td>" + esc(p.status) + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : "<p class=\"empty\">No projects in this view.</p>";

    return "<div class=\"page-head\"><div><h1>Projects</h1><p class=\"lede\">Upcoming and in-progress work, sortable by start or install date.</p></div>" +
      "<button type=\"button\" class=\"btn btn-primary\" data-action=\"add-project\">Add project</button></div>" +
      "<div class=\"kpi-inner\" style=\"padding:0 0 1rem\">" +
        kpiTile("In this list", rows.length, ui.projectFilter === "active" ? "active jobs" : "jobs", "") +
        kpiTile("Listed value", money(upcomingVal), "sample job values", "") +
      "</div>" +
      "<section class=\"panel\"><div class=\"toolbar\">" +
        "<label class=\"field\">Show<select data-bind=\"projectFilter\">" +
          option("active", "Upcoming & in progress", ui.projectFilter) +
          option("complete", "Complete", ui.projectFilter) +
          option("all", "All projects", ui.projectFilter) +
        "</select></label>" +
        "<label class=\"field\">Sort<select data-bind=\"projectSort\">" +
          option("date-asc", "Date, soonest first", ui.projectSort) +
          option("date-desc", "Date, latest first", ui.projectSort) +
        "</select></label>" +
      "</div>" + table + "</section>";
  }

  function periodSeries() {
    const fin = state.data.financials;
    if (ui.finPeriod === "yearly") return fin.years;
    if (ui.finPeriod === "monthly") return fin.months;
    return fin.weeks;
  }

  function currentPeriod(series) {
    if (!series.length) return null;
    return series[series.length - 1];
  }

  function sumSeries(series) {
    return series.reduce(function (acc, row) {
      acc.revenue += row.revenue;
      acc.quoted += row.quoted;
      acc.invoiced += row.invoiced;
      acc.paid += row.paid;
      acc.outstanding += row.outstanding;
      acc.expenses += row.expenses;
      return acc;
    }, { revenue: 0, quoted: 0, invoiced: 0, paid: 0, outstanding: 0, expenses: 0 });
  }

  function renderFinancials() {
    const series = periodSeries();
    const current = currentPeriod(series) || { revenue: 0, quoted: 0, invoiced: 0, paid: 0, outstanding: 0, expenses: 0, label: "—" };
    const profit = current.revenue - current.expenses;
    const label = ui.finPeriod === "yearly" ? "This year" : (ui.finPeriod === "monthly" ? "This month" : "This week");
    const maxBar = Math.max.apply(null, series.map(function (r) { return Math.max(r.revenue, r.expenses, 1); }));
    const bars = "<div class=\"bars\" role=\"img\" aria-label=\"Revenue and expenses by period\">" + series.map(function (row) {
      const rh = Math.max(2, Math.round(row.revenue / maxBar * 155));
      const eh = Math.max(2, Math.round(row.expenses / maxBar * 155));
      const short = row.label.replace(" 2026", "").replace(" 2025", "").replace(" 2024", "");
      return "<div class=\"col\" title=\"" + esc(row.label) + " · Revenue " + money(row.revenue) + " · Expenses " + money(row.expenses) + "\">" +
        "<div class=\"stack\"><span class=\"rev\" style=\"height:" + rh + "px\"></span><span class=\"exp\" style=\"height:" + eh + "px\"></span></div>" +
        "<div class=\"lab\">" + esc(short) + "</div></div>";
    }).join("") + "</div>";

    const table = "<div class=\"table-wrap\"><table class=\"data\"><thead><tr>" +
      "<th>Period</th><th>Revenue</th><th>Quoted</th><th>Invoiced</th><th>Paid</th><th>Outstanding</th><th>Expenses</th><th>Profit</th>" +
      "</tr></thead><tbody>" + series.map(function (row) {
        const p = row.revenue - row.expenses;
        return "<tr><td><strong>" + esc(row.label) + "</strong></td>" +
          "<td class=\"numish\">" + money(row.revenue) + "</td>" +
          "<td class=\"numish\">" + money(row.quoted) + "</td>" +
          "<td class=\"numish\">" + money(row.invoiced) + "</td>" +
          "<td class=\"numish\">" + money(row.paid) + "</td>" +
          "<td class=\"numish\">" + money(row.outstanding) + "</td>" +
          "<td class=\"numish\">" + money(row.expenses) + "</td>" +
          "<td class=\"numish " + (p >= 0 ? "profit-pos" : "profit-neg") + "\">" + money(p) + "</td></tr>";
      }).join("") + "</tbody></table></div>";

    const range = sumSeries(series);
    const rangeProfit = range.revenue - range.expenses;

    return "<div class=\"page-head\"><div><h1>Financials</h1><p class=\"lede\">Sample trading figures — toggle weekly, monthly or yearly. Profit is revenue minus expenses.</p></div>" +
      "<div class=\"seg\" role=\"tablist\" aria-label=\"Financial period\">" +
        "<button type=\"button\" class=\"" + (ui.finPeriod === "weekly" ? "is-on" : "") + "\" data-action=\"fin-period\" data-period=\"weekly\">Weekly</button>" +
        "<button type=\"button\" class=\"" + (ui.finPeriod === "monthly" ? "is-on" : "") + "\" data-action=\"fin-period\" data-period=\"monthly\">Monthly</button>" +
        "<button type=\"button\" class=\"" + (ui.finPeriod === "yearly" ? "is-on" : "") + "\" data-action=\"fin-period\" data-period=\"yearly\">Yearly</button>" +
      "</div></div>" +
      "<p class=\"kicker\" style=\"margin:0 0 0.5rem\">" + esc(label) + " · " + esc(current.label) + "</p>" +
      "<div class=\"fin-kpis\">" +
        kpiTile("Revenue", money(current.revenue), "sample", "") +
        kpiTile("Quoted value", money(current.quoted), "open and won quotes", "") +
        kpiTile("Invoiced", money(current.invoiced), "billed in the period", "") +
        kpiTile("Paid", money(current.paid), "cash received", "tone-ok") +
        kpiTile("Outstanding", money(current.outstanding), "still to collect", current.outstanding ? "tone-amber" : "tone-ok") +
        kpiTile("Expenses", money(current.expenses), "sample costs", "") +
        kpiTile("Profit", money(profit), "revenue − expenses", profit >= 0 ? "tone-ok" : "tone-red") +
        kpiTile("Range profit", money(rangeProfit), "across the charted periods", rangeProfit >= 0 ? "tone-ok" : "tone-red") +
      "</div>" +
      "<section class=\"panel\"><div class=\"panel-head\"><div><h2>Revenue and expenses</h2><p class=\"lede\">Each pair of bars is one " + (ui.finPeriod === "yearly" ? "year" : (ui.finPeriod === "monthly" ? "month" : "week") + "") + ".</p></div></div>" +
      "<div class=\"legend\"><span><i class=\"rev\"></i>Revenue</span><span><i class=\"exp\"></i>Expenses</span></div>" +
      bars + "</section>" +
      "<section class=\"panel\"><h2>Figures</h2>" + table + "</section>";
  }

  function renderAlert(now) {
    const bar = document.getElementById("alert-bar");
    if (!bar) return;
    const stale = staleLeads(now);
    if (!stale.length) {
      bar.hidden = true;
      bar.innerHTML = "";
      return;
    }
    const n = stale.length;
    const label = n === 1
      ? "1 customer waiting 3+ days for a reply"
      : n + " customers waiting 3+ days for a reply";
    bar.hidden = false;
    bar.innerHTML = "<div class=\"alert-bar-inner\"><button type=\"button\" class=\"alert-btn\" data-action=\"show-stale\">" +
      "<span><span class=\"alert-kicker\">3-day no-reply alert</span>" + esc(label) + "</span>" +
      "<span class=\"alert-go\">View them</span></button></div>";
  }

  function render() {
    const now = today();
    renderNav();
    renderKpis(now);
    renderAlert(now);
    const main = document.getElementById("main");
    if (ui.view === "leads") main.innerHTML = renderLeads(now);
    else if (ui.view === "todo") main.innerHTML = renderTodo(now);
    else if (ui.view === "projects") main.innerHTML = renderProjects(now);
    else if (ui.view === "financials") main.innerHTML = renderFinancials();
    else main.innerHTML = renderToday(now);
  }

  function onClick(ev) {
    const sortBtn = ev.target.closest("[data-action=\"sort-projects\"]");
    if (sortBtn) {
      ui.projectSort = ui.projectSort === "date-asc" ? "date-desc" : "date-asc";
      render();
      return;
    }
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (action === "open-reset") document.getElementById("dlg-reset").showModal();
    else if (action === "close-dialog") closeDialogs();
    else if (action === "confirm-reset") {
      state.data = C.createSampleState(new Date());
      saveState();
      closeDialogs();
      toast("Sample data restored.");
      render();
    } else if (action === "add-lead") openLeadForm();
    else if (action === "add-task") openTaskForm();
    else if (action === "add-project") openProjectForm();
    else if (action === "respond") markResponded(id);
    else if (action === "convert") openConvert(id);
    else if (action === "fin-period") setHash("financials", btn.getAttribute("data-period"));
    else if (action === "show-stale") {
      ui.leadQuery = "";
      ui.leadType = "all";
      ui.leadWait = "stale";
      setHash("leads", "stale");
    }
  }

  function onChange(ev) {
    const t = ev.target;
    if (t.matches("[data-action=\"toggle-task\"]")) {
      toggleTask(t.getAttribute("data-id"), t.checked);
      return;
    }
    if (!t.matches("[data-bind]")) return;
    const key = t.getAttribute("data-bind");
    ui[key] = t.value;
    if (key === "leadWait") {
      setHash("leads", ui.leadWait === "all" ? "" : ui.leadWait);
      return;
    }
    render();
    if (key === "leadQuery") {
      const input = document.querySelector("[data-bind=\"leadQuery\"]");
      if (input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    }
  }

  function onSubmit(ev) {
    const form = ev.target.closest("form[data-form]");
    if (!form) return;
    ev.preventDefault();
    const fd = new FormData(form);
    const fields = {};
    fd.forEach(function (v, k) { fields[k] = v; });
    const kind = form.getAttribute("data-form");
    if (kind === "lead") addLead(fields);
    else if (kind === "task") addTask(fields);
    else if (kind === "project") addProject(fields);
    else if (kind === "convert") convertLead(fields.leadId, fields.startAt, fields.value);
  }

  function init() {
    state.data = loadState();
    setupForms();
    applyHash();
    document.body.addEventListener("click", onClick);
    document.body.addEventListener("change", onChange);
    document.body.addEventListener("input", function (ev) {
      if (ev.target.matches("[data-bind=\"leadQuery\"]")) {
        ui.leadQuery = ev.target.value;
        render();
        const input = document.querySelector("[data-bind=\"leadQuery\"]");
        if (input) {
          input.focus();
          const end = input.value.length;
          try { input.setSelectionRange(end, end); } catch (e) {}
        }
      }
    });
    document.body.addEventListener("submit", onSubmit);
    window.addEventListener("hashchange", function () {
      applyHash();
      render();
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
