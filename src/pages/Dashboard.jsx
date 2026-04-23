import { useState } from "react";
import { useMembers } from "../context/MembersContext";
import { useEvents } from "../context/EventsContext";
import { useAuth } from "../context/AuthContext";
import { getEngagementLevel, getEngagementColor } from "../data/mockData";

// Count distinct events a member attended (attendance map covers all sources)
function getMemberAttendanceCount(memberId, attendance) {
  return Object.values(attendance).filter((attendees) => attendees.includes(memberId)).length;
}

// ── Participation threshold: 60% of past events, min 1 ──
function getRequired(pastCount) {
  return Math.max(Math.ceil(pastCount * 0.6), 1);
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
function isPast(dateStr) { return new Date(dateStr) < TODAY; }

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ────────────────────────────────────────────
// SVG Donut Chart (2-segment)
// ────────────────────────────────────────────
function DonutChart({ value, total, color, label, sublabel }) {
  const size = 148;
  const cx = size / 2;
  const cy = size / 2;
  const r = 54;
  const strokeW = 20;
  const circumference = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.min(value / total, 1) : 0;
  const filled = fraction * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {fraction > 0 && (
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={strokeW}
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeLinecap={fraction >= 1 ? "butt" : "round"}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)" }}
          />
        )}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a" fontFamily="DM Sans, sans-serif">
          {value}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="DM Sans, sans-serif">
          of {total}
        </text>
      </svg>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>{label}</div>
      {sublabel && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sublabel}</div>}
    </div>
  );
}

