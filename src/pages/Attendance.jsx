import { useState, useEffect, useCallback } from "react";
import { useMembers } from "../context/MembersContext";
import { useEvents } from "../context/EventsContext";
import { useAuth } from "../context/AuthContext";
import { Card, SearchInput } from "../components/UI";
import {
  createSession, getActiveSessionForEvent, endSession,
  refreshSession, getEventCheckIns, formatCountdown,
} from "../utils/checkin";
import { supabase } from "../lib/supabase";

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
function isUpcomingOrToday(dateStr) { return new Date(dateStr) >= TODAY; }

const DURATIONS = [
  { label: "5 min",  value: 5  },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "60 min", value: 60 },
];

// ── Countdown hook ──
function useCountdown(expiresAt) {
  const [ms, setMs] = useState(Math.max(0, expiresAt - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setMs(Math.max(0, expiresAt - Date.now())), 500);
    return () => clearInterval(t);
  }, [expiresAt]);
  return ms;
}

// ── QR code image using api.qrserver.com ──
function QRCode({ code, size = 180 }) {
  const data = encodeURIComponent(`OrgFlow Check-In Code: ${code}`);
  const src  = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}&margin=10`;
  return (
    <img
      src={src}
      alt={`QR code for check-in code ${code}`}
      width={size}
      height={size}
      style={{ borderRadius: 12, border: "1px solid #e2e8f0", display: "block" }}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}

// ── Active session panel ──
function ActiveSessionPanel({ session, orgId, onEnd, onRefresh }) {
  const expiresAtMs = session.expires_at ? new Date(session.expires_at).getTime() : 0;
  const ms = useCountdown(expiresAtMs);
  const [duration, setDuration] = useState(15);
  const [copied, setCopied] = useState(false);
  const [checkIns, setCheckIns] = useState([]);

  // Load initial check-ins and subscribe for live updates
  useEffect(() => {
    getEventCheckIns(session.event_id).then(setCheckIns);

    const channel = supabase
      .channel(`session_checkins_${session.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "attendance_records",
        filter: `event_id=eq.${session.event_id}`,
      }, (payload) => {
        if (payload.new.source === "manual") return;
        setCheckIns((prev) => {
          if (prev.find((r) => r.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "attendance_records",
        filter: `event_id=eq.${session.event_id}`,
      }, (payload) => {
        setCheckIns((prev) => prev.filter((r) => r.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session.id, session.event_id]);

  const expired = ms === 0;
  const urgentColor = ms < 60_000 ? "#ef4444" : ms < 5 * 60_000 ? "#f59e0b" : "#22c55e";

  function copyCode() {
    navigator.clipboard.writeText(session.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleRefresh() {
    const updated = await refreshSession(session.id, duration);
    if (updated) onRefresh(updated);
    getEventCheckIns(session.event_id).then(setCheckIns);
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Session header */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!expired && (
            <span
              style={{
                width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
                display: "inline-block",
                boxShadow: "0 0 0 3px rgba(34,197,94,0.25)",
                animation: "pulse 2s infinite",
              }}
            />
          )}
          <span style={{ fontSize: 14, fontWeight: 700, color: expired ? "#94a3b8" : "#0f172a" }}>
            {expired ? "Session Expired" : "Check-In Active"}
          </span>
          {!expired && (
            <span
              style={{
                fontSize: 13, fontWeight: 800, color: urgentColor,
                background: `${urgentColor}12`, padding: "2px 10px", borderRadius: 20,
                minWidth: 60, textAlign: "center",
              }}
            >
              {formatCountdown(ms)}
            </span>
          )}
        </div>
        <button
          onClick={onEnd}
          style={{
            padding: "6px 14px", borderRadius: 7, border: "1.5px solid #fecaca",
            background: "#fff5f5", color: "#dc2626", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          End Session
        </button>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {/* Code + QR card */}
        <div
          style={{
            flex: 1, background: "#fff", border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 16, padding: "28px 28px",
            display: "flex", gap: 28, alignItems: "center",
            opacity: expired ? 0.5 : 1,
          }}
        >
          {/* QR */}
          <div style={{ flexShrink: 0 }}>
            <QRCode code={session.code} size={170} />
          </div>

          {/* Code + controls */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Check-In Code
            </div>
            <div
              style={{
                fontSize: 52, fontWeight: 900, letterSpacing: "0.18em",
                color: expired ? "#94a3b8" : "#0f172a", fontFamily: "monospace",
                lineHeight: 1, marginBottom: 12,
              }}
            >
              {session.code}
            </div>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18, lineHeight: 1.5 }}>
              Display this code or the QR on a screen. Members enter it on their dashboard to check in.
            </p>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={copyCode}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  border: "1.5px solid var(--border, #e2e8f0)",
                  background: copied ? "#f0fdf4" : "transparent",
                  color: copied ? "#16a34a" : "#64748b",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {copied ? "✓ Copied" : "Copy Code"}
              </button>

              {/* Regenerate with duration picker */}
              <div style={{ display: "flex", gap: 0, border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  style={{
                    padding: "7px 10px", border: "none", background: "#f8fafc",
                    fontSize: 12, color: "#64748b", cursor: "pointer",
                    outline: "none", fontFamily: "inherit",
                  }}
                >
                  {DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleRefresh}
                  style={{
                    padding: "7px 12px", border: "none", borderLeft: "1.5px solid #e2e8f0",
                    background: "#f8fafc", color: "#f97316",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live check-ins */}
        <div
          style={{
            width: 280, flexShrink: 0, background: "#fff",
            border: "1px solid var(--border, #e2e8f0)", borderRadius: 16,
            overflow: "hidden", display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Checked In</div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#22c55e" }}>{checkIns.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 240 }}>
            {checkIns.length === 0 ? (
              <div style={{ padding: "24px 18px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                Waiting for members to check in…
              </div>
            ) : (
              checkIns.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 16px",
                    borderBottom: i < checkIns.length - 1 ? "1px solid #f8fafc" : "none",
                    animation: "fadeIn 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "#22c55e20", border: "1.5px solid #22c55e50",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "#16a34a", flexShrink: 0,
                    }}
                  >
                    {(r.user_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.user_name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {new Date(r.checked_in_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  <span style={{ fontSize: 16 }}>✓</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.25)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0.1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ── Static code panel (for events with track_attendance: true) ──
function StaticCodePanel({ event }) {
  const [copied, setCopied] = useState(false);
  const [checkIns, setCheckIns] = useState([]);

  useEffect(() => {
    getEventCheckIns(event.id).then(setCheckIns);

    const channel = supabase
      .channel(`static_checkins_${event.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "attendance_records",
        filter: `event_id=eq.${event.id}`,
      }, (payload) => {
        if (payload.new.source === "manual") return;
        setCheckIns((prev) => {
          if (prev.find((r) => r.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "attendance_records",
        filter: `event_id=eq.${event.id}`,
      }, (payload) => {
        setCheckIns((prev) => prev.filter((r) => r.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.id]);

  function copyCode() {
    navigator.clipboard.writeText(event.attendance_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
      {/* Code display card */}
      <div
        style={{
          flex: 1, background: "#fff", border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 16, padding: "28px 32px",
          display: "flex", gap: 28, alignItems: "center",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Attendance Code
          </div>
          <div
            style={{
              fontSize: 52, fontWeight: 900, letterSpacing: "0.18em",
              color: "#6366f1", fontFamily: "monospace",
              lineHeight: 1, marginBottom: 12,
            }}
          >
            {event.attendance_code}
          </div>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18, lineHeight: 1.5 }}>
            Display this code at the event. Members enter it on their dashboard to record attendance.
          </p>
          <button
            onClick={copyCode}
            style={{
              padding: "8px 18px", borderRadius: 8,
              border: "1.5px solid var(--border, #e2e8f0)",
              background: copied ? "#f0fdf4" : "transparent",
              color: copied ? "#16a34a" : "#64748b",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s ease",
            }}
          >
            {copied ? "✓ Copied" : "Copy Code"}
          </button>
        </div>
      </div>

      {/* Live check-ins roster */}
      <div
        style={{
          width: 280, flexShrink: 0, background: "#fff",
          border: "1px solid var(--border, #e2e8f0)", borderRadius: 16,
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Checked In</div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#6366f1" }}>{checkIns.length}</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", maxHeight: 240 }}>
          {checkIns.length === 0 ? (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              Waiting for members to check in…
            </div>
          ) : (
            checkIns.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 16px",
                  borderBottom: i < checkIns.length - 1 ? "1px solid #f8fafc" : "none",
                }}
              >
                <div
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "#6366f120", border: "1.5px solid #6366f150",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#6366f1", flexShrink: 0,
                  }}
                >
                  {(r.user_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.user_name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {new Date(r.checked_in_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <span style={{ fontSize: 14, color: "#6366f1" }}>✓</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Start session form ──
function StartSessionForm({ event, orgId, onStart }) {
  const [duration, setDuration] = useState(15);
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setStarting(true);
    const session = await createSession({
      eventId: event.id,
      eventTitle: event.title,
      orgId,
      durationMinutes: duration,
    });
    setStarting(false);
    if (session) onStart(session);
  }

  return (
    <div
      style={{
        background: "#fff", border: "2px dashed #e2e8f0",
        borderRadius: 16, padding: "28px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, gap: 20,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
          Start a Check-In Session
        </div>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          Generate a time-sensitive code + QR that members use to check in from their phones.
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Duration</div>
        <div style={{ display: "flex", border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              style={{
                padding: "8px 12px", border: "none",
                borderRight: d.value !== 60 ? "1px solid #e2e8f0" : "none",
                background: duration === d.value ? "#fff7ed" : "#f8fafc",
                color: duration === d.value ? "#f97316" : "#64748b",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.12s ease",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleStart}
          disabled={starting}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "#f97316", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: starting ? "default" : "pointer",
            fontFamily: "inherit", whiteSpace: "nowrap",
            opacity: starting ? 0.7 : 1,
          }}
          onMouseEnter={(e) => { if (!starting) e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={(e) => { if (!starting) e.currentTarget.style.opacity = "1"; }}
        >
          {starting ? "Starting…" : "Start Check-In →"}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Main Attendance page
// ────────────────────────────────────────────
export default function Attendance() {
  const { members } = useMembers();
  const { events, attendance, toggleAttendance, getEventAttendees } = useEvents();
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.orgId ?? "demo";

  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || "");
  const [search, setSearch] = useState("");
  const [session, setSession] = useState(null);
  const [qrCheckIns, setQrCheckIns] = useState([]);

  const event = events.find((e) => e.id === selectedEventId);
  const attendees = getEventAttendees(selectedEventId);
  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  // Load active session + check-ins when selected event changes
  useEffect(() => {
    if (!selectedEventId) return;
    getActiveSessionForEvent(orgId, selectedEventId).then(setSession);
    getEventCheckIns(selectedEventId).then(setQrCheckIns);
  }, [selectedEventId, orgId]);

  // Keep qrCheckIns in sync via Realtime
  useEffect(() => {
    if (!selectedEventId) return;
    const channel = supabase
      .channel(`attendance_page_${selectedEventId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "attendance_records",
        filter: `event_id=eq.${selectedEventId}`,
      }, (payload) => {
        if (payload.new.source === "manual") return;
        setQrCheckIns((prev) => {
          if (prev.find((r) => r.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "attendance_records",
        filter: `event_id=eq.${selectedEventId}`,
      }, (payload) => {
        setQrCheckIns((prev) => prev.filter((r) => r.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedEventId]);

  // Reload session when event changes
  async function handleEventChange(eventId) {
    setSelectedEventId(eventId);
    setSession(null);
    setQrCheckIns([]);
  }

  function handleStartSession(newSession) {
    setSession(newSession);
  }

  async function handleEndSession() {
    if (session) await endSession(session.id);
    setSession(null);
  }

  function handleRefreshSession(updated) {
    setSession(updated);
  }

  const isUpcoming = event ? isUpcomingOrToday(event.date) : false;

  return (
    <div style={{ maxWidth: 1040 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Attendance
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text-primary, #0f172a)", letterSpacing: "-0.02em" }}>
          Attendance Tracking
        </h1>
        <p style={{ color: "var(--text-muted, #64748b)", marginTop: 4, fontSize: 14, margin: 0 }}>
          Start check-in sessions for live attendance, or mark manually for past events.
        </p>
      </div>

      {/* Event selector */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={selectedEventId}
          onChange={(e) => handleEventChange(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: 8,
            border: "1px solid var(--border, #e2e8f0)",
            fontSize: 14, background: "var(--bg-card, #fff)",
            color: "var(--text-primary, #0f172a)",
            flex: 1, maxWidth: 420, cursor: "pointer",
          }}
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {isUpcomingOrToday(e.date) ? "▶ " : "✓ "}
              {e.title} ({new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })})
            </option>
          ))}
        </select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search members..." />
      </div>

      {/* Static code panel — always shown for tracked events */}
      {event && event.track_attendance && event.attendance_code && (
        <StaticCodePanel event={event} />
      )}

      {/* Live session panel — optional on top of static code */}
      {isUpcoming && event && (
        session
          ? <ActiveSessionPanel
              session={session}
              orgId={orgId}
              onEnd={handleEndSession}
              onRefresh={handleRefreshSession}
            />
          : !event.track_attendance && (
              <StartSessionForm event={event} orgId={orgId} onStart={handleStartSession} />
            )
      )}

      {/* Event summary */}
      {event && (
        <Card style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>
              {event.title}
            </h3>
            <div style={{ fontSize: 13, color: "var(--text-muted, #64748b)", marginTop: 4 }}>
              {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {" · "}{event.location}
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, flexShrink: 0 }}>
            {qrCheckIns.length > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#6366f1" }}>{qrCheckIns.length}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>code check-ins</div>
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#f97316" }}>{attendees.length}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>manual marks</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{members.length}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>total members</div>
            </div>
          </div>
        </Card>
      )}

      {/* Manual attendance table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>
            Manual Attendance
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>
            {!isUpcoming ? "Event has ended — marks below are exec overrides" : "Click a row to toggle attendance"}
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border, #e2e8f0)" }}>
              <th style={{ padding: "12px 16px", width: 48, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>✓</span>
              </th>
              {["Name", "Role", "Committee"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted, #64748b)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted, #64748b)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Code Check-In</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => {
              const attended = attendees.includes(m.id);
              const qrIn     = qrCheckIns.find((r) => r.user_id === m.id || r.user_name === m.name || (m.email && r.user_email === m.email));
              return (
                <tr
                  key={m.id}
                  onClick={() => toggleAttendance(selectedEventId, m.id)}
                  style={{
                    borderBottom: "1px solid var(--border, #f1f5f9)",
                    cursor: "pointer",
                    background: qrIn ? "rgba(34,197,94,0.04)" : attended ? "rgba(249,115,22,0.04)" : "transparent",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = qrIn ? "rgba(34,197,94,0.04)" : attended ? "rgba(249,115,22,0.04)" : "transparent")}
                >
                  <td style={{ padding: "11px 16px", textAlign: "center" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: attended ? "none" : "2px solid #cbd5e1", background: attended ? "#f97316" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", color: "#fff", fontSize: 13, fontWeight: 700, transition: "all 0.15s ease" }}>
                      {attended && "✓"}
                    </div>
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: attended ? "#f97316" : "#cbd5e1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                        {m.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span style={{ fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 16px", color: "var(--text-primary, #334155)" }}>{m.role}</td>
                  <td style={{ padding: "11px 16px", color: "var(--text-primary, #334155)" }}>{m.committee}</td>
                  <td style={{ padding: "11px 16px" }}>
                    {qrIn ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {qrIn.source === "late" && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", padding: "1px 6px", borderRadius: 20 }}>
                            Late
                          </span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#4338ca", background: "#eef2ff", border: "1px solid #a5b4fc", padding: "2px 8px", borderRadius: 20 }}>
                          ✓ {new Date(qrIn.checked_in_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#cbd5e1" }}>N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
