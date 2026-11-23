/* Sample data only. Invented Melbourne businesses. Dates are relative to today so the demo stays current. */
(function (global) {
  "use strict";

  const TYPES = [
    "Quote",
    "Sign repair",
    "New install",
    "Vehicle wrap",
    "Reprint/replacement",
    "Removal",
    "General enquiry"
  ];

  const TYPE_COLORS = {
    "Quote": "#1ba9d6",
    "Sign repair": "#e8a54b",
    "New install": "#3dce8a",
    "Vehicle wrap": "#7b8cff",
    "Reprint/replacement": "#4ec4e8",
    "Removal": "#d08bb0",
    "General enquiry": "#9aa3a8"
  };

  const SOURCES = ["Website form", "Phone", "Google", "Instagram", "Referral"];
  const OWNERS = ["Craig", "Jess", "Matt", "Sam"];
  const PRIORITIES = ["High", "Medium", "Low"];
  const STAGES = ["Quote sent", "Approved", "Design/proof", "Print", "Install", "Invoiced", "Paid"];
  const PROJECT_STATUSES = ["On track", "Awaiting client", "Scheduled", "Complete", "At risk"];
  const LEAD_STATUSES = ["New", "Contacted", "Quoted", "Won", "Lost"];

  function pad(n) { return String(n).padStart(2, "0"); }

  function toISO(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function startOfDay(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return x;
  }

  function addDays(d, n) {
    const x = startOfDay(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function startOfWeek(d) {
    const x = startOfDay(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
  }

  function monthName(d, wide) {
    return d.toLocaleDateString("en-AU", { month: wide ? "long" : "short" });
  }

  function mulberry32(a) {
    return function () {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function roundTo(n, step) {
    return Math.round(n / step) * step;
  }

  function createSampleState(now) {
    now = startOfDay(now || new Date());
    const isoAgo = (n) => toISO(addDays(now, -n));
    const isoAhead = (n) => toISO(addDays(now, n));

    const leads = [
      { id: "L01", name: "Priya Sharma", business: "Northcote Plumbing Co", type: "Vehicle wrap", source: "Google", receivedAgo: 6, status: "New", notes: "Wants both work vans wrapped in brand colours." },
      { id: "L02", name: "Ben Walker", business: "Bundoora Auto Care", type: "Sign repair", source: "Phone", receivedAgo: 4, status: "New", notes: "Illuminated pylon not lighting on one side." },
      { id: "L03", name: "Mei Chen", business: "Eltham Bakehouse", type: "New install", source: "Website form", receivedAgo: 3, status: "New", notes: "3D shop letters over the awning." },
      { id: "L04", name: "Luke Rossi", business: "Preston Fitness Studio", type: "Quote", source: "Instagram", receivedAgo: 2, status: "New", notes: "Window graphics and reception wall." },
      { id: "L05", name: "Aisha Rahman", business: "Whittlesea Hardware", type: "Reprint/replacement", source: "Referral", receivedAgo: 1, status: "New", notes: "Faded carpark blade sign." },
      { id: "L06", name: "Tom Nguyen", business: "Heidelberg Dental", type: "General enquiry", source: "Website form", receivedAgo: 0, status: "New", notes: "Asked about illuminated hours sign." },
      { id: "L07", name: "Sophie Grant", business: "Diamond Creek Cafe", type: "Quote", source: "Website form", receivedAgo: 7, respondedAfter: 1, status: "Quoted", notes: "Awning reprint plus A-frames." },
      { id: "L08", name: "Marco Bianchi", business: "Reservoir Electrical", type: "Vehicle wrap", source: "Google", receivedAgo: 14, respondedAfter: 1, status: "Quoted", notes: "Fleet of three utes." },
      { id: "L09", name: "Hannah Lee", business: "Ivanhoe Books", type: "New install", source: "Referral", receivedAgo: 19, respondedAfter: 0, status: "Won", notes: "Fascia and window vinyl." },
      { id: "L10", name: "Chris Patel", business: "Greensborough Smash Repairs", type: "Sign repair", source: "Phone", receivedAgo: 12, respondedAfter: 2, status: "Quoted", notes: "Workshop sign plus new pylon." },
      { id: "L11", name: "Nina Kowalski", business: "Mill Park Veterinary", type: "Removal", source: "Phone", receivedAgo: 5, status: "New", notes: "Old tenant signage still on the brick facade." },
      { id: "L12", name: "Omar Haddad", business: "Thornbury Records", type: "Quote", source: "Instagram", receivedAgo: 9, respondedAfter: 1, status: "Lost", notes: "Went with another supplier on price." },
      { id: "L13", name: "Ella Murphy", business: "Plenty Valley Landscaping", type: "Vehicle wrap", source: "Referral", receivedAgo: 16, respondedAfter: 0, status: "Won", notes: "Dual cab and trailer." },
      { id: "L14", name: "Jack Thompson", business: "Coburg Coffee Roasters", type: "New install", source: "Website form", receivedAgo: 2, respondedAfter: 1, status: "Contacted", notes: "Window graphics and pavement signs." },
      { id: "L15", name: "Rita Santos", business: "Epping Mechanical", type: "Reprint/replacement", source: "Google", receivedAgo: 1, status: "New", notes: "Faded yard banner and directional sign." },
      { id: "L16", name: "Will Parker", business: "Watsonia Pharmacy", type: "General enquiry", source: "Walk-in", receivedAgo: 3, respondedAfter: 0, status: "Contacted", notes: "Asked about opening-hours vinyl." },
      { id: "L17", name: "Grace Kim", business: "Rosanna Florist", type: "Sign repair", source: "Phone", receivedAgo: 8, respondedAfter: 3, status: "Contacted", notes: "Loose acrylic letter on the fascia." },
      { id: "L18", name: "Diego Alvarez", business: "Lalor Pizza Kitchen", type: "Quote", source: "Google", receivedAgo: 15, respondedAfter: 1, status: "Won", notes: "Illuminated blade sign, now installed." },
      { id: "L19", name: "Freya Walsh", business: "Macleod Physiotherapy", type: "New install", source: "Website form", receivedAgo: 0, status: "New", notes: "Reception wall and wayfinding." },
      { id: "L20", name: "Nathan Brooks", business: "Fairfield Wine Bar", type: "Vehicle wrap", source: "Instagram", receivedAgo: 11, respondedAfter: 0, status: "Quoted", notes: "Delivery van wrap." },
      { id: "L21", name: "Helen Crowe", business: "Montmorency Newsagency", type: "Reprint/replacement", source: "Referral", receivedAgo: 20, respondedAfter: 1, status: "Won", notes: "Shopfront vinyl refresh." },
      { id: "L22", name: "Samir Patel", business: "South Morang Bakery", type: "Quote", source: "Website form", receivedAgo: 28, respondedAfter: 2, status: "Lost", notes: "Budget too tight this quarter." }
    ].map(function (row) {
      const receivedAt = isoAgo(row.receivedAgo);
      const lead = {
        id: row.id,
        name: row.name,
        business: row.business,
        type: row.type,
        source: row.source === "Walk-in" ? "Phone" : row.source,
        receivedAt: receivedAt,
        respondedAt: null,
        status: row.status,
        notes: row.notes || ""
      };
      if (row.respondedAfter !== undefined) {
        const recv = addDays(now, -row.receivedAgo);
        lead.respondedAt = toISO(addDays(recv, row.respondedAfter));
      }
      return lead;
    });

    const tasks = [
      { id: "T01", title: "Call Priya Sharma about the van wrap quote", owner: "Craig", dueAgo: 2, priority: "High", linked: "Northcote Plumbing Co", done: false },
      { id: "T02", title: "Send proof follow-up for Ivanhoe Books fascia", owner: "Jess", dueAgo: 0, priority: "High", linked: "Ivanhoe Books", done: false },
      { id: "T03", title: "Order vinyl for Reservoir Electrical fleet", owner: "Sam", dueAgo: -1, priority: "Medium", linked: "Reservoir Electrical", done: false },
      { id: "T04", title: "Book install crew for Plenty Valley Landscaping utes", owner: "Matt", dueAgo: -2, priority: "Medium", linked: "Plenty Valley Landscaping", done: false },
      { id: "T05", title: "Invoice Lalor Pizza Kitchen for the blade sign", owner: "Jess", dueAgo: 3, priority: "High", linked: "Lalor Pizza Kitchen", done: false },
      { id: "T06", title: "Site measure at Eltham Bakehouse shopfront", owner: "Matt", dueAgo: -3, priority: "Medium", linked: "Eltham Bakehouse", done: false },
      { id: "T07", title: "Send warranty pack to Coburg Coffee Roasters", owner: "Jess", dueAgo: -4, priority: "Low", linked: "Coburg Coffee Roasters", done: false },
      { id: "T08", title: "Follow up Heidelberg Dental enquiry", owner: "Craig", dueAgo: -1, priority: "Low", linked: "Heidelberg Dental", done: false },
      { id: "T09", title: "Chase outstanding invoice — Greensborough Smash Repairs", owner: "Jess", dueAgo: 4, priority: "High", linked: "Greensborough Smash Repairs", done: false },
      { id: "T10", title: "Design revision for Preston Fitness once they reply", owner: "Sam", dueAgo: -6, priority: "Low", linked: "Preston Fitness Studio", done: false },
      { id: "T11", title: "Confirm access time for Mill Park Veterinary removal", owner: "Matt", dueAgo: -5, priority: "Medium", linked: "Mill Park Veterinary", done: false },
      { id: "T12", title: "File paid invoice for Montmorency Newsagency", owner: "Jess", dueAgo: 5, priority: "Low", linked: "Montmorency Newsagency", done: true },
      { id: "T13", title: "Order inks and laminate for the week", owner: "Sam", dueAgo: 1, priority: "Medium", linked: "", done: true }
    ].map(function (row) {
      return {
        id: row.id,
        title: row.title,
        owner: row.owner,
        dueAt: row.dueAgo >= 0 ? isoAgo(row.dueAgo) : isoAhead(-row.dueAgo),
        priority: row.priority,
        linked: row.linked,
        done: row.done
      };
    });

    const projects = [
      { id: "P01", client: "Reservoir Electrical", contact: "Marco Bianchi", type: "Vehicle wrap", stage: "Design/proof", startIn: 7, value: 8400, status: "Awaiting client" },
      { id: "P02", client: "Ivanhoe Books", contact: "Hannah Lee", type: "New install", stage: "Print", startIn: 2, value: 4250, status: "On track" },
      { id: "P03", client: "Plenty Valley Landscaping", contact: "Ella Murphy", type: "Vehicle wrap", stage: "Install", startIn: 4, value: 6800, status: "Scheduled" },
      { id: "P04", client: "Lalor Pizza Kitchen", contact: "Diego Alvarez", type: "New install", stage: "Paid", startIn: -10, value: 5100, status: "Complete" },
      { id: "P05", client: "Greensborough Smash Repairs", contact: "Chris Patel", type: "Sign repair", stage: "Quote sent", startIn: 14, value: 3200, status: "Awaiting client" },
      { id: "P06", client: "Coburg Coffee Roasters", contact: "Jack Thompson", type: "New install", stage: "Install", startIn: 8, value: 2150, status: "Scheduled" },
      { id: "P07", client: "Fairfield Wine Bar", contact: "Nathan Brooks", type: "Vehicle wrap", stage: "Design/proof", startIn: 11, value: 4900, status: "On track" },
      { id: "P08", client: "Diamond Creek Cafe", contact: "Sophie Grant", type: "Reprint/replacement", stage: "Quote sent", startIn: 18, value: 1280, status: "Awaiting client" },
      { id: "P09", client: "Montmorency Newsagency", contact: "Helen Crowe", type: "Reprint/replacement", stage: "Invoiced", startIn: -3, value: 1860, status: "On track" },
      { id: "P10", client: "Watsonia Pharmacy", contact: "Will Parker", type: "New install", stage: "Approved", startIn: 21, value: 2740, status: "On track" },
      { id: "P11", client: "Rosanna Florist", contact: "Grace Kim", type: "Sign repair", stage: "Approved", startIn: 6, value: 640, status: "Scheduled" },
      { id: "P12", client: "Heidelberg Medical Rooms", contact: "Alice Nguyen", type: "New install", stage: "Print", startIn: 1, value: 3560, status: "At risk" }
    ].map(function (row) {
      return {
        id: row.id,
        client: row.client,
        contact: row.contact,
        type: row.type,
        stage: row.stage,
        startAt: row.startIn >= 0 ? isoAhead(row.startIn) : isoAgo(-row.startIn),
        value: row.value,
        status: row.status
      };
    });

    const months = buildMonths(now);
    const years = buildYears(months, now);
    const weeks = buildWeeks(now);

    return {
      version: 1,
      sample: true,
      generatedAt: toISO(now),
      leads: leads,
      tasks: tasks,
      projects: projects,
      financials: { weeks: weeks, months: months, years: years }
    };
  }

  function buildMonths(now) {
    const year = now.getFullYear();
    const currentMonth = now.getMonth();
    const season = [32, 38, 44, 48, 52, 55, 50, 54, 58, 62, 68, 42];
    const rand = mulberry32(year * 17 + 9);
    const months = [];
    for (let m = 0; m <= currentMonth; m++) {
      const start = new Date(year, m, 1);
      const end = new Date(year, m + 1, 0);
      const revenue = roundTo((season[m] * 1000) + (rand() * 2400 - 800), 50);
      const quoted = roundTo(revenue * (1.15 + rand() * 0.25), 50);
      const invoiced = roundTo(revenue * (0.96 + rand() * 0.06), 50);
      const paid = roundTo(invoiced * (0.88 + rand() * 0.08), 50);
      const outstanding = Math.max(0, roundTo(invoiced - paid + (rand() * 800), 50));
      const expenses = roundTo(revenue * (0.72 + rand() * 0.08), 50);
      months.push({
        id: "M-" + year + "-" + pad(m + 1),
        label: monthName(start, true) + " " + year,
        start: toISO(start),
        end: toISO(end),
        revenue: revenue,
        quoted: quoted,
        invoiced: invoiced,
        paid: paid,
        outstanding: outstanding,
        expenses: expenses
      });
    }
    return months;
  }

  function buildYears(months, now) {
    const year = now.getFullYear();
    const sum = months.reduce(function (acc, row) {
      acc.revenue += row.revenue;
      acc.quoted += row.quoted;
      acc.invoiced += row.invoiced;
      acc.paid += row.paid;
      acc.outstanding += row.outstanding;
      acc.expenses += row.expenses;
      return acc;
    }, { revenue: 0, quoted: 0, invoiced: 0, paid: 0, outstanding: 0, expenses: 0 });

    return [
      { id: "Y-2024", label: "2024", start: "2024-01-01", end: "2024-12-31", revenue: 528400, quoted: 710200, invoiced: 541200, paid: 519800, outstanding: 21400, expenses: 421000 },
      { id: "Y-2025", label: "2025", start: "2025-01-01", end: "2025-12-31", revenue: 614900, quoted: 802400, invoiced: 628400, paid: 601200, outstanding: 27200, expenses: 486000 },
      { id: "Y-" + year, label: year + " YTD", start: year + "-01-01", end: toISO(now), revenue: sum.revenue, quoted: sum.quoted, invoiced: sum.invoiced, paid: sum.paid, outstanding: sum.outstanding, expenses: sum.expenses }
    ];
  }

  function buildWeeks(now) {
    const monday = startOfWeek(now);
    const rand = mulberry32(now.getFullYear() * 100 + now.getMonth() * 10 + 3);
    const weeks = [];
    for (let i = 11; i >= 0; i--) {
      const start = addDays(monday, -i * 7);
      const end = addDays(start, 6);
      const wave = 1 + 0.18 * Math.sin((11 - i) / 2.2);
      const revenue = roundTo((12000 + rand() * 7000) * wave, 50);
      const quoted = roundTo(revenue * (1.1 + rand() * 0.35), 50);
      const invoiced = roundTo(revenue * (0.92 + rand() * 0.1), 50);
      const paid = roundTo(invoiced * (0.82 + rand() * 0.12), 50);
      const outstanding = Math.max(0, roundTo(invoiced - paid + rand() * 900, 50));
      const expenses = roundTo(revenue * (0.7 + rand() * 0.1), 50);
      weeks.push({
        id: "W-" + toISO(start),
        label: weekLabel(start, end),
        start: toISO(start),
        end: toISO(end),
        revenue: revenue,
        quoted: quoted,
        invoiced: invoiced,
        paid: paid,
        outstanding: outstanding,
        expenses: expenses
      });
    }
    return weeks;
  }

  function weekLabel(start, end) {
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return start.getDate() + "–" + end.getDate() + " " + monthName(start, false);
    }
    return start.getDate() + " " + monthName(start, false) + "–" + end.getDate() + " " + monthName(end, false);
  }

  global.EXO_DATA = {
    TYPES: TYPES,
    TYPE_COLORS: TYPE_COLORS,
    SOURCES: SOURCES,
    OWNERS: OWNERS,
    PRIORITIES: PRIORITIES,
    STAGES: STAGES,
    PROJECT_STATUSES: PROJECT_STATUSES,
    LEAD_STATUSES: LEAD_STATUSES,
    toISO: toISO,
    startOfDay: startOfDay,
    addDays: addDays,
    startOfWeek: startOfWeek,
    createSampleState: createSampleState
  };
})(window);
