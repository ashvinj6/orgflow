import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useEvents } from "../context/EventsContext";
import { useRequirements } from "../context/RequirementsContext";
import { supabase } from "../lib/supabase";
import {
  getActiveSessionsForOrg, getSessionByCode,
  recordCheckIn, hasCheckedIn, formatCountdown,
} from "../utils/checkin";
import { getEventState, isLateToday } from "../utils/eventState";


// ── Date helpers ──
function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ── EVENT TYPE colors ──
const TYPE_COLORS = {
  "General Meeting": "#6366f1",
  "Workshop":        "#f97316",
  "Speaker Event":   "#0ea5e9",
  "Social":          "#10b981",
};
function typeColor(type) { return TYPE_COLORS[type] || "#94a3b8"; }

// ── Requirement category colors ──
const CAT_COLORS = {
  Social: "#f97316", Professional: "#6366f1", Academic: "#0ea5e9",
  "Community Service": "#22c55e", Leadership: "#ec4899", General: "#64748b",
};
const CAT_FALLBACK = ["#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#3b82f6"];
function reqCategoryColor(cat) {
  if (CAT_COLORS[cat]) return CAT_COLORS[cat];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = ((h << 5) - h) + cat.charCodeAt(i);
  return CAT_FALLBACK[Math.abs(h) % CAT_FALLBACK.length];
}


// ────────────────────────────────────────────
// Join Org Modal
// ────────────────────────────────────────────
function JoinOrgModal({ onClose }) {
  const { joinMemberOrg } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [focused, setFocused] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!code.trim()) { setError("Please enter a join code."); return; }
    const result = await joinMemberOrg(code);
    if (!result.success) { setError(result.error); return; }
    setSuccess(result.org?.name || result.orgName || "your organization");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "36px 32px", width: 400, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
        {success ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.02em" }}>You're in!</h2>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
              You've joined <strong style={{ color: "#0f172a" }}>{success}</strong>.
            </p>
            <button onClick={onClose} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>Join an Organization</h2>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 0 }}>Enter the member join code from your org's officers.</p>
              </div>
              <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20, padding: "2px 6px", lineHeight: 1 }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Member Join Code</label>
                <input
                  value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. XYZ789"
                  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  autoFocus
                  style={{ width: "100%", padding: "13px 16px", borderRadius: 8, border: `2px solid ${focused ? "#6366f1" : "#e2e8f0"}`, fontSize: 22, fontWeight: 800, letterSpacing: "0.22em", background: "#f8fafc", color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "monospace", textAlign: "center", transition: "border-color 0.15s ease" }}
                />
              </div>
              {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s ease" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>Join Organization</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Stat Card
// ────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 22px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: color || "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ────────────────────────────────────────────
// Inline code entry for tracked events
// ────────────────────────────────────────────
function InlineCodeEntry({ event, onSuccess, late = false }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!event.track_attendance || !event.attendance_code) {
      setError("This event does not have an attendance code.");
      return;
    }
    if (event.attendance_code !== code.trim()) {
      setError("Incorrect code. Double-check with your officer.");
      return;
    }
    onSuccess(event.id, late);
    setOpen(false);
  }

  const btnColor = late ? "#f59e0b" : "#6366f1";
  const btnBg   = late ? "#fffbeb" : "#eef2ff";
  const btnBorder = late ? "#fde68a" : "#a5b4fc";
  const btnHover  = late ? "#fef3c7" : "#e0e7ff";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "6px 12px", borderRadius: 7, flexShrink: 0,
          background: btnBg, color: btnColor, border: `1.5px solid ${btnBorder}`,
          fontSize: 12, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = btnHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = btnBg)}
      >
        {late ? "Enter Code (Late)" : "Enter Code"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
      {late && (
        <div style={{ fontSize: 11, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "4px 8px", maxWidth: 240 }}>
          This event has ended — your check-in will be marked as late attendance.
        </div>
      )}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
          placeholder="000000"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus
          maxLength={6}
          style={{
            width: 90, padding: "6px 10px", borderRadius: 7,
            border: `2px solid ${error ? "#fca5a5" : focused ? btnColor : "#e2e8f0"}`,
            fontSize: 16, fontWeight: 800, letterSpacing: "0.2em",
            background: "#f8fafc", color: "#0f172a", outline: "none",
            fontFamily: "monospace", textAlign: "center",
            transition: "border-color 0.15s ease",
          }}
        />
        <button
          type="submit"
          disabled={code.length !== 6}
          style={{
            padding: "6px 12px", borderRadius: 7, border: "none",
            background: code.length === 6 ? btnColor : "#e2e8f0",
            color: code.length === 6 ? "#fff" : "#94a3b8",
            fontSize: 12, fontWeight: 700, cursor: code.length === 6 ? "pointer" : "not-allowed",
            fontFamily: "inherit", transition: "all 0.15s ease",
          }}
        >
          Submit
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setCode(""); setError(""); }}
          style={{ padding: "6px 8px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
        >
          ✕
        </button>
      </div>
      {error && <div style={{ fontSize: 11, color: "#ef4444", maxWidth: 220 }}>{error}</div>}
    </form>
  );
}

