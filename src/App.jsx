import { useState, useEffect, useRef, useMemo } from "react";
import { CheckCircle2, Circle, XCircle, ChevronLeft, Zap, TrendingUp, Target } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

/* ─── This version calls YOUR OWN Vercel serverless functions at /api/analyze
   and /api/video — no user-facing keys, no external backend, no CORS issues.
   Set ANTHROPIC_API_KEY and YOUTUBE_KEY as environment variables in your
   Vercel project settings before deploying. ─── */

const STEPS = ["interview", "risk", "careers", "gaps", "quiz", "roadmap"];
const STEP_LABELS = { interview: "Profile", risk: "Risk", careers: "Careers", gaps: "Gaps", quiz: "Test", roadmap: "Roadmap" };
const DAY_TYPE_COLOR = { learn: "#00ff9d", practice: "#00c9ff", rest: "#888" };
const DAY_TYPE_LABEL = { learn: "Learn", practice: "Practice", rest: "Rest / Review" };
const TYPE_XP = { learn: 35, practice: 25, rest: 15 };
const PRIORITY_BAR_PCT = { high: 28, medium: 58, low: 82 };

const INTERVIEW_QUESTIONS = [
  { key: "jobTitle", label: "What is your exact current job title?", type: "text", placeholder: "e.g. Senior Accountant, Junior Frontend Developer...", helper: "Be precise. A vague title gives you a vague — and useless — plan." },
  { key: "industry", label: "Which industry or field do you operate in?", type: "text", placeholder: "e.g. Healthcare, Banking, Retail, Education..." },
  { key: "skills", label: "List the skills you currently rely on every single day.", type: "text", placeholder: "e.g. Excel, SQL, client calls, Photoshop..." },
  { key: "experience", label: "How many years have you been doing this work?", type: "select", options: ["Student / Intern", "0–2 years", "3–5 years", "6–10 years", "10+ years"] },
  { key: "dailyResponsibilities", label: "Describe your core daily responsibilities — in one honest sentence.", type: "text", placeholder: "e.g. I reconcile transactions and prepare monthly reports", helper: "This is what gets evaluated for automation exposure." },
  { key: "biggestFear", label: "What part of your job are you most afraid AI could take over?", type: "text", placeholder: "Say it plainly. This shapes your entire risk score.", helper: "There are no wrong answers here — only honest ones." },
  { key: "confidence", label: "How confident are you that your current skills are still valuable in 3 years?", type: "select", options: ["Very confident", "Somewhat confident", "Not confident", "Not sure"] },
  { key: "goal", label: "What outcome are you ultimately trying to achieve?", type: "select", options: ["Stay in current field", "Transition to tech", "Get promoted", "Start freelancing", "Future-proof my career"] },
  { key: "dailyTime", label: "Realistically — how much time can you commit to learning each day?", type: "select", options: ["15–30 min", "30–60 min", "1–2 hours", "2+ hours"] },
  { key: "learningStyle", label: "How do you learn best?", type: "select", options: ["Video tutorials", "Reading / docs", "Hands-on practice", "Mixed"] },
  { key: "education", label: "What's your highest level of education?", type: "select", options: ["High school", "Bachelor's degree", "Master's degree", "Self-taught / no formal degree", "PhD or equivalent"] },
  { key: "toolsUsed", label: "Which software or tools do you touch most often at work?", type: "text", placeholder: "e.g. Salesforce, Figma, Jupyter, SAP...", helper: "This tells us what's already at risk of being automated around you." },
  { key: "teamSize", label: "How big is the team you work directly with?", type: "select", options: ["Just me", "2–5 people", "6–20 people", "20+ people"] },
  { key: "aiUsage", label: "Do you currently use any AI tools in your work?", type: "select", options: ["Never", "Occasionally", "Weekly", "Daily — it's core to my workflow"] },
  { key: "salaryGoal", label: "What's the realistic income jump you're hoping for?", type: "select", options: ["No change needed", "10–25% increase", "25–50% increase", "50%+ / new career tier"] },
  { key: "location", label: "Are you open to remote work, or tied to a specific location?", type: "select", options: ["Fully remote-open", "Hybrid preferred", "On-site only", "Willing to relocate"] },
  { key: "riskTolerance", label: "How much risk are you willing to take for a bigger career shift?", type: "select", options: ["Very low — I want stability", "Moderate — calculated risks", "High — I'll bet on myself", "Extreme — all in"] },
  { key: "pastLearning", label: "Have you tried upskilling before? What happened?", type: "text", placeholder: "e.g. Started a coding course but dropped off after 2 weeks", helper: "Honesty here helps us build a plan you'll actually finish." },
  { key: "supportSystem", label: "Do you have anyone supporting your career growth right now?", type: "select", options: ["No one — I'm on my own", "Friends/family cheering me on", "A mentor or coach", "My employer supports upskilling"] },
  { key: "biggestBlocker", label: "What's the single biggest thing stopping you from changing careers today?", type: "text", placeholder: "e.g. Money, time, fear of starting over, not knowing where to begin", helper: "This is the last question. Be real — it shapes how we pace your roadmap." }
];

const FONTS = (
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
);

