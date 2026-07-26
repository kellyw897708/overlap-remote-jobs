import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Clock, Plus, X, ArrowUpRight, Briefcase } from "lucide-react";

const STORAGE_KEY = "overlap-jobs-v1";

const CITIES = [
  { label: "San Francisco", tz: "America/Los_Angeles" },
  { label: "New York", tz: "America/New_York" },
  { label: "London", tz: "Europe/London" },
  { label: "Berlin", tz: "Europe/Berlin" },
  { label: "Bangalore", tz: "Asia/Kolkata" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
];

const CATEGORIES = ["Engineering", "Design", "Product", "Data", "Marketing", "Support", "Sales"];
const REGIONS = ["Americas", "Europe/Africa", "Asia-Pacific", "Anywhere"];

const SEED_JOBS = [
  { id: "s1", title: "Senior Backend Engineer", company: "Harbor Data", category: "Engineering", region: "Americas", salary: "$140k–$175k", tags: ["Go", "Postgres", "Async-first"], daysAgo: 2, description: "Own the ingestion pipeline for a analytics platform used by mid-size retailers. Small team, high autonomy, weekly sync only." },
  { id: "s2", title: "Product Designer", company: "Ampersand Design Co", category: "Design", region: "Europe/Africa", salary: "$90k–$115k", tags: ["Figma", "Design systems"], daysAgo: 5, description: "Lead design for a B2B scheduling tool. You'll work closely with two engineers and the founder, mostly async with a Tuesday review." },
  { id: "s3", title: "Data Analyst", company: "Verdant Analytics", category: "Data", region: "Anywhere", salary: "$75k–$95k", tags: ["SQL", "dbt", "Looker"], daysAgo: 1, description: "Build reporting for climate-data clients. Fully async, no fixed hours, deliverables tracked weekly." },
  { id: "s4", title: "Growth Marketer", category: "Marketing", company: "Fable Media", region: "Americas", salary: "$70k–$90k", tags: ["SEO", "Lifecycle"], daysAgo: 9, description: "Own acquisition channels for a media newsletter product with 400k subscribers. Reports to a US-based CMO." },
  { id: "s5", title: "Customer Support Lead", company: "Cobalt Health", region: "Asia-Pacific", category: "Support", salary: "$55k–$70k", tags: ["Zendesk", "Team lead"], daysAgo: 4, description: "Manage a five-person support team covering APAC business hours for a telehealth scheduling product." },
  { id: "s6", title: "Founding Engineer", company: "Pinecone Robotics", category: "Engineering", region: "Anywhere", salary: "$150k–$190k + equity", tags: ["Rust", "Embedded", "Early-stage"], daysAgo: 0, description: "First remote hire at a robotics control-software startup. Heavy overlap with a Berlin-based founding team expected." },
  { id: "s7", title: "Account Executive", company: "Ledgerline Fintech", category: "Sales", region: "Americas", salary: "$80k base + commission", tags: ["SaaS", "Mid-market"], daysAgo: 12, description: "Close mid-market accounts for an accounting-automation product. US business hours required for calls." },
  { id: "s8", title: "Staff Data Engineer", company: "Groundtruth AI", category: "Data", region: "Europe/Africa", salary: "$135k–$160k", tags: ["Python", "Airflow", "Kafka"], daysAgo: 3, description: "Build the training-data pipeline for a computer-vision team. Four hours of overlap with CET expected." },
  { id: "s9", title: "Brand Designer", company: "Cinder Games", category: "Design", region: "Anywhere", salary: "$85k–$105k", tags: ["Illustration", "Motion"], daysAgo: 7, description: "Shape the visual identity for an indie studio's next release. Fully async, occasional live jam sessions optional." },
  { id: "s10", title: "Product Manager, Platform", company: "Openroute Logistics", category: "Product", region: "Americas", salary: "$120k–$145k", tags: ["B2B", "APIs"], daysAgo: 6, description: "Own the developer platform for a freight-matching product. Weekly planning call, otherwise async." },
  { id: "s11", title: "Support Engineer", company: "Signalhouse", category: "Support", region: "Asia-Pacific", salary: "$60k–$78k", tags: ["Debugging", "Customer-facing"], daysAgo: 10, description: "Triage and resolve technical tickets for a monitoring product with customers concentrated in APAC." },
  { id: "s12", title: "Lifecycle Marketing Manager", company: "Milestone Learning", category: "Marketing", region: "Europe/Africa", salary: "$68k–$85k", tags: ["Email", "Segmentation"], daysAgo: 8, description: "Run onboarding and retention campaigns for an online learning platform based in Lisbon." },
  { id: "s13", title: "Frontend Engineer", company: "Driftwood Studio", category: "Engineering", region: "Anywhere", salary: "$110k–$135k", tags: ["React", "Accessibility"], daysAgo: 1, description: "Build the client-facing app for a small design studio's booking product. Two-person eng team, fully async." },
  { id: "s14", title: "Sales Development Rep", company: "Northgate Security", category: "Sales", region: "Americas", salary: "$55k base + OTE $85k", tags: ["Outbound", "Cybersecurity"], daysAgo: 14, description: "Book meetings for an enterprise security product. Some overlap with US Eastern hours required." },
];

function getCityTime(tz, now) {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now),
    10
  );
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(now);
  const active = hour >= 9 && hour < 18;
  return { time, active };
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [jobs, setJobs] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [region, setRegion] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", category: "Engineering", region: "Anywhere", salary: "", tags: "", description: "" });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setJobs(JSON.parse(raw));
        return;
      } catch (e) {
        // fall through to seed
      }
    }
    setJobs(SEED_JOBS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_JOBS));
  }, []);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (category !== "All" && j.category !== category) return false;
      if (region !== "All" && j.region !== region) return false;
      if (q) {
        const hay = `${j.title} ${j.company} ${(j.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => a.daysAgo - b.daysAgo);
  }, [jobs, search, category, region]);

  const submitJob = useCallback((e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.company.trim()) return;
    const newJob = {
      id: `u${Date.now()}`,
      title: form.title.trim(),
      company: form.company.trim(),
      category: form.category,
      region: form.region,
      salary: form.salary.trim() || "Not specified",
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      daysAgo: 0,
      description: form.description.trim() || "No description provided.",
    };
    const updated = [newJob, ...(jobs || [])];
    setJobs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setShowForm(false);
    setForm({ title: "", company: "", category: "Engineering", region: "Anywhere", salary: "", tags: "", description: "" });
  }, [form, jobs]);

  const ink = "#12172B";
  const panel = "#1B2140";
  const border = "#2A3158";
  const textPrimary = "#F5F3EC";
  const textMuted = "#9BA3C2";
  const gold = "#F2A93B";
  const teal = "#4FD1C5";

  const displayFont = { fontFamily: "'Fraunces', serif" };
  const monoFont = { fontFamily: "'IBM Plex Mono', monospace" };
  const bodyFont = { fontFamily: "'Inter', sans-serif" };

  return (
    <div style={{ background: ink, minHeight: "100vh", color: textPrimary, ...bodyFont }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        ::selection { background: ${gold}; color: ${ink}; }
        input:focus, select:focus, textarea:focus, button:focus-visible {
          outline: 2px solid ${teal};
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; }
        }
      `}</style>

      <div style={{ borderBottom: `1px solid ${border}`, overflowX: "auto" }}>
        <div className="flex items-center gap-6 px-6 py-3 min-w-max">
          <div className="flex items-center gap-2 pr-4" style={{ borderRight: `1px solid ${border}` }}>
            <Clock size={14} color={textMuted} />
            <span style={{ ...monoFont, color: textMuted, fontSize: 12 }}>right now</span>
          </div>
          {CITIES.map((c) => {
            const { time, active } = getCityTime(c.tz, now);
            return (
              <div key={c.tz} className="flex items-center gap-2">
                <span
                  style={{
                    width: 6, height: 6, borderRadius: 999,
                    background: active ? gold : border,
                    boxShadow: active ? `0 0 8px ${gold}` : "none",
                  }}
                />
                <span style={{ ...bodyFont, fontSize: 13, color: active ? textPrimary : textMuted }}>{c.label}</span>
                <span style={{ ...monoFont, fontSize: 12, color: active ? gold : textMuted }}>{time}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 pt-14 pb-10 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase size={18} color={teal} />
          <span style={{ ...monoFont, fontSize: 12, color: teal, letterSpacing: "0.08em" }}>OVERLAP · REMOTE ROLES</span>
        </div>
        <h1 style={{ ...displayFont, fontSize: 42, fontWeight: 500, lineHeight: 1.15, marginBottom: 12 }}>
          Remote jobs, sorted by<br />how much of your day they'll share.
        </h1>
        <p style={{ ...bodyFont, color: textMuted, fontSize: 15, maxWidth: 560 }}>
          Every listing here comes with a region tag instead of a vague "remote." Check the clock strip above to see which cities are mid-workday right now.
        </p>
      </div>

      <div className="px-6 pb-6 max-w-5xl">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: panel, border: `1px solid ${border}` }}>
            <Search size={15} color={textMuted} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, company, or tag"
              style={{ background: "transparent", border: "none", color: textPrimary, ...bodyFont, fontSize: 14, width: 220 }}
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg"
            style={{ background: gold, color: ink, ...bodyFont, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            <Plus size={15} /> Post a job
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-3 py-1 rounded-full"
              style={{
                ...monoFont, fontSize: 12, cursor: "pointer",
                border: `1px solid ${category === c ? teal : border}`,
                background: category === c ? "rgba(79,209,197,0.12)" : "transparent",
                color: category === c ? teal : textMuted,
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", ...REGIONS].map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className="px-3 py-1 rounded-full"
              style={{
                ...monoFont, fontSize: 12, cursor: "pointer",
                border: `1px solid ${region === r ? gold : border}`,
                background: region === r ? "rgba(242,169,59,0.1)" : "transparent",
                color: region === r ? gold : textMuted,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-24 max-w-5xl">
        {jobs === null ? (
          <p style={{ color: textMuted, ...bodyFont }}>Loading listings…</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ border: `1px dashed ${border}`, borderRadius: 12 }}>
            <p style={{ ...displayFont, fontSize: 20, marginBottom: 6 }}>No roles match yet.</p>
            <p style={{ color: textMuted, fontSize: 14 }}>Try a different filter, or be the first to post one.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((job) => (
              <div key={job.id} className="p-5 rounded-xl" style={{ background: panel, border: `1px solid ${border}` }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <di