// ────────────────────────────────────────────
// Event Row (in the list)
// ────────────────────────────────────────────
function EventRow({ event, attended, onToggle, onCodeSuccess, state }) {
  const color = typeColor(event.type);
  const late = isLateToday(event);
  const tracked = event.track_attendance && event.attendance_code;

  // State chip for ongoing / late-today
  let stateChip = null;
  if (state === "ongoing") {
    stateChip = <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", flexShrink: 0 }}>● In Progress</span>;
  } else if (late) {
    stateChip = <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", flexShrink: 0 }}>Ended</span>;
  }

  // Action button based on state
  let action;
  if (attended) {
    action = (
      <span style={{ padding: "6px 12px", borderRadius: 7, flexShrink: 0, background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #bbf7d0", fontSize: 12, fontWeight: 700 }}>
        ✓ Attended
      </span>
    );
  } else if (state === "ongoing") {
    action = tracked
      ? <InlineCodeEntry event={event} onSuccess={onCodeSuccess} late={false} />
      : (
        <button
          onClick={() => onToggle(event.id)}
          style={{ padding: "6px 12px", borderRadius: 7, border: "none", flexShrink: 0, background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          Check In
        </button>
      );
  } else if (state === "past") {
    action = tracked
      ? <InlineCodeEntry event={event} onSuccess={onCodeSuccess} late={late} />
      : (
        <button
          onClick={() => onToggle(event.id, late)}
          style={{ padding: "6px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", flexShrink: 0, background: "#f8fafc", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          {late ? "Mark Attended (Late)" : "Mark Attended"}
        </button>
      );
  } else {
    // upcoming
    action = event.track_attendance
      ? <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", background: "#eef2ff", padding: "4px 10px", borderRadius: 20, flexShrink: 0 }}>Code Required</span>
      : <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", background: "#eef2ff", padding: "4px 10px", borderRadius: 20, flexShrink: 0 }}>Upcoming</span>;
  }

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 18px",
        borderBottom: "1px solid #f1f5f9",
        background: attended ? "#fafffe" : state === "ongoing" ? "#f0fdf430" : "#fff",
        transition: "background 0.15s ease",
        flexWrap: "wrap",
      }}
    >
      {/* Date badge */}
      <div style={{ width: 44, flexShrink: 0, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: state === "upcoming" ? "#6366f1" : state === "ongoing" ? "#22c55e" : "#0f172a", lineHeight: 1 }}>
          {new Date(event.date + "T00:00:00").getDate()}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>
          {new Date(event.date + "T00:00:00").toLocaleString("en-US", { month: "short" })}
        </div>
      </div>

      {/* Vertical divider */}
      <div style={{ width: 2, height: 36, background: state === "ongoing" ? "#22c55e" : color, borderRadius: 2, flexShrink: 0, opacity: 0.6 }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{event.title}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {event.time && <span>{event.time}{event.end_time ? ` – ${event.end_time}` : ""}</span>}
          {event.location && <><span>·</span><span>{event.location}</span></>}
        </div>
      </div>

      {/* Type badge */}
      <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}12`, color, flexShrink: 0 }}>
        {event.type}
      </span>

      {stateChip}
      {action}
    </div>
  );
}

// ────────────────────────────────────────────
// Check-In countdown hook
// ────────────────────────────────────────────
function useCountdown(expiresAt) {
  const [ms, setMs] = useState(Math.max(0, (expiresAt || 0) - Date.now()));
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setMs(Math.max(0, expiresAt - Date.now())), 500);
    return () => clearInterval(t);
  }, [expiresAt]);
  return ms;
}

// ────────────────────────────────────────────
// Check-In Modal (member enters a code)
// ────────────────────────────────────────────
function CheckInModal({ prefillCode, user, orgId, onClose, onSuccess }) {
  const [code, setCode] = useState(prefillCode || "");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const session = await getSessionByCode(code);
    if (!session) {
      setError("Invalid or expired code. Ask your officer for the current code.");
      return;
    }
    if (session.org_id !== orgId) {
      setError("This code is for a different organization.");
      return;
    }
    const result = await recordCheckIn({
      sessionId: session.id,
      eventId: session.event_id,
      orgId: session.org_id,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
    });
    if (!result.success) { setError(result.error); return; }
    onSuccess(session.event_title);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "36px 32px", width: 380, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>Event Check-In</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 0 }}>Enter the 6-digit code shown by your officer.</p>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20, padding: "2px 6px", lineHeight: 1 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Check-In Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
              maxLength={6}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: `2px solid ${focused ? "#22c55e" : "#e2e8f0"}`, fontSize: 32, fontWeight: 900, letterSpacing: "0.3em", background: "#f8fafc", color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "monospace", textAlign: "center", transition: "border-color 0.15s ease" }}
            />
          </div>
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={code.length !== 6}
            style={{ width: "100%", padding: "13px", borderRadius: 8, border: "none", background: code.length === 6 ? "#22c55e" : "#e2e8f0", color: code.length === 6 ? "#fff" : "#94a3b8", fontSize: 15, fontWeight: 700, cursor: code.length === 6 ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s ease" }}
          >
            Check In
          </button>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Active session banner for member dashboard
// ────────────────────────────────────────────
function ActiveSessionBanner({ session, user, orgId, onCheckedIn }) {
  const expiresAtMs = session.expires_at ? new Date(session.expires_at).getTime() : 0;
  const ms = useCountdown(expiresAtMs);
  const [showModal, setShowModal] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    hasCheckedIn(session.event_id, user.id).then(setCheckedIn);
  }, [session.event_id, user.id]);

  if (ms === 0 && !checkedIn) return null; // expired and not checked in — hide

  const urgentColor = ms < 60_000 ? "#ef4444" : ms < 3 * 60_000 ? "#f59e0b" : "#22c55e";

  return (
    <>
      <div
        style={{
          background: checkedIn ? "#f0fdf4" : "#fff",
          border: `2px solid ${checkedIn ? "#bbf7d0" : "#22c55e"}`,
          borderRadius: 14, padding: "16px 20px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 14,
        }}
      >
        {/* Pulse dot */}
        {!checkedIn && (
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0, boxShadow: "0 0 0 4px rgba(34,197,94,0.2)", animation: "pulse 2s infinite" }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
            {checkedIn ? `✓ Checked in to ${session.event_title}` : `Check-In Open: ${session.event_title}`}
          </div>
          {!checkedIn && (
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Closes in <span style={{ fontWeight: 700, color: urgentColor }}>{formatCountdown(ms)}</span>
            </div>
          )}
        </div>
        {!checkedIn && (
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Check In Now
          </button>
        )}
      </div>

      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 4px rgba(34,197,94,0.2)}50%{box-shadow:0 0 0 8px rgba(34,197,94,0.05)}}`}</style>

      {showModal && (
        <CheckInModal
          user={user}
          orgId={orgId}
          onClose={() => setShowModal(false)}
          onSuccess={(eventTitle) => {
            setCheckedIn(true);
            setShowModal(false);
            onCheckedIn(session.event_id);
          }}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────
// Main Dashboard
// ────────────────────────────────────────────
function MemberDashboard({ orgEntry, user }) {
  const { getEventsForOrg, addAttendee } = useEvents();
  const { getRequirementsForOrg, computeProgress } = useRequirements();
  const [orgEvents, setOrgEvents] = useState([]);
  const [orgRequirements, setOrgRequirements] = useState([]);
  const [orgNotes, setOrgNotes] = useState([]);
  // attended: set of eventIds this user attended for this org
  const [attended, setAttended] = useState(new Set());
  const [showAll, setShowAll] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);

  // Load events, requirements, and attendance from Supabase
  useEffect(() => {
    getEventsForOrg(orgEntry.orgId).then(setOrgEvents);
    getRequirementsForOrg(orgEntry.orgId).then(setOrgRequirements);
    supabase
      .from("notes")
      .select("*")
      .eq("org_id", orgEntry.orgId)
      .neq("category", "Handoff")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrgNotes(data || []));

    // Load this user's attendance records for this org
    supabase
      .from("attendance_records")
      .select("event_id")
      .eq("org_id", orgEntry.orgId)
      .eq("user_id", user.id)
      .then(({ data }) => {
        setAttended(new Set((data || []).map((r) => r.event_id)));
      });
  }, [orgEntry.orgId, user.id]);

  // Realtime: keep events in sync when exec adds/edits/deletes
  useEffect(() => {
    const channel = supabase
      .channel(`member_events_${orgEntry.orgId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "events",
        filter: `org_id=eq.${orgEntry.orgId}`,
      }, (payload) => {
        setOrgEvents((prev) => {
          if (prev.find((e) => e.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "events",
        filter: `org_id=eq.${orgEntry.orgId}`,
      }, (payload) => {
        setOrgEvents((prev) => prev.map((e) => e.id === payload.new.id ? payload.new : e));
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "events",
        filter: `org_id=eq.${orgEntry.orgId}`,
      }, (payload) => {
        setOrgEvents((prev) => prev.filter((e) => e.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgEntry.orgId]);

  // Refresh active sessions every 10s
  useEffect(() => {
    const refresh = () => getActiveSessionsForOrg(orgEntry.orgId).then(setActiveSessions);
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [orgEntry.orgId]);

  async function handleQrCheckIn(eventId) {
    await addAttendee(eventId, user.id, orgEntry.orgId, "session");
    setAttended((prev) => new Set([...prev, eventId]));
  }

  async function handleCodeCheckIn(eventId, late = false) {
    // Check for duplicate first
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return;

    const { error } = await supabase.from("attendance_records").insert({
      event_id: eventId,
      org_id: orgEntry.orgId,
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      source: late ? "late" : "code",
    });
    if (!error) {
      setAttended((prev) => new Set([...prev, eventId]));
    }
  }

  function toggleSelfAttendance(eventId, late = false) {
    const isAttended = attended.has(eventId);
    if (isAttended) {
      supabase.from("attendance_records")
        .delete().eq("event_id", eventId).eq("user_id", user.id);
      setAttended((prev) => { const s = new Set(prev); s.delete(eventId); return s; });
    } else {
      supabase.from("attendance_records").insert({
        event_id: eventId,
        org_id: orgEntry.orgId,
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        source: late ? "late" : "code",
      });
      setAttended((prev) => new Set([...prev, eventId]));
    }
  }

  const allEvents = [...orgEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
  const pastEvents    = allEvents.filter((e) => getEventState(e) === "past");
  const ongoingEvents = allEvents.filter((e) => getEventState(e) === "ongoing");
  const upcomingEvents = allEvents.filter((e) => getEventState(e) === "upcoming");

  const attendedCount = pastEvents.filter((e) => attended.has(e.id)).length;
  const totalPast = pastEvents.length;
  const pct = totalPast > 0 ? Math.round((attendedCount / totalPast) * 100) : 0;

  // Events to show in list: upcoming first, then past (paginated)
  const PAST_PAGE = 3;
  const visiblePast = showAll ? pastEvents : pastEvents.slice(-PAST_PAGE);

  return (
    <div>
      {/* ── Org context line ── */}
      <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 24 }}>
        Viewing: {orgEntry.orgName}
      </div>

      {/* ── Active check-in session banners ── */}
      {activeSessions.map((s) => (
        <ActiveSessionBanner
          key={s.id}
          session={s}
          user={user}
          orgId={orgEntry.orgId}
          onCheckedIn={handleQrCheckIn}
        />
      ))}

      {/* ── Stat cards ── */}
      {(() => {
        const reqProgress = orgRequirements.length > 0
          ? computeProgress(orgRequirements, attended, allEvents)
          : null;
        const metCount = reqProgress ? reqProgress.filter((r) => r.completed).length : 0;
        const totalReqs = reqProgress ? reqProgress.length : 0;
        const allMet = reqProgress && totalReqs > 0 && metCount === totalReqs;

        return (
          <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
            <StatCard label="Events Attended" value={attendedCount} sub={`out of ${totalPast} past events`} color="#6366f1" />
            <StatCard label="Participation Rate" value={`${pct}%`} sub={pct >= 60 ? "On track" : "Below target"} color={pct >= 60 ? "#16a34a" : "#f97316"} />
            {reqProgress ? (
              <StatCard
                label="Requirements Met"
                value={`${metCount} / ${totalReqs}`}
                sub={allMet ? "All requirements met!" : `${totalReqs - metCount} requirement${totalReqs - metCount !== 1 ? "s" : ""} remaining`}
                color={allMet ? "#16a34a" : "#f97316"}
              />
            ) : (
              <StatCard label="Upcoming Events" value={upcomingEvents.length} sub={upcomingEvents.length === 1 ? "1 event scheduled" : `${upcomingEvents.length} events scheduled`} color="#6366f1" />
            )}
          </div>
        );
      })()}

      {/* ── Requirements Progress (shown when org has requirements) ── */}
      {orgRequirements.length > 0 && (() => {
        const reqProgress = computeProgress(orgRequirements, attended, allEvents);
        return (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Participation Requirements</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {reqProgress.map((req) => {
                const color = reqCategoryColor(req.category);
                const pctVal = Math.min(Math.round((req.count / req.required_count) * 100), 100);
                const daysLeft = req.deadline
                  ? Math.ceil((new Date(req.deadline) - new Date()) / 86400000)
                  : null;
                return (
                  <div key={req.id}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}40`, padding: "2px 8px", borderRadius: 20 }}>
                          {req.category}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{req.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {daysLeft !== null && (
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                            color: daysLeft < 0 ? "#dc2626" : daysLeft <= 7 ? "#d97706" : "#16a34a",
                            background: daysLeft < 0 ? "#fef2f2" : daysLeft <= 7 ? "#fffbeb" : "#f0fdf4",
                            border: `1px solid ${daysLeft < 0 ? "#fecaca" : daysLeft <= 7 ? "#fde68a" : "#bbf7d0"}`,
                          }}>
                            {daysLeft < 0 ? "Overdue" : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                          </span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: req.completed ? "#16a34a" : "#64748b" }}>
                          {req.count} / {req.required_count} {req.unit}
                        </span>
                        {req.completed && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 20 }}>
                            ✓ Done
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ height: 7, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4,
                        width: `${pctVal}%`,
                        background: req.completed ? "#22c55e" : color,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Chart + Upcoming ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>


        {/* Upcoming events card */}
        <div style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Upcoming Events</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{upcomingEvents.length} event{upcomingEvents.length !== 1 ? "s" : ""} coming up</div>
          </div>

          {upcomingEvents.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>◈</div>
              <div style={{ fontSize: 13 }}>No upcoming events scheduled yet.</div>
            </div>
          ) : (
            upcomingEvents.map((event) => {
              const color = typeColor(event.type);
              return (
                <div key={event.id} style={{ padding: "14px 20px", borderBottom: "1px solid #f8fafc", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 10, background: `${color}12`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>
                      {new Date(event.date + "T00:00:00").getDate()}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, color, textTransform: "uppercase" }}>
                      {new Date(event.date + "T00:00:00").toLocaleString("en-US", { month: "short" })}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{event.title}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{event.time} · {event.location}</div>
                  </div>
                  {activeSessions.find((s) => s.event_id === event.id) ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "3px 8px", borderRadius: 20, flexShrink: 0, marginTop: 2 }}>
                      ● Check-In Open
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}12`, padding: "3px 8px", borderRadius: 20, flexShrink: 0, marginTop: 2 }}>
                      {event.type}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Ongoing events ── */}
      {ongoingEvents.length > 0 && (
        <div style={{ background: "#fff", border: "2px solid #22c55e", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #dcfce7", background: "#f0fdf4", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0, boxShadow: "0 0 0 3px rgba(34,197,94,0.25)", animation: "pulse 2s infinite" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>Events Happening Now</div>
          </div>
          {ongoingEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              attended={attended.has(event.id)}
              onToggle={toggleSelfAttendance}
              onCodeSuccess={handleCodeCheckIn}
              state="ongoing"
            />
          ))}
          <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.25)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0.08)}}`}</style>
        </div>
      )}

      {/* ── Past events list ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Past Events</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Enter the event code or mark attended to log your participation</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", background: "#eef2ff", padding: "4px 10px", borderRadius: 20 }}>
            {attendedCount} / {totalPast} attended
          </span>
        </div>

        {pastEvents.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No past events yet.</div>
        ) : (
          <>
            {visiblePast.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                attended={attended.has(event.id)}
                onToggle={toggleSelfAttendance}
                onCodeSuccess={handleCodeCheckIn}
                state="past"
              />
            ))}
            {pastEvents.length > PAST_PAGE && (
              <div
                style={{ padding: "12px", textAlign: "center", borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                onClick={() => setShowAll((v) => !v)}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>
                  {showAll ? "Show less" : `Show all ${pastEvents.length} events`}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Org Notes (non-Handoff) ── */}
      {orgNotes.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginTop: 24 }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Organization Notes</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Announcements and updates from your officers</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {orgNotes.map((n, i) => {
              const catColors = { "Event Learning": "#06b6d4", Reminder: "#f59e0b", General: "#6b7280" };
              const color = catColors[n.category] || "#6b7280";
              return (
                <div key={n.id} style={{ padding: "16px 20px", borderBottom: i < orgNotes.length - 2 ? "1px solid #f8fafc" : "none", borderRight: i % 2 === 0 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}12`, border: `1px solid ${color}30`, padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {n.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.55, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.content}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {n.author_name && `${n.author_name} · `}{new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Root: MemberView
// ────────────────────────────────────────────
export default function MemberView() {
  const { user, logout } = useAuth();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [activeOrgIdx, setActiveOrgIdx] = useState(0);

  const orgs = user?.orgs ?? [];
  const activeOrg = orgs[activeOrgIdx] ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Top nav ── */}
      <div style={{ background: "#0f172a", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/orgflow_logo.png" alt="OrgFlow" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>OrgFlow</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setShowJoinModal(true)}
            style={{ padding: "6px 13px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#a5b4fc"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            + Join Org
          </button>
          <span style={{ fontSize: 13, color: "#475569" }}>
            <strong style={{ color: "#e2e8f0" }}>{user?.name}</strong>
          </span>
          <button
            onClick={logout}
            style={{ padding: "6px 13px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.color = "#f97316"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            Log Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 32px" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", margin: 0, marginBottom: 4 }}>
            Welcome, {user?.name?.split(" ")[0] ?? "there"}!
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            Track your event attendance and participation across your organizations.
          </p>
        </div>

        {orgs.length === 0 ? (
          // ── Empty state ──
          <div style={{ background: "#fff", border: "2px dashed #e2e8f0", borderRadius: 16, padding: "60px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏛️</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>No organizations yet</div>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24, maxWidth: 340, margin: "0 auto 24px" }}>
              Ask your organization's officers for a member join code to get started.
            </p>
            <button
              onClick={() => setShowJoinModal(true)}
              style={{ padding: "11px 22px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              + Join Your First Organization
            </button>
          </div>
        ) : (
          <>
            {/* ── Org tabs (if multiple) ── */}
            {orgs.length > 1 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "#f1f5f9", padding: 4, borderRadius: 10, width: "fit-content" }}>
                {orgs.map((org, idx) => (
                  <button
                    key={org.orgId}
                    onClick={() => setActiveOrgIdx(idx)}
                    style={{
                      padding: "8px 16px", borderRadius: 7, border: "none",
                      fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: activeOrgIdx === idx ? "#fff" : "transparent",
                      color: activeOrgIdx === idx ? "#0f172a" : "#94a3b8",
                      boxShadow: activeOrgIdx === idx ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {org.orgName}
                  </button>
                ))}
              </div>
            )}

            {/* ── Dashboard for active org ── */}
            {activeOrg && <MemberDashboard orgEntry={activeOrg} user={user} />}
          </>
        )}
      </div>

      {showJoinModal && <JoinOrgModal onClose={() => setShowJoinModal(false)} />}
    </div>
  );
}
