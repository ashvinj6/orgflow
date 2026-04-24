import { useState, useEffect, useRef } from "react";
import { Users, Calendar, CheckSquare, BarChart2, NotebookPen } from "lucide-react";

const ROTATING_WORDS = ["organization", "club", "fraternity", "sorority", "association", "program", "cohort"];

// ── Dark blue palette ──
const C = {
  bgMain:   "#07101f",
  bgCard:   "#0d1b33",
  bgDeep:   "#040c18",
  border:   "#1a2f52",
  borderSub:"#122240",
  textPri:  "#f1f5f9",
  textMut:  "#7a96b8",
  textDim:  "#4a6580",
  orange:   "#f97316",
};

const FEATURES = [
  {
    icon: <Users size={22} />,
    color: "#6366f1",
    title: "Member Directory",
    description:
      "Keep a live roster of every member, exec and general. Track roles, committees, join dates, and engagement history all in one searchable directory.",
  },
  {
    icon: <Calendar size={22} />,
    color: "#f97316",
    title: "Event Planning & Attendance",
    description:
      "Create events in seconds, generate unique check-in codes, and let members log attendance from their phones. No spreadsheets, no manual sign-in sheets.",
  },
  {
    icon: <CheckSquare size={22} />,
    color: "#8b5cf6",
    title: "Participation Requirements",
    description:
      "Define point or event requirements per category with deadlines. Every member sees their real-time progress, and officers see who's on track and who needs a nudge.",
  },
  {
    icon: <BarChart2 size={22} />,
    color: "#06b6d4",
    title: "Insights & Analytics",
    description:
      "At-a-glance dashboards show attendance rates, top members, event trends, and engagement over time so you always know the health of your organization.",
  },
  {
    icon: <NotebookPen size={22} />,
    color: "#22c55e",
    title: "Officer Notes & Handoffs",
    description:
      "A shared notes space for meeting recaps, project docs, and institutional memory. No more knowledge walking out the door at the end of the year.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your organization",
    body: "Sign up as an officer, name your organization, and OrgFlow generates your unique exec and member join codes instantly.",
  },
  {
    step: "02",
    title: "Invite your team",
    body: "Share the exec code with officers and the member code with your general membership. Everyone joins in under a minute.",
  },
  {
    step: "03",
    title: "Run everything from one place",
    body: "Post events, track who showed up, monitor requirements progress, and pull insights, all without leaving OrgFlow.",
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function FadeIn({ children, delay = 0, style = {} }) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
        height: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState("typing");
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    const word = ROTATING_WORDS[wordIndex];
    if (phase === "typing") {
      if (displayText.length < word.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayText(word.slice(0, displayText.length + 1));
        }, 80);
      } else {
        timeoutRef.current = setTimeout(() => setPhase("pausing"), 1400);
      }
    } else if (phase === "pausing") {
      timeoutRef.current = setTimeout(() => setPhase("deleting"), 200);
    } else if (phase === "deleting") {
      if (displayText.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 45);
      } else {
        setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(timeoutRef.current);
  }, [displayText, phase, wordIndex]);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bgMain, color: C.textPri, overflowX: "hidden" }}>

      {/* ── Nav + Hero share one gradient wrapper so they blend ── */}
      <div style={{ background: `radial-gradient(ellipse 90% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 65%)` }}>

      {/* ── Nav ── */}
      <nav
        style={{
          position: "sticky", top: 0, zIndex: 100,
          background: scrolled ? "rgba(7,16,31,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
          transition: "all 0.25s ease",
          padding: "0 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 60,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <img src="/orgflow_logo.png" alt="OrgFlow" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>OrgFlow</span>
        </div>

        <div style={{ display: "flex", gap: 32, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          {["Features", "How it works", "For members"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, "-")}`}
              style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.6)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            >
              {label}
            </a>
          ))}
        </div>

        <button
          onClick={onGetStarted}
          style={{
            padding: "8px 20px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.18)",
            background: "transparent", color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
        >
          Get started free
        </button>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "80px 24px 60px",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)",
            borderRadius: 100, padding: "5px 14px", marginBottom: 36,
            fontSize: 12, fontWeight: 600, color: C.orange,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, display: "inline-block" }} />
          Built for student organizations
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(42px, 7vw, 80px)",
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            maxWidth: 820,
            margin: "0 auto 24px",
            color: C.textPri,
          }}
        >
          Run your <span style={{ color: C.orange }}>{displayText}<span
            style={{
              display: "inline-block",
              width: "3px",
              height: "0.85em",
              background: C.orange,
              marginLeft: "3px",
              verticalAlign: "middle",
              borderRadius: "1px",
              animation: "blink 1s step-end infinite",
            }}
          /></span>
          <br />
          without the chaos.
        </h1>
        <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

        <p
          style={{
            fontSize: "clamp(15px, 2vw, 18px)",
            color: C.textMut,
            maxWidth: 520,
            margin: "0 auto 44px",
            lineHeight: 1.7,
          }}
        >
          OrgFlow gives student organizations the tools to manage members, plan events,
          track attendance, and monitor participation, all in one place.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={onGetStarted}
            style={{
              padding: "14px 32px", borderRadius: 10, border: "none",
              background: C.orange, color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s ease",
              boxShadow: "0 4px 24px rgba(249,115,22,0.4)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Get started free →
          </button>
          <a
            href="#how-it-works"
            style={{
              padding: "14px 28px", borderRadius: 10, border: `1.5px solid ${C.border}`,
              background: C.bgCard, color: C.textPri, fontSize: 15, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s ease",
              textDecoration: "none", display: "inline-block",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.textMut)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
          >
            See how it works
          </a>
        </div>

        <div style={{ marginTop: 72, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", textTransform: "uppercase" }}>Scroll to explore</span>
          <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, ${C.border}, transparent)` }} />
        </div>
      </section>
      </div>{/* end gradient wrapper */}

      {/* ── Features ── */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1080, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.orange, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Everything you need
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, color: C.textPri }}>
              One platform, zero spreadsheets.
            </h2>
            <p style={{ fontSize: 16, color: C.textMut, maxWidth: 480, margin: "14px auto 0" }}>
              Every tool your exec board needs to keep the club running smoothly, and every view your members need to stay engaged.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.07} style={{ gridColumn: i < 3 ? "span 2" : "span 3", height: "auto" }}>
              <div
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: "28px 26px",
                  height: "100%",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4)`;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "#2a4a7a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = C.border;
                }}
              >
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${f.color}1a`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, color: f.color, marginBottom: 16,
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.01em", color: C.textPri }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.textMut, lineHeight: 1.65, margin: 0, flex: 1 }}>{f.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ background: C.bgDeep, padding: "100px 24px", borderTop: `1px solid ${C.borderSub}`, borderBottom: `1px solid ${C.borderSub}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.orange, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                Get up and running fast
              </p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.02em", color: C.textPri, margin: 0 }}>
                Up in three steps.
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.1} style={{ height: "auto" }}>
                <div style={{ padding: "28px", background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, letterSpacing: "0.08em", marginBottom: 14 }}>
                    {step.step}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: C.textPri, marginBottom: 10, letterSpacing: "-0.01em" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 14, color: C.textMut, lineHeight: 1.7, margin: 0 }}>{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── For members ── */}
      <section id="for-members" style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 60, alignItems: "center", flexWrap: "wrap" }}>
          <FadeIn style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              For general members
            </p>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 18, color: C.textPri }}>
              Your involvement,<br />always visible.
            </h2>
            <p style={{ fontSize: 15, color: C.textMut, lineHeight: 1.7, marginBottom: 24 }}>
              Members get their own dashboard to see upcoming events, log attendance with a code,
              and track their progress against participation requirements in real time.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "See all upcoming and past events",
                "Check in to events with a code",
                "Track requirement progress live",
                "Know exactly where you stand",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#22c55e", flexShrink: 0 }}>
                    ✓
                  </div>
                  <span style={{ fontSize: 14, color: C.textMut }}>{item}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Mockup card */}
          <FadeIn delay={0.15} style={{ flex: 1, minWidth: 280 }}>
            <div
              style={{
                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20,
                padding: "24px", boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
                Participation Requirements
              </div>
              {[
                { label: "Social Events", cat: "#22c55e", pct: 80, count: "4 / 5 events" },
                { label: "Professional", cat: "#6366f1", pct: 50, count: "1 / 2 events" },
                { label: "Academic", cat: "#f97316", pct: 100, count: "3 / 3 events", done: true },
              ].map((r) => (
                <div key={r.label} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.cat, display: "inline-block" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{r.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: C.textMut }}>{r.count}</span>
                      {r.done && <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", padding: "1px 7px", borderRadius: 20 }}>✓ Done</span>}
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: C.bgDeep, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${r.pct}%`, background: r.done ? "#22c55e" : r.cat }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 20, padding: "12px 14px", background: C.bgDeep, borderRadius: 10, border: `1px solid ${C.borderSub}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>Overall progress</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.orange }}>77%</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: "80px 24px" }}>
        <FadeIn>
          <div
            style={{
              maxWidth: 680, margin: "0 auto", textAlign: "center",
              background: "rgba(249,115,22,0.07)",
              border: "1px solid rgba(249,115,22,0.2)",
              borderRadius: 24, padding: "60px 40px",
            }}
          >
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14, color: C.textPri }}>
              Ready to bring order to your organization?
            </h2>
            <p style={{ fontSize: 15, color: C.textMut, lineHeight: 1.65, maxWidth: 440, margin: "0 auto 32px" }}>
              Set up takes minutes. No contracts, no complexity. Just tools that actually help your organization run.
            </p>
            <button
              onClick={onGetStarted}
              style={{
                padding: "15px 40px", borderRadius: 10, border: "none",
                background: C.orange, color: "#fff", fontSize: 16, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s ease",
                boxShadow: "0 4px 24px rgba(249,115,22,0.4)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Get started free →
            </button>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: `1px solid ${C.borderSub}`, padding: "32px 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, background: C.bgDeep,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <img src="/orgflow_logo.png" alt="OrgFlow" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: C.textPri }}>OrgFlow</span>
        </div>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>© 2026 OrgFlow. Designed for student orgs. Built by Ashvin Jayanthi & Nidhi Kiran. ✦</p>
        <button
          onClick={onGetStarted}
          style={{
            padding: "8px 18px", borderRadius: 7, border: `1.5px solid ${C.border}`,
            background: "transparent", color: C.textMut, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.textPri; e.currentTarget.style.borderColor = C.textMut; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textMut; e.currentTarget.style.borderColor = C.border; }}
        >
          Log in →
        </button>
      </footer>
    </div>
  );
}