function GlobalStyle() {
  return (
    <style>{`
      @keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.35} 50%{transform:translateY(-10px);opacity:1} }
      @keyframes floatGlow { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-30px) scale(1.08)} }
      @keyframes fadeUp { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:translateY(0)} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulseRing { 0%{box-shadow:0 0 0 0 rgba(0,255,157,0.4)} 70%{box-shadow:0 0 0 10px rgba(0,255,157,0)} 100%{box-shadow:0 0 0 0 rgba(0,255,157,0)} }
      @keyframes popIn { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
      * { box-sizing: border-box; }
      .aura-fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      .aura-fade-in { animation: fadeIn 0.4s ease both; }
      .aura-input::placeholder { color: #4a4a4a; }
      .aura-card { transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), border-color 0.25s ease, box-shadow 0.25s ease; }
      .aura-card:hover { transform: translateY(-2px); border-color: rgba(0,255,157,0.35) !important; box-shadow: 0 12px 32px rgba(0,255,157,0.06), 0 4px 24px rgba(0,0,0,0.5); }
      .aura-btn-primary { transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease; }
      .aura-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,255,157,0.25); filter: brightness(1.05); }
      .aura-btn-primary:active:not(:disabled) { transform: translateY(0px) scale(0.99); }
      .aura-btn-ghost { transition: all 0.2s ease; }
      .aura-btn-ghost:hover { background: #161616 !important; border-color: #333 !important; color: #ddd !important; }
      .aura-select { appearance: none; -webkit-appearance: none; }
      .aura-video-card { transition: all 0.22s cubic-bezier(0.22,1,0.36,1); }
      .aura-video-card:hover { border-color: #ff4d4d77 !important; background: #0d0a0a !important; transform: scale(1.015); }
      .aura-scroll::-webkit-scrollbar { width: 6px; }
      .aura-scroll::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
      ::selection { background: rgba(0,255,157,0.3); }
      .opt-card { transition: all 0.18s cubic-bezier(0.22,1,0.36,1); cursor: pointer; }
      .opt-card:hover:not(.locked) { border-color: #00ff9d77 !important; background: #131313 !important; }
      .link-copy { transition: background 0.15s ease, color 0.15s ease; }
      .link-copy:hover { background: #1a1a1a !important; color: #00ff9d !important; }
      .done-task { text-decoration: line-through; color: #555 !important; }
      .reveal { opacity: 0; transform: translateY(36px) scale(0.97); filter: blur(4px);
        transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.7s cubic-bezier(0.16,1,0.3,1); }
      .reveal.in { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      .reveal-left { opacity: 0; transform: translateX(-32px); transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1); }
      .reveal-left.in { opacity: 1; transform: translateX(0); }
      .reveal-scale { opacity: 0; transform: scale(0.85); transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1); }
      .reveal-scale.in { opacity: 1; transform: scale(1); }
    `}</style>
  );
}

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, variant = "", delay = 0, style = {} }) {
  const [ref, visible] = useReveal();
  const cls = variant ? `reveal-${variant}` : "reveal";
  return (
    <div ref={ref} className={`${cls} ${visible ? "in" : ""}`} style={{ transitionDelay: visible ? `${delay}ms` : "0ms", ...style }}>
      {children}
    </div>
  );
}

function AmbientBackground({ scrollerRef }) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setOffset(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollerRef]);
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: 480, height: 480, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,255,157,0.10) 0%, transparent 70%)",
        animation: "floatGlow 14s ease-in-out infinite", filter: "blur(10px)", transform: `translateY(${offset * 0.18}px)` }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 520, height: 520, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,201,255,0.09) 0%, transparent 70%)",
        animation: "floatGlow 18s ease-in-out infinite reverse", filter: "blur(10px)", transform: `translateY(${-offset * 0.12}px)` }} />
      <div style={{ position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)",
        backgroundSize: "28px 28px", transform: `translateY(${offset * 0.04}px)` }} />
    </div>
  );
}

function ScrollProgressRail({ scrollerRef }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    onScroll(); el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollerRef]);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: 3, zIndex: 50, background: "rgba(255,255,255,0.04)" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #00ff9d, #00c9ff)",
        boxShadow: "0 0 10px rgba(0,255,157,0.6)", transition: "width 0.12s linear" }} />
    </div>
  );
}