// ────────────────────────────────────────────
// Stacked Horizontal Bar
// ────────────────────────────────────────────
function StackedBar({ segments }) {
  // segments: [{ label, value, color }]
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      {/* Bar */}
      <div style={{ display: "flex", height: 12, borderRadius: 8, overflow: "hidden", gap: 2, marginBottom: 14 }}>
        {segments.map(({ label, value, color }) => {
          const pct = total > 0 ? (value / total) * 100 : 0;
          return pct > 0 ? (
            <div key={label} style={{ flex: pct, background: color, transition: "flex 0.6s ease", minWidth: pct > 0 ? 4 : 0 }} />
          ) : null;
        })}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segments.map(({ label, value, color }) => {
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#64748b", flex: 1 }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{value}</span>
              <span style={{ fontSize: 11, color: "#94a3b8", width: 34, textAlign: "right" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// KPI Stat Card
// ────────────────────────────────────────────
function KpiCard({ label, value, sub, color, alert }) {
  return (
    <div
      style={{
        flex: 1,
        border: `1px solid ${alert ? "#fecaca" : "var(--border, #e2e8f0)"}`,
        borderRadius: 14, padding: "20px 22px",
        background: alert ? "#fff5f5" : "#fff",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: color || "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ────────────────────────────────────────────
// Member row in the insights table
// ────────────────────────────────────────────
function MemberRow({ member, attended, total, required, isLast }) {
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
  const level = getEngagementLevel(attended, total);
  const color = getEngagementColor(level);
  const belowThreshold = attended < required && total > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 18px",
        borderBottom: isLast ? "none" : "1px solid #f8fafc",
        background: belowThreshold ? "#fffbeb" : "#fff",
        transition: "background 0.15s",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: `${color}20`, border: `1.5px solid ${color}50`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color, marginRight: 12,
        }}
      >
        {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
      </div>

      {/* Name + role */}
      <div style={{ flex: 2, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
          {member.name}
          {belowThreshold && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "#fffbeb", border: "1px solid #fde68a", padding: "1px 6px", borderRadius: 10 }}>
              At Risk
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{member.role}{member.committee ? ` · ${member.committee}` : ""}</div>
      </div>

      {/* Attendance count */}
      <div style={{ flex: 1, textAlign: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{attended}</span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}> / {total}</span>
      </div>

      {/* Mini progress bar */}
      <div style={{ flex: 1.5, padding: "0 12px" }}>
        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              height: "100%", borderRadius: 4,
              width: `${rate}%`, background: color,
              transition: "width 0.6s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, textAlign: "right" }}>{rate}%</div>
      </div>

      {/* Status badge */}
      <div style={{ width: 72, textAlign: "right" }}>
        <span
          style={{
            fontSize: 11, fontWeight: 600, color,
            background: `${color}15`, padding: "3px 9px", borderRadius: 20,
          }}
        >
          {level}
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Main Dashboard
// ────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const { members } = useMembers();
  const { events, attendance } = useEvents();
  const { activeOrg, user } = useAuth();

  const [alertExpanded, setAlertExpanded] = useState(true);
  const [memberSort, setMemberSort] = useState("rate-asc"); // rate-asc | rate-desc | name | status
  const [memberSearch, setMemberSearch] = useState("");

  // ── Derived data ──
  const pastEvents   = events.filter((e) => isPast(e.date));
  const futureEvents = events.filter((e) => !isPast(e.date));
  const required     = getRequired(pastEvents.length);

  const enriched = members.map((m) => {
    const attended = getMemberAttendanceCount(m.id, attendance);
    const rate     = pastEvents.length > 0 ? Math.round((attended / pastEvents.length) * 100) : 0;
    const level    = getEngagementLevel(attended, pastEvents.length);
    return { ...m, attended, rate, level };
  });

  const belowThreshold = enriched.filter((m) => m.attended < required && pastEvents.length > 0);
  const activeCount    = enriched.filter((m) => m.level === "High" || m.level === "Medium").length;
  const avgRate        = enriched.length > 0 ? Math.round(enriched.reduce((s, m) => s + m.rate, 0) / enriched.length) : 0;

  // ── Engagement breakdown for stacked bar ──
  const engagementBreakdown = ["High", "Medium", "Low", "Inactive"].map((lvl) => ({
    label: lvl,
    value: enriched.filter((m) => m.level === lvl).length,
    color: getEngagementColor(lvl),
  }));

  // ── Sorted / filtered member list ──
  const sorted = [...enriched]
    .filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()) || (m.role || "").toLowerCase().includes(memberSearch.toLowerCase()))
    .sort((a, b) => {
      if (memberSort === "rate-asc")  return a.rate - b.rate;
      if (memberSort === "rate-desc") return b.rate - a.rate;
      if (memberSort === "name")      return a.name.localeCompare(b.name);
      if (memberSort === "status") {
        const order = { Inactive: 0, Low: 1, Medium: 2, High: 3, New: 4 };
        return (order[a.level] ?? 5) - (order[b.level] ?? 5);
      }
      return 0;
    });

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Executive Dashboard
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary, #0f172a)", margin: 0, letterSpacing: "-0.02em" }}>
          Welcome, {user?.name?.split(" ")[0] ?? "there"}!
        </h1>
        <p style={{ color: "var(--text-muted, #64748b)", marginTop: 4, fontSize: 14, margin: 0 }}>
          {activeOrg?.orgName ?? "Organization"} — attendance analytics and member participation tracking.
        </p>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total Members" value={members.length} sub={`${activeCount} active this semester`} />
        <KpiCard label="Events Completed" value={pastEvents.length} sub={`${futureEvents.length} upcoming`} color="#f97316" />
        <KpiCard label="Avg Participation" value={`${avgRate}%`} sub={`across all members`} color={avgRate >= 60 ? "#22c55e" : "#f59e0b"} />
        <KpiCard
          label="Below Threshold"
          value={belowThreshold.length}
          sub={belowThreshold.length > 0 ? `need attention` : "everyone's on track"}
          color={belowThreshold.length > 0 ? "#ef4444" : "#22c55e"}
          alert={belowThreshold.length > 0}
        />
      </div>

      {/* ── Event Analytics section ── */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 14px", letterSpacing: "-0.01em" }}>
          Event Analytics
        </h2>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>

        {/* Event progress donut */}
        <div
          style={{
            background: "#fff", border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 14, padding: "24px 28px",
            display: "flex", gap: 32, alignItems: "center", flex: 1,
          }}
        >
          <DonutChart
            value={pastEvents.length}
            total={events.length}
            color="#f97316"
            label="Completed Events"
            sublabel={`${futureEvents.length} remaining`}
          />

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>
              Semester Progress
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Completed", value: pastEvents.length, color: "#f97316" },
                { label: "Upcoming",  value: futureEvents.length, color: "#f1f5f9", textColor: "#94a3b8" },
              ].map(({ label, value, color, textColor }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0, border: color === "#f1f5f9" ? "1px solid #e2e8f0" : "none" }} />
                  <span style={{ fontSize: 12, color: "#64748b", flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: textColor || "#0f172a" }}>{value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "#f1f5f9" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10 }} />
                <span style={{ fontSize: 12, color: "#64748b", flex: 1 }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{events.length}</span>
              </div>
              {pastEvents.length > 0 && (
                <div style={{ marginTop: 4, padding: "8px 12px", background: "#fff7ed", borderRadius: 8, border: "1px solid #fed7aa" }}>
                  <span style={{ fontSize: 12, color: "#92400e" }}>
                    <strong>{Math.round((pastEvents.length / events.length) * 100)}%</strong> of semester complete
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Member activity breakdown */}
        <div
          style={{
            background: "#fff", border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 14, padding: "24px 28px",
            display: "flex", gap: 32, alignItems: "center", flex: 1,
          }}
        >
          <DonutChart
            value={activeCount}
            total={members.length}
            color="#22c55e"
            label="Active Members"
            sublabel={`${members.length - activeCount} inactive`}
          />

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>
              Engagement Breakdown
            </div>
            <StackedBar segments={engagementBreakdown} />
            {members.length > 0 && (
              <div style={{ marginTop: 14, padding: "8px 12px", background: activeCount / members.length >= 0.6 ? "#f0fdf4" : "#fffbeb", borderRadius: 8, border: `1px solid ${activeCount / members.length >= 0.6 ? "#bbf7d0" : "#fde68a"}` }}>
                <span style={{ fontSize: 12, color: activeCount / members.length >= 0.6 ? "#166534" : "#92400e" }}>
                  <strong>{Math.round((activeCount / members.length) * 100)}% active rate</strong>
                  {activeCount / members.length >= 0.6 ? ", on target" : ", below 60% goal"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Member Insights section ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
          Member Insights
        </h2>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          Threshold: {required} event{required !== 1 ? "s" : ""} ({Math.round(required / Math.max(pastEvents.length, 1) * 100)}% of {pastEvents.length} past)
        </span>
      </div>

      {/* Threshold alert banner */}
      {belowThreshold.length > 0 && (
        <div
          style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 12, marginBottom: 16, overflow: "hidden",
          }}
        >
          {/* Banner header */}
          <div
            onClick={() => setAlertExpanded((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", cursor: "pointer", userSelect: "none",
            }}
          >
            <span style={{ fontSize: 15 }}>⚠️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e", flex: 1 }}>
              {belowThreshold.length} member{belowThreshold.length !== 1 ? "s" : ""} below participation threshold
            </span>
            <span style={{ fontSize: 12, color: "#b45309" }}>
              {alertExpanded ? "Hide ▲" : "Show ▼"}
            </span>
          </div>

          {/* Member chips */}
          {alertExpanded && (
            <div style={{ padding: "4px 16px 14px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {belowThreshold.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "#fff", border: "1px solid #fde68a",
                    borderRadius: 8, padding: "7px 12px",
                  }}
                >
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: `${getEngagementColor(m.level)}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: getEngagementColor(m.level), flexShrink: 0,
                    }}
                  >
                    {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {m.attended} / {pastEvents.length} events · {m.rate}%
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700,
                      color: getEngagementColor(m.level),
                      background: `${getEngagementColor(m.level)}15`,
                      padding: "2px 7px", borderRadius: 20, marginLeft: 4,
                    }}
                  >
                    {m.level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Member table */}
      <div
        style={{
          background: "#fff", border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 14, overflow: "hidden",
        }}
      >
        {/* Table toolbar */}
        <div
          style={{
            padding: "14px 18px", borderBottom: "1px solid #f1f5f9",
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}
        >
          {/* Search */}
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search members..."
            style={{
              flex: 1, minWidth: 160, padding: "8px 12px", borderRadius: 8,
              border: "1.5px solid #e2e8f0", fontSize: 13, background: "#f8fafc",
              color: "#0f172a", outline: "none", fontFamily: "inherit",
            }}
          />
          {/* Sort */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "rate-asc",  label: "Rate ↑" },
              { key: "rate-desc", label: "Rate ↓" },
              { key: "name",      label: "Name"   },
              { key: "status",    label: "Status" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMemberSort(key)}
                style={{
                  padding: "6px 12px", borderRadius: 7, border: "1.5px solid",
                  borderColor: memberSort === key ? "#f97316" : "#e2e8f0",
                  background: memberSort === key ? "#fff7ed" : "transparent",
                  color: memberSort === key ? "#f97316" : "#64748b",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.12s ease",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
            {sorted.length} member{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Column headers */}
        <div
          style={{
            display: "flex", alignItems: "center", padding: "8px 18px",
            background: "#f8fafc", borderBottom: "1px solid #f1f5f9",
          }}
        >
          {[
            { label: "Member",     flex: 2 },
            { label: "Attended",   flex: 1, center: true },
            { label: "Rate",       flex: 1.5 },
            { label: "Status",     flex: 0, width: 72, right: true },
          ].map(({ label, flex, center, right, width }) => (
            <div
              key={label}
              style={{
                flex: flex || "none", width: width,
                fontSize: 11, fontWeight: 700, color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.05em",
                textAlign: center ? "center" : right ? "right" : "left",
                paddingLeft: label === "Member" ? 46 : 0,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            No members match your search.
          </div>
        ) : (
          sorted.map((m, i) => (
            <MemberRow
              key={m.id}
              member={m}
              attended={m.attended}
              total={pastEvents.length}
              required={required}
              isLast={i === sorted.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