function ProgressBar({ current }) {
  const idx = STEPS.indexOf(current);
  const pct = (idx / (STEPS.length - 1)) * 100;
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ position: "relative", height: 4, background: "#181818", borderRadius: 4, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 4, width: `${pct}%`,
          background: "linear-gradient(90deg, #00ff9d, #00c9ff)", transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: "0 0 12px rgba(0,255,157,0.5)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase",
            color: i <= idx ? "#00ff9d" : "#3a3a3a", transition: "color 0.4s ease", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: i <= idx ? "#00ff9d" : "#333",
              boxShadow: i === idx ? "0 0 8px rgba(0,255,157,0.8)" : "none" }} />
            {STEP_LABELS[s]}
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskMeter({ score }) {
  const color = score >= 70 ? "#ff4d4d" : score >= 40 ? "#ffd700" : "#00ff9d";
  const label = score >= 70 ? "High Risk" : score >= 40 ? "Moderate Risk" : "Low Risk";
  const [animScore, setAnimScore] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimScore(score), 150); return () => clearTimeout(t); }, [score]);
  return (
    <div style={{ textAlign: "center", margin: "20px 0 28px" }}>
      <div style={{ position: "relative", display: "inline-block", width: 220, height: 110 }}>
        <svg viewBox="0 0 220 110" width="220" height="110">
          <defs>
            <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff9d" /><stop offset="50%" stopColor="#ffd700" /><stop offset="100%" stopColor="#ff4d4d" />
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <path d="M14,104 A96,96 0 0,1 206,104" fill="none" stroke="#161616" strokeWidth="16" strokeLinecap="round" />
          <path d="M14,104 A96,96 0 0,1 206,104" fill="none" stroke="url(#riskGrad)" strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${(animScore / 100) * 301} 301`} style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)" }} filter="url(#glow)" />
        </svg>
        <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 900, color, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1, lineHeight: 1 }}>{animScore}%</div>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "inline-block", padding: "6px 18px", borderRadius: 24, background: color + "16",
        border: `1px solid ${color}50`, color, fontWeight: 700, fontSize: 12.5, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function Card({ children, style = {}, hover = true }) {
  return (
    <div className={hover ? "aura-card" : ""} style={{
      background: "linear-gradient(180deg, #121212 0%, #0e0e0e 100%)", border: "1px solid #1f1f1f", borderRadius: 18,
      padding: "22px 24px", marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.35)", ...style
    }}>{children}</div>
  );
}

function Tag({ text, color = "#00ff9d" }) {
  return (
    <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 11, background: color + "16",
      border: `1px solid ${color}40`, color, marginRight: 6, marginBottom: 6, fontWeight: 600, letterSpacing: 0.3 }}>{text}</span>
  );
}

function LoadingDots({ label }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: label ? 10 : 0 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "linear-gradient(135deg, #00ff9d, #00c9ff)",
            animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </div>
      {label && <p style={{ color: "#666", fontSize: 12, margin: 0 }}>{label}</p>}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg, #00ff9d, #00c9ff)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#000",
        boxShadow: "0 0 24px rgba(0,255,157,0.35)", animation: "pulseRing 2.5s ease-in-out infinite" }}>A</div>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, letterSpacing: 5, color: "#fff" }}>AURA</span>
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <Card hover={false} style={{ flex: "1 1 130px", padding: "16px", marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        {icon}
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#555", textTransform: "uppercase", textAlign: "right" }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: "#555", marginTop: 5 }}>{sub}</div>}
    </Card>
  );
}

const inputBase = {
  width: "100%", background: "#0a0a0a", border: "1px solid #222", borderRadius: 12, padding: "13px 15px",
  color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease"
};
const labelStyle = { display: "block", fontSize: 11, color: "#666", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 9, fontWeight: 700 };

const videoCache = new Map();
async function fetchYouTubeVideo(query) {
  if (!query) return null;
  if (videoCache.has(query)) return videoCache.get(query);
  try {
    const res = await fetch(`/api/video?q=${encodeURIComponent(query)}`);
    const result = await res.json();
    if (result.error) { videoCache.set(query, null); return null; }
    videoCache.set(query, result);
    return result;
  } catch (e) {
    videoCache.set(query, null);
    return null;
  }
}

function CopyLinkRow({ url }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.preventDefault();
    const ta = document.createElement("textarea"); ta.value = url;
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="link-copy" onClick={copy} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "7px 10px", marginTop: 8, cursor: "pointer", color: "#777" }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, flexShrink: 0, color: copied ? "#00ff9d" : "#555" }}>{copied ? "Copied ✓" : "Copy"}</span>
    </div>
  );
}

function VideoBlock({ vid, fallbackQuery, loading }) {
  if (loading && !vid) {
    return (
      <div style={{ background: "#0a0a0a", borderRadius: 12, padding: "14px", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 14, height: 14, border: "2px solid #222", borderTopColor: "#00ff9d", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "#555" }}>Finding exact video...</span>
      </div>
    );
  }
  if (vid) {
    return (
      <div>
        <a href={vid.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
          <div className="aura-video-card" style={{ background: "#0a0a0a", borderRadius: 12, overflow: "hidden", border: "1px solid #1a1a1a",
            display: "flex", gap: 12, alignItems: "center", padding: "10px" }}>
            {vid.thumbnail && <img src={vid.thumbnail} alt={vid.title} style={{ width: 92, height: 62, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", lineHeight: 1.4, marginBottom: 5,
                overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{vid.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 16, height: 16, background: "#ff0000", borderRadius: 4, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 8, color: "#fff", flexShrink: 0 }}>▶</div>
                <span style={{ fontSize: 11, color: "#555" }}>{vid.channel}</span>
              </div>
            </div>
          </div>
        </a>
        <CopyLinkRow url={vid.url} />
      </div>
    );
  }
  return (
    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(fallbackQuery || "")}`} target="_blank" rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
        background: "#ff000016", border: "1px solid #ff000040", color: "#ff6666", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
      ▶ Search on YouTube
    </a>
  );
}

function QuizBlock({ questions, title, compact, ctaLabel, onFinishClick }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  if (!questions || questions.length === 0) return null;
  const done = answers.length === questions.length;
  const score = answers.reduce((acc, a, i) => acc + (a === (questions[i] ? questions[i].correctIndex : -99) ? 1 : 0), 0);
  const select = (oi) => { if (selected !== null) return; setSelected(oi); setAnswers(prev => { const n = [...prev]; n[idx] = oi; return n; }); };
  const next = () => { setSelected(null); setIdx(i => i + 1); };

  if (done) {
    return (
      <Reveal variant="scale">
        <Card hover={false} style={compact ? { padding: "18px 20px" } : {}}>
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <div style={{ animation: "popIn 0.5s cubic-bezier(0.22,1,0.36,1)" }}>
              <div style={{ fontSize: compact ? 32 : 48, fontWeight: 900, fontFamily: "'Bebas Neue', sans-serif",
                color: score >= questions.length * 0.6 ? "#00ff9d" : "#ffd700" }}>{score} / {questions.length}</div>
            </div>
            <p style={{ color: "#aaa", fontSize: 13, marginTop: 6 }}>
              {score === questions.length ? "Perfect score." : score >= questions.length * 0.6 ? "Solid grasp." : "Keep going — the plan covers this."}
            </p>
          </div>
        </Card>
        {ctaLabel && (
          <button onClick={onFinishClick} className="aura-btn-primary" style={{
            width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #00ff9d, #00c9ff)", color: "#000", fontSize: 15, fontWeight: 800, marginTop: 10
          }}>{ctaLabel}</button>
        )}
      </Reveal>
    );
  }

  const q = questions[idx];
  return (
    <Card hover={false} style={compact ? { padding: "18px 20px" } : {}}>
      <div style={{ fontSize: 11, color: "#00ff9d", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
        {title} · Q{idx + 1}/{questions.length}
      </div>
      <div style={{ fontWeight: 700, fontSize: compact ? 14.5 : 16.5, color: "#fff", marginBottom: 16, lineHeight: 1.5 }}>{q.question}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {q.options.map((opt, oi) => {
          const isCorrect = oi === q.correctIndex, isSelected = selected === oi;
          let borderColor = "#1f1f1f", bg = "#0e0e0e", textColor = "#ccc";
          if (selected !== null) {
            if (isCorrect) { borderColor = "#00ff9d77"; bg = "#00ff9d10"; textColor = "#00ff9d"; }
            else if (isSelected) { borderColor = "#ff4d4d77"; bg = "#ff4d4d10"; textColor = "#ff6666"; }
          }
          return (
            <div key={oi} onClick={() => select(oi)} className={`opt-card ${selected !== null ? "locked" : ""}`}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "13px 10px", borderRadius: 12,
                border: `1px solid ${borderColor}`, background: bg, color: textColor, fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>
              {selected !== null && isCorrect && <CheckCircle2 size={15} color="#00ff9d" />}
              {selected !== null && isSelected && !isCorrect && <XCircle size={15} color="#ff6666" />}
              {selected === null && <Circle size={15} color="#444" />}
              <span>{opt}</span>
            </div>
          );
        })}
      </div>
      {selected !== null && (
        <div>
          <div className="aura-fade-in" style={{ marginTop: 12, padding: "11px 14px", borderRadius: 12, background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
            <div style={{ fontSize: 10.5, color: "#666", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>Why</div>
            <div style={{ fontSize: 12.5, color: "#aaa", lineHeight: 1.6 }}>{q.explanation}</div>
          </div>
          <button onClick={next} className="aura-btn-primary" style={{
            width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #00ff9d, #00c9ff)", color: "#000", fontSize: 13.5, fontWeight: 800, marginTop: 14
          }}>{idx < questions.length - 1 ? "Next Question" : "See Results"}</button>
        </div>
      )}
    </Card>
  );
}

function StockTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
        <div style={{ color: "#666", marginBottom: 2 }}>{label}</div>
        <div style={{ color: "#00ff9d", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{payload[0].value}</div>
      </div>
    );
  }
  return null;
}

function StockProgressChart({ completed }) {
  const chartData = useMemo(() => {
    let cum = 0;
    return Array.from({ length: 14 }, (_, i) => {
      const wi = Math.floor(i / 7), di = i % 7;
      if (completed[`${wi}-${di}`]) cum += 1;
      const jitter = Math.sin(i * 1.4) * 2.1;
      return { day: `D${i + 1}`, value: Math.round(100 + cum * 7 + i * 1.1 + jitter) };
    });
  }, [completed]);
  const first = chartData[0].value, last = chartData[chartData.length - 1].value;
  const change = (((last - first) / first) * 100).toFixed(1);
  const isUp = last >= first;
  const color = isUp ? "#00ff9d" : "#ff4d4d";
  return (
    <Card hover={false} style={{ padding: "18px 20px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 10.5, color: "#666", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>$RESILIENCE — Aura Index</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>{last}</div>
        </div>
        <div style={{ padding: "4px 10px", borderRadius: 8, background: color + "16", border: `1px solid ${color}45`,
          color, fontSize: 12.5, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{isUp ? "▲" : "▼"} {Math.abs(change)}%</div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={chartData} margin={{ top: 10, right: 6, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#161616" vertical={false} />
          <XAxis dataKey="day" stroke="#444" tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} interval={1} />
          <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
          <Tooltip content={<StockTooltip />} />
          <ReferenceLine x="D7" stroke="#2a2a2a" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#stockGrad)" dot={false} activeDot={{ r: 4, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#444", marginTop: 2, fontWeight: 600 }}>
        <span>WEEK 1</span><span>WEEK 2</span>
      </div>
    </Card>
  );
}

export default function Aura() {
  const [step, setStep] = useState("interview");
  const [iIdx, setIIdx] = useState(0);
  const [form, setForm] = useState({
    jobTitle: "", industry: "", skills: "", experience: "", dailyResponsibilities: "",
    biggestFear: "", confidence: "", goal: "", dailyTime: "", learningStyle: "",
    education: "", toolsUsed: "", teamSize: "", aiUsage: "", salaryGoal: "",
    location: "", riskTolerance: "", pastLearning: "", supportSystem: "", biggestBlocker: ""
  });
  const [loading, setLoading] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [data, setData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [skillVideos, setSkillVideos] = useState([]);
  const [extWeekVideos, setExtWeekVideos] = useState([]);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState({});
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, iIdx]);

  const callAI = async (prompt, maxTokens) => {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens: maxTokens || 6500 })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    const text = (json.content || []).map(b => b.text || "").join("");
    let clean = text.replace(/```json|```/g, "").trim();
    const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
    if (s !== -1 && e > s) clean = clean.slice(s, e + 1);
    if (!clean) throw new Error("Empty response — please try again.");
    let parsed;
    try { parsed = JSON.parse(clean); } catch (err) { throw new Error("Could not parse response — please try again."); }
    return {
      automationRisk: parsed.automationRisk || { score: 50, summary: "", topThreats: [] },
      futureCareers: parsed.futureCareers || [],
      skillGaps: parsed.skillGaps || [],
      quiz: parsed.quiz || [],
      weekOneTest: parsed.weekOneTest || [],
      weekTwoTest: parsed.weekTwoTest || [],
      timetable: parsed.timetable || [],
      extendedWeeks: parsed.extendedWeeks || [],
      longTermPhases: parsed.longTermPhases || []
    };
  };

  const analyze = async () => {
    setError(""); setLoading(true);
    try {
      const prompt = "You are a serious career AI advisor. Output ONLY the raw JSON object — no markdown, no commentary.\n\n" +
        "Job Title: " + form.jobTitle + "\n" +
        "Industry: " + form.industry + "\n" +
        "Current Skills: " + form.skills + "\n" +
        "Years of Experience: " + form.experience + "\n" +
        "Daily Responsibilities: " + form.dailyResponsibilities + "\n" +
        "Biggest Fear About AI: " + form.biggestFear + "\n" +
        "Future Confidence: " + form.confidence + "\n" +
        "Career Goal: " + form.goal + "\n" +
        "Daily Time Available: " + form.dailyTime + "\n" +
        "Learning Style: " + form.learningStyle + "\n" +
        "Education: " + form.education + "\n" +
        "Tools Used Daily: " + form.toolsUsed + "\n" +
        "Team Size: " + form.teamSize + "\n" +
        "Current AI Usage: " + form.aiUsage + "\n" +
        "Salary Goal: " + form.salaryGoal + "\n" +
        "Location Flexibility: " + form.location + "\n" +
        "Risk Tolerance: " + form.riskTolerance + "\n" +
        "Past Learning Attempts: " + form.pastLearning + "\n" +
        "Support System: " + form.supportSystem + "\n" +
        "Biggest Blocker: " + form.biggestBlocker + "\n\n" +
        "Build a realistic 90-day (13-week) timetable with specific clock times, calibrated to their stated time and past learning history. For EVERY youtubeQuery field, write a highly specific, popular-style search phrase real YouTube tutorials commonly use (e.g. 'Python for beginners full course 2024'), under 8 words. Also write: a 4-question pre-plan test, a 2-question Week 1 checkpoint, and a 2-question Week 2 checkpoint.\n\n" +
        "Return EXACTLY this JSON shape:\n" +
        "{\n" +
        '  "automationRisk":{"score":<0-100>,"summary":"<2 sentences>","topThreats":["<t1>","<t2>","<t3>"]},\n' +
        '  "futureCareers":[\n' +
        '    {"title":"<>","match":<0-100>,"reason":"<>","tags":["<>","<>"]},\n' +
        '    {"title":"<>","match":<0-100>,"reason":"<>","tags":["<>","<>"]},\n' +
        '    {"title":"<>","match":<0-100>,"reason":"<>","tags":["<>","<>"]}\n' +
        '  ],\n' +
        '  "skillGaps":[\n' +
        '    {"skill":"<>","priority":"high|medium|low","why":"<>","youtubeQuery":"<precise english query>"},\n' +
        '    {"skill":"<>","priority":"high|medium|low","why":"<>","youtubeQuery":"<query>"},\n' +
        '    {"skill":"<>","priority":"high|medium|low","why":"<>","youtubeQuery":"<query>"}\n' +
        '  ],\n' +
        '  "quiz":[\n' +
        '    {"question":"<>","options":["<a>","<b>","<c>","<d>"],"correctIndex":<0-3>,"explanation":"<>"},\n' +
        '    {"question":"<>","options":["<a>","<b>","<c>","<d>"],"correctIndex":<0-3>,"explanation":"<>"},\n' +
        '    {"question":"<>","options":["<a>","<b>","<c>","<d>"],"correctIndex":<0-3>,"explanation":"<>"},\n' +
        '    {"question":"<>","options":["<a>","<b>","<c>","<d>"],"correctIndex":<0-3>,"explanation":"<>"}\n' +
        '  ],\n' +
        '  "weekOneTest":[\n' +
        '    {"question":"<week 1 question>","options":["<a>","<b>","<c>","<d>"],"correctIndex":<0-3>,"explanation":"<>"},\n' +
        '    {"question":"<week 1 question>","options":["<a>","<b>","<c>","<d>"],"correctIndex":<0-3>,"explanation":"<>"}\n' +
        '  ],\n' +
        '  "weekTwoTest":[\n' +
        '    {"question":"<week 2 question>","options":["<a>","<b>","<c>","<d>"],"correctIndex":<0-3>,"explanation":"<>"},\n' +
        '    {"question":"<week 2 question>","options":["<a>","<b>","<c>","<d>"],"correctIndex":<0-3>,"explanation":"<>"}\n' +
        '  ],\n' +
        '  "timetable":[\n' +
        '    {"day":"Day 1 · Mon","time":"7:00–7:45 AM","activity":"<specific task>","type":"learn","youtubeQuery":"<query>"},\n' +
        '    {"day":"Day 2 · Tue","time":"7:00–7:45 AM","activity":"<specific task>","type":"learn","youtubeQuery":"<query>"},\n' +
        '    {"day":"Day 3 · Wed","time":"7:00–8:00 AM","activity":"<specific task>","type":"practice","youtubeQuery":null},\n' +
        '    {"day":"Day 4 · Thu","time":"7:00–7:45 AM","activity":"<specific task>","type":"learn","youtubeQuery":"<query>"},\n' +
        '    {"day":"Day 5 · Fri","time":"7:00–7:45 AM","activity":"<specific task>","type":"learn","youtubeQuery":"<query>"},\n' +
        '    {"day":"Day 6 · Sat","time":"10:00–11:30 AM","activity":"<practice task>","type":"practice","youtubeQuery":null},\n' +
        '    {"day":"Day 7 · Sun","time":"Flexible","activity":"<review task>","type":"rest","youtubeQuery":null},\n' +
        '    {"day":"Day 8 · Mon","time":"7:00–7:45 AM","activity":"<specific task>","type":"learn","youtubeQuery":"<query>"},\n' +
        '    {"day":"Day 9 · Tue","time":"7:00–7:45 AM","activity":"<specific task>","type":"learn","youtubeQuery":"<query>"},\n' +
        '    {"day":"Day 10 · Wed","time":"7:00–8:00 AM","activity":"<specific task>","type":"practice","youtubeQuery":null},\n' +
        '    {"day":"Day 11 · Thu","time":"7:00–7:45 AM","activity":"<specific task>","type":"learn","youtubeQuery":"<query>"},\n' +
        '    {"day":"Day 12 · Fri","time":"7:00–7:45 AM","activity":"<specific task>","type":"learn","youtubeQuery":"<query>"},\n' +
        '    {"day":"Day 13 · Sat","time":"10:00–11:30 AM","activity":"<practice task>","type":"practice","youtubeQuery":null},\n' +
        '    {"day":"Day 14 · Sun","time":"Flexible","activity":"<review task>","type":"rest","youtubeQuery":null}\n' +
        '  ],\n' +
        '  "extendedWeeks":[\n' +
        '    {"weekNumber":3,"theme":"<short theme>","goal":"<one sentence goal>","keyTask":"<most important task>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":4,"theme":"<>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":5,"theme":"<>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":6,"theme":"<>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":7,"theme":"<>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":8,"theme":"<>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":9,"theme":"<>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":10,"theme":"<>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":11,"theme":"<>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":12,"theme":"<>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"},\n' +
        '    {"weekNumber":13,"theme":"<final week theme>","goal":"<>","keyTask":"<>","youtubeQuery":"<query>"}\n' +
        '  ],\n' +
        '  "longTermPhases":[\n' +
        '    {"phase":"Month 2","focus":"<>","milestone":"<>"},\n' +
        '    {"phase":"Month 3","focus":"<>","milestone":"<>"}\n' +
        '  ]\n' +
        '}';

      const result = await callAI(prompt, 6500);
      setData(result);
      setStep("risk");
      setLoadingVideos(true);
      const learnItems = result.timetable.filter(d => d.type === "learn" && d.youtubeQuery);
      const extWeeks = result.extendedWeeks || [];
      const results = await Promise.all([
        Promise.all(learnItems.map(d => fetchYouTubeVideo(d.youtubeQuery))),
        Promise.all(result.skillGaps.map(g => fetchYouTubeVideo(g.youtubeQuery))),
        Promise.all(extWeeks.map(w => fetchYouTubeVideo(w.youtubeQuery)))
      ]);
      const ftVids = results[0], fsVids = results[1], ewVids = results[2];
      let p = 0;
      setVideos(result.timetable.map(d => (d.type === "learn" && d.youtubeQuery) ? ftVids[p++] : null));
      setSkillVideos(fsVids);
      setExtWeekVideos(ewVids);
      setLoadingVideos(false);
    } catch (e) {
      setError((e && e.message) || "Analysis failed. Please try again.");
      setStep("interview");
    }
    setLoading(false);
  };

  const priorityColor = { high: "#ff4d4d", medium: "#ffd700", low: "#00ff9d" };
  const nextBtnStyle = {
    width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg, #00ff9d, #00c9ff)", color: "#000", fontSize: 15, fontWeight: 800,
    letterSpacing: 0.5, marginTop: 10, fontFamily: "'DM Sans', sans-serif"
  };

  const weeks = data ? [data.timetable.slice(0, 7), data.timetable.slice(7, 14)] : [];
  const totalTasks = data ? data.timetable.length : 0;
  const doneCount = Object.values(completed).filter(Boolean).length;
  const donePct = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;
  const xpEarned = data ? Object.entries(completed).reduce((sum, entry) => {
    const key = entry[0], on = entry[1];
    if (!on) return sum;
    const parts = key.split("-");
    const wi = Number(parts[0]), di = Number(parts[1]);
    const item = data.timetable[wi * 7 + di];
    return sum + (item ? (TYPE_XP[item.type] || 20) : 0);
  }, 0) : 0;

  const q = INTERVIEW_QUESTIONS[iIdx];
  const answered = q ? !!(form[q.key] && form[q.key].trim()) : false;
  const isLast = iIdx === INTERVIEW_QUESTIONS.length - 1;

  const resetAll = () => {
    setStep("interview"); setIIdx(0); setData(null); setVideos([]); setSkillVideos([]); setExtWeekVideos([]); setCompleted({});
    setForm({ jobTitle:"",industry:"",skills:"",experience:"",dailyResponsibilities:"",biggestFear:"",confidence:"",goal:"",dailyTime:"",learningStyle:"",
      education:"",toolsUsed:"",teamSize:"",aiUsage:"",salaryGoal:"",location:"",riskTolerance:"",pastLearning:"",supportSystem:"",biggestBlocker:"" });
  };

  return (
    <div ref={scrollerRef} style={{
      height: "100vh", overflowY: "auto", background: "#080808", color: "#e8e8e8",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "44px 20px 90px", position: "relative"
    }} className="aura-scroll">
      {FONTS}
      <GlobalStyle />
      <AmbientBackground scrollerRef={scrollerRef} />
      <ScrollProgressRail scrollerRef={scrollerRef} />

      <div style={{ textAlign: "center", marginBottom: 50, position: "relative", zIndex: 1 }} className="aura-fade-up">
        <Logo />
        <p style={{ color: "#5a5a5a", fontSize: 13, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 600 }}>
          Adaptive Upskilling & Resilience Advisor
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 580, position: "relative", zIndex: 1 }}>
        {step !== "interview" ? <div className="aura-fade-up"><ProgressBar current={step} /></div> : null}

        {step === "interview" && (
          <div className="aura-fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: "#00ff9d", fontFamily: "'JetBrains Mono', monospace" }}>
                Q{String(iIdx + 1).padStart(2, "0")}/{String(INTERVIEW_QUESTIONS.length).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#555", textTransform: "uppercase" }}>Neural Intake</span>
            </div>
            <div style={{ height: 4, background: "#181818", borderRadius: 4, marginBottom: 26, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${((iIdx + 1) / INTERVIEW_QUESTIONS.length) * 100}%`,
                background: "linear-gradient(90deg, #00ff9d, #00c9ff)", transition: "width 0.4s ease" }} />
            </div>
            <h2 style={{ fontSize: 23, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.4 }}>{q.label}</h2>
            {q.helper ? <p style={{ color: "#666", fontSize: 13, marginBottom: 18, lineHeight: 1.6, fontStyle: "italic" }}>{q.helper}</p> : null}

            <Card>
              {q.type === "text" ? (
                <input autoFocus value={form[q.key]} onChange={e => setForm(Object.assign({}, form, { [q.key]: e.target.value }))}
                  placeholder={q.placeholder} className="aura-input" style={inputBase}
                  onKeyDown={e => { if (e.key === "Enter" && answered) { if (isLast) { analyze(); } else { setIIdx(iIdx + 1); } } }} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {q.options.map(o => (
                    <div key={o} onClick={() => setForm(Object.assign({}, form, { [q.key]: o }))} className="opt-card"
                      style={{ padding: "15px 14px", borderRadius: 14, textAlign: "center", display: "flex",
                        alignItems: "center", justifyContent: "center", gap: 8,
                        border: form[q.key] === o ? "1px solid #00ff9d77" : "1px solid #1f1f1f",
                        background: form[q.key] === o ? "linear-gradient(135deg, rgba(0,255,157,0.14), rgba(0,201,255,0.14))" : "#ffffff05",
                        color: form[q.key] === o ? "#fff" : "#c7cad6", fontWeight: 600, fontSize: 13.5 }}>
                      {form[q.key] === o ? <CheckCircle2 size={15} color="#00ff9d" /> : <Circle size={15} color="#444" />}
                      <span>{o}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {error ? <p className="aura-fade-in" style={{ color: "#ff6666", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{error}</p> : null}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { if (iIdx > 0) setIIdx(iIdx - 1); }} disabled={iIdx === 0} className="aura-btn-ghost"
                style={{ flex: "0 0 56px", padding: "16px", borderRadius: 14, border: "1px solid #222", background: "#111",
                  color: iIdx === 0 ? "#444" : "#999", cursor: iIdx === 0 ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", opacity: iIdx === 0 ? 0.5 : 1 }}>
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => { if (!answered || loading) return; if (isLast) { analyze(); } else { setIIdx(iIdx + 1); } }}
                disabled={!answered || loading} className="aura-btn-primary" style={{
                  flex: 1, padding: "16px", borderRadius: 14, border: "none",
                  cursor: (!answered || loading) ? "default" : "pointer",
                  background: (!answered || loading) ? "#141414" : "linear-gradient(135deg, #00ff9d, #00c9ff)",
                  color: (!answered || loading) ? "#555" : "#000", fontSize: 15, fontWeight: 800
                }}>{loading ? "Analyzing..." : isLast ? "Begin Analysis →" : "Next →"}</button>
            </div>
            {loading ? <LoadingDots label="Analyzing your career..." /> : null}
          </div>
        )}

        {step === "risk" && data ? (
          <div className="aura-fade-up">
            <h2 style={{ fontSize: 25, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -0.4 }}>Your Automation Risk</h2>
            <p style={{ color: "#5a5a5a", marginBottom: 20, fontSize: 13.5 }}>
              How at-risk is <strong style={{ color: "#bbb" }}>{form.jobTitle}</strong> from AI?
            </p>
            <Reveal variant="scale">
              <Card hover={false}>
                <RiskMeter score={data.automationRisk.score} />
                <p style={{ color: "#b0b0b0", fontSize: 14.5, lineHeight: 1.8, textAlign: "center", margin: "16px 0" }}>{data.automationRisk.summary}</p>
                <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 18, marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: "#555", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>Top Threats</p>
                  {data.automationRisk.topThreats.map((t, i) => (
                    <Reveal key={i} variant="left" delay={i * 100}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff4d4d", flexShrink: 0, boxShadow: "0 0 8px rgba(255,77,77,0.6)" }} />
                        <span style={{ color: "#ccc", fontSize: 14 }}>{t}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </Card>
            </Reveal>
            <button onClick={() => setStep("careers")} className="aura-btn-primary" style={nextBtnStyle}>See Future-Proof Careers →</button>
          </div>
        ) : null}

        {step === "careers" && data ? (
          <div className="aura-fade-up">
            <h2 style={{ fontSize: 25, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -0.4 }}>Future-Proof Careers</h2>
            <p style={{ color: "#5a5a5a", marginBottom: 20, fontSize: 13.5 }}>Roles that align with your background and resist automation</p>
            {data.futureCareers.map((c, i) => (
              <Reveal key={i} delay={i * 90}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 17.5, fontWeight: 700, color: "#fff" }}>{c.title}</h3>
                      <p style={{ margin: "7px 0 11px", fontSize: 13, color: "#828282", lineHeight: 1.6 }}>{c.reason}</p>
                      <div>{(c.tags || []).map((t, j) => <Tag key={j} text={t} />)}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#00ff9d" }}>{c.match}%</div>
                      <div style={{ fontSize: 9, color: "#5b6275", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 }}>match</div>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ))}
            <button onClick={() => setStep("gaps")} className="aura-btn-primary" style={nextBtnStyle}>See Your Skill Gaps →</button>
          </div>
        ) : null}

        {step === "gaps" && data ? (
          <div className="aura-fade-up">
            <h2 style={{ fontSize: 25, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -0.4 }}>Skill Gaps Detected</h2>
            <p style={{ color: "#5a5a5a", marginBottom: 20, fontSize: 13.5 }}>What's standing between you and a future-proof career — with a direct video for each</p>
            {data.skillGaps.map((g, i) => {
              const pr = (g.priority || "medium").toLowerCase();
              const pc = priorityColor[pr] || "#9aa1b8";
              const pp = PRIORITY_BAR_PCT[pr] || 50;
              return (
                <Reveal key={i} variant="left" delay={i * 90}>
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 15.5, color: "#fff" }}>{g.skill}</div>
                      <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: pc,
                        background: pc + "18", border: `1px solid ${pc}40`, borderRadius: 8, padding: "3px 9px", flexShrink: 0 }}>{g.priority}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#7d8499", lineHeight: 1.6, marginBottom: 12 }}>{g.why}</div>
                    <div style={{ height: 6, background: "#ffffff0a", borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
                      <div style={{ height: "100%", width: `${pp}%`, background: "linear-gradient(90deg, #00ff9d, #00c9ff)" }} />
                    </div>
                    <VideoBlock vid={skillVideos[i]} fallbackQuery={g.youtubeQuery} loading={loadingVideos} />
                  </Card>
                </Reveal>
              );
            })}
            <button onClick={() => setStep("quiz")} className="aura-btn-primary" style={nextBtnStyle}>Take the Quick Test →</button>
          </div>
        ) : null}

        {step === "quiz" && data ? (
          <div className="aura-fade-up">
            <h2 style={{ fontSize: 25, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -0.4 }}>Quick Knowledge Test</h2>
            <p style={{ color: "#5a5a5a", marginBottom: 20, fontSize: 13.5 }}>Checking how solid your understanding is before we build the roadmap</p>
            {data.quiz && data.quiz.length > 0 ? (
              <QuizBlock questions={data.quiz} title="Pre-Plan Test" ctaLabel="Build My Roadmap →" onFinishClick={() => setStep("roadmap")} />
            ) : (
              <div>
                <Card hover={false}><p style={{ color: "#9aa1b8", fontSize: 14, textAlign: "center", margin: 0 }}>No test generated — moving to your roadmap.</p></Card>
                <button onClick={() => setStep("roadmap")} className="aura-btn-primary" style={nextBtnStyle}>Build My Roadmap →</button>
              </div>
            )}
          </div>
        ) : null}

        {step === "roadmap" && data ? (
          <div className="aura-fade-up">
            <h2 style={{ fontSize: 25, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: -0.4 }}>Your 90-Day Roadmap</h2>
            <p style={{ color: "#5a5a5a", marginBottom: 14, fontSize: 13.5 }}>
              Days 1–14 in full detail, then week-by-week through day 90 {loadingVideos ? "— fetching video links..." : ""}
            </p>

            <Reveal>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <StatCard icon={<Target size={16} color="#00ff9d" />} label="Tasks Done" value={`${doneCount}/${totalTasks}`} sub={`${donePct}% complete`} />
                <StatCard icon={<Zap size={16} color="#00c9ff" />} label="XP Earned" value={xpEarned} />
                <StatCard icon={<TrendingUp size={16} color="#00ff9d" />} label="Resilience" value={Math.round(100 + doneCount * 7 + 13 * 1.1)} sub="index score" />
              </div>
            </Reveal>

            <Reveal delay={80}><StockProgressChart completed={completed} /></Reveal>

            {weeks.map((week, wi) => (
              <div key={wi} style={{ marginBottom: 18, marginTop: 22 }}>
                <Reveal variant="left">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg, #00ff9d, #00c9ff)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#000" }}>{wi + 1}</div>
                    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#ccc" }}>Week {wi + 1}</span>
                  </div>
                </Reveal>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 19, top: 6, bottom: 6, width: 2, background: "linear-gradient(180deg, #00ff9d, #1a1a1a)" }} />
                  {week.map((d, di) => {
                    const globalIdx = wi * 7 + di, key = `${wi}-${di}`, isDone = !!completed[key];
                    const vid = videos[globalIdx], color = DAY_TYPE_COLOR[d.type] || "#888";
                    return (
                      <Reveal key={di} delay={di * 60} style={{ display: "flex", gap: 20, marginBottom: 16, position: "relative" }}>
                        <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: "#111",
                          border: `2px solid ${isDone ? "#00ff9d" : color}`, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800, color: isDone ? "#00ff9d" : color, zIndex: 1, textAlign: "center", lineHeight: 1 }}>
                          {(d.day.split("·")[1] ? d.day.split("·")[1].trim() : d.day.slice(0, 3))}
                        </div>
                        <Card style={{ flex: 1, marginBottom: 0, opacity: isDone ? 0.6 : 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, color: "#666", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{d.time}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                                color, background: color + "16", border: `1px solid ${color}40`, borderRadius: 12, padding: "2px 8px" }}>
                                {DAY_TYPE_LABEL[d.type] || d.type}
                              </span>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: "#5b6275" }}>+{TYPE_XP[d.type] || 20} XP</span>
                            </div>
                            <button onClick={() => setCompleted(Object.assign({}, completed, { [key]: !completed[key] }))}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, lineHeight: 0 }}>
                              {isDone ? <CheckCircle2 size={22} color="#00ff9d" /> : <Circle size={22} color="#444" />}
                            </button>
                          </div>
                          <div className={isDone ? "done-task" : ""} style={{ fontWeight: 700, fontSize: 14.5, color: "#fff",
                            marginBottom: d.type === "learn" && !isDone ? 12 : 0, lineHeight: 1.5 }}>{d.activity}</div>
                          {d.type === "learn" && !isDone ? <VideoBlock vid={vid} fallbackQuery={d.youtubeQuery} loading={loadingVideos} /> : null}
                        </Card>
                      </Reveal>
                    );
                  })}
                </div>
                {wi === 0 && data.weekOneTest && data.weekOneTest.length > 0 ? (
                  <Reveal delay={120}><div style={{ marginTop: 6 }}><QuizBlock questions={data.weekOneTest} title="Week 1 Checkpoint" compact={true} /></div></Reveal>
                ) : null}
                {wi === 1 && data.weekTwoTest && data.weekTwoTest.length > 0 ? (
                  <Reveal delay={120}><div style={{ marginTop: 6 }}><QuizBlock questions={data.weekTwoTest} title="Week 2 Checkpoint" compact={true} /></div></Reveal>
                ) : null}
              </div>
            ))}

            <Reveal>
              <div style={{ marginBottom: 14, marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#ccc" }}>
                  Weeks 3–13 · Your 90-Day Arc
                </span>
              </div>
            </Reveal>
            {(data.extendedWeeks || []).map((w, i) => (
              <Reveal key={i} delay={i * 40}>
                <Card>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10.5, color: "#00c9ff", letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                      Week {w.weekNumber}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{w.theme}</div>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#7d8499", lineHeight: 1.6, marginBottom: 10 }}>{w.goal}</div>
                  <div style={{ background: "#ffffff05", border: "1px solid #ffffff0f", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                    <div style={{ fontSize: 9.5, color: "#5b6275", fontWeight: 700, letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" }}>Key Task</div>
                    <div style={{ fontSize: 13, color: "#d7dae3", lineHeight: 1.5 }}>{w.keyTask}</div>
                  </div>
                  <VideoBlock vid={extWeekVideos[i]} fallbackQuery={w.youtubeQuery} loading={loadingVideos} />
                </Card>
              </Reveal>
            ))}

            <Reveal>
              <div style={{ marginBottom: 14, marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#ccc" }}>Beyond Day 90</span>
              </div>
            </Reveal>
            {(data.longTermPhases || []).map((p, i) => (
              <Reveal key={i} delay={i * 90}>
                <Card>
                  <div style={{ fontSize: 11, color: "#00c9ff", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 7 }}>{p.phase}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 5 }}>{p.focus}</div>
                  <div style={{ fontSize: 13, color: "#828282", lineHeight: 1.6 }}>🎯 {p.milestone}</div>
                </Card>
              </Reveal>
            ))}

            <button onClick={resetAll} className="aura-btn-ghost" style={Object.assign({}, nextBtnStyle, { background: "#111", color: "#999", border: "1px solid #222", marginTop: 12 })}>
              Analyze Another Career
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}