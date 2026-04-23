import { useState } from "react";
import { useEvents } from "../context/EventsContext";
import { useRequirements } from "../context/RequirementsContext";
import { Card, Button, Modal, FormField, Input, Select, Textarea, Badge } from "../components/UI";
import { getEventState } from "../utils/eventState";

const EVENT_TYPES = ["General Meeting", "Workshop", "Speaker Event", "Social", "Fundraiser", "Other"];

// ── Shared date helper (avoids UTC-shift bug) ──
function parseLocalDate(dateStr) {
  return new Date(dateStr + "T00:00:00");
}

function formatDisplayDate(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

const TIMEZONES = [
  { value: "PT", label: "Pacific (PT)" },
  { value: "MT", label: "Mountain (MT)" },
  { value: "CT", label: "Central (CT)" },
  { value: "ET", label: "Eastern (ET)" },
];

// Split "6:00 PM PT" into { timeStr: "6:00 PM", tz: "PT" }
function splitTimeValue(val) {
  if (!val) return { timeStr: "6:00 PM", tz: "PT" };
  const m = val.match(/^(.*?)\s+(PT|MT|CT|ET)$/i);
  if (m) return { timeStr: m[1].trim(), tz: m[2].toUpperCase() };
  return { timeStr: val.trim(), tz: "PT" };
}

// Parse "6:00 PM" or "1:31 PM" into parts
function parseTimeStr(str) {
  const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) return { h: m[1], min: m[2].slice(0, 2).padStart(2, "0"), ap: m[3].toUpperCase(), ok: true };
  return { h: "6", min: "00", ap: "PM", ok: false };
}

// ── Time picker: dropdowns + manual text input + timezone ──
function TimePicker({ value, onChange }) {
  const { timeStr: initTime, tz: initTz } = splitTimeValue(value);
  const initParsed = parseTimeStr(initTime);

  const [text, setText] = useState(initTime);
  const [h, setH] = useState(initParsed.h);
  const [min, setMin] = useState(initParsed.min);
  const [ap, setAp] = useState(initParsed.ap);
  const [tz, setTz] = useState(initTz);

  function emit(newH, newMin, newAp, newTz) {
    const timeStr = `${newH}:${newMin} ${newAp}`;
    setText(timeStr);
    onChange(`${timeStr} ${newTz}`);
  }

  function handleH(v)  { setH(v);   emit(v,   min, ap,  tz); }
  function handleMin(v){ setMin(v);  emit(h,   v,   ap,  tz); }
  function handleAp(v) { setAp(v);  emit(h,   min, v,   tz); }
  function handleTz(v) { setTz(v);  emit(h,   min, ap,  v);  }

  function handleTextChange(val) {
    setText(val);
    const p = parseTimeStr(val);
    if (p.ok) {
      setH(p.h); setMin(p.min); setAp(p.ap);
      onChange(`${val} ${tz}`);
    }
  }

  function handleTextBlur() {
    const p = parseTimeStr(text);
    if (p.ok) {
      const normalized = `${p.h}:${p.min} ${p.ap}`;
      setText(normalized);
      setH(p.h); setMin(p.min); setAp(p.ap);
      onChange(`${normalized} ${tz}`);
    }
  }

  const selStyle = {
    padding: "9px 8px", borderRadius: 8,
    border: "1px solid var(--border, #e2e8f0)", fontSize: 13,
    background: "var(--bg-primary, #f8fafc)", color: "var(--text-primary, #0f172a)",
    outline: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Manual text input */}
      <input
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleTextBlur}
        placeholder="e.g. 1:31 PM"
        style={{
          padding: "9px 12px", borderRadius: 8, width: "100%", boxSizing: "border-box",
          border: "1px solid var(--border, #e2e8f0)", fontSize: 14, fontWeight: 600,
          background: "var(--bg-primary, #f8fafc)", color: "var(--text-primary, #0f172a)",
          outline: "none", fontFamily: "monospace", letterSpacing: "0.05em",
        }}
      />
      {/* Dropdowns row */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <select value={h} onChange={(e) => handleH(e.target.value)} style={{ ...selStyle, width: 60 }}>
          {["1","2","3","4","5","6","7","8","9","10","11","12"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <span style={{ color: "#94a3b8", fontWeight: 800 }}>:</span>
        <select value={min} onChange={(e) => handleMin(e.target.value)} style={{ ...selStyle, width: 62 }}>
          {["00","15","30","45"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select value={ap} onChange={(e) => handleAp(e.target.value)} style={{ ...selStyle, width: 66 }}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
        <select value={tz} onChange={(e) => handleTz(e.target.value)} style={{ ...selStyle, flex: 1, minWidth: 120 }}>
          {TIMEZONES.map((z) => (
            <option key={z.value} value={z.value}>{z.label}</option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>
        Type any time above, or use the dropdowns for quick selection.
      </div>
    </div>
  );
}

function CopyCodeButton({ code }) {
  const [copied, setCopied] = useState(false);
  function handle(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handle}
      title="Copy attendance code"
      style={{
        padding: "3px 10px", borderRadius: 20, border: "1px solid #a5b4fc",
        background: copied ? "#f0fdf4" : "#eef2ff",
        color: copied ? "#16a34a" : "#6366f1",
        fontSize: 11, fontWeight: 700, cursor: "pointer",
        fontFamily: "inherit", letterSpacing: "0.04em",
        transition: "all 0.15s ease",
      }}
    >
      {copied ? "✓ Copied" : `🔑 ${code}`}
    </button>
  );
}

// ── Shared attendance toggle ──
function AttendanceToggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        marginTop: 4,
        padding: "14px 16px",
        borderRadius: 10,
        border: `2px solid ${value ? "#6366f1" : "#e2e8f0"}`,
        background: value ? "#eef2ff" : "#f8fafc",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        transition: "all 0.15s ease",
        userSelect: "none",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: value ? "#4338ca" : "#0f172a" }}>
          Track Attendance
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {value
            ? "A unique code will be generated. Share it with members at the event."
            : "Members will need to enter a code to mark themselves as attended."}
        </div>
      </div>
      <div
        style={{
          width: 44, height: 24, borderRadius: 12, flexShrink: 0,
          background: value ? "#6366f1" : "#cbd5e1",
          position: "relative", transition: "background 0.2s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3, left: value ? 23 : 3,
            width: 18, height: 18, borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Shared event form body ──
function EventFormFields({ form, setForm, typeDropdown, setTypeDropdown, categoryOptions, errors }) {
  function handleTypeChange(val) {
    setTypeDropdown(val);
    if (val !== "Other") setForm((prev) => ({ ...prev, type: val }));
    else setForm((prev) => ({ ...prev, type: "" }));
  }

  return (
    <>
      <FormField label={<>Event Title <span style={{ color: "#ef4444" }}>*</span></>}>
        <Input
          value={form.title}
          onChange={(v) => setForm((p) => ({ ...p, title: v }))}
          placeholder="Monthly General Meeting"
        />
        {errors?.title && (
          <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>Title is required</div>
        )}
      </FormField>

      <FormField label="Event Type">
        <Select value={typeDropdown} onChange={handleTypeChange} options={EVENT_TYPES.map((t) => ({ value: t, label: t }))} />
        {typeDropdown === "Other" && (
          <Input
            value={form.type}
            onChange={(v) => setForm((p) => ({ ...p, type: v }))}
            placeholder="Describe the event type..."
            style={{ marginTop: 8 }}
          />
        )}
      </FormField>

      <FormField label={<>Date <span style={{ color: "#ef4444" }}>*</span></>}>
        <Input
          type="date"
          value={form.date}
          onChange={(v) => setForm((p) => ({ ...p, date: v }))}
        />
        {errors?.date && (
          <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>Date is required</div>
        )}
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Start Time">
          <TimePicker
            value={form.time}
            onChange={(v) => setForm((p) => ({ ...p, time: v }))}
          />
        </FormField>
        <FormField label="End Time">
          <TimePicker
            value={form.endTime}
            onChange={(v) => setForm((p) => ({ ...p, endTime: v }))}
          />
        </FormField>
      </div>

      <FormField label="Location">
        <Input value={form.location} onChange={(v) => setForm((p) => ({ ...p, location: v }))} placeholder="Student Union Room 201" />
      </FormField>

      <FormField label="Description">
        <Textarea value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} placeholder="What's this event about?" />
      </FormField>

      <AttendanceToggle value={form.trackAttendance} onChange={(v) => setForm((p) => ({ ...p, trackAttendance: v }))} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
        <FormField label="Requirement Category">
          <select
            value={form.requirementCategory}
            onChange={(e) => setForm((p) => ({ ...p, requirementCategory: e.target.value }))}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: "1px solid var(--border, #e2e8f0)", fontSize: 14,
              background: "var(--bg-primary, #f8fafc)", color: "var(--text-primary, #0f172a)",
              outline: "none", boxSizing: "border-box", fontFamily: "inherit",
            }}
          >
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Point Value">
          <Input
            type="number"
            value={form.pointValue}
            onChange={(v) => setForm((p) => ({ ...p, pointValue: v }))}
            placeholder="1"
          />
        </FormField>
      </div>
    </>
  );
}

const EMPTY_FORM = {
  title: "", type: "General Meeting", date: "", time: "6:00 PM PT", endTime: "8:00 PM PT",
  location: "", description: "", trackAttendance: false,
  requirementCategory: "", pointValue: "1",
};

function eventToForm(e) {
  return {
    title: e.title || "",
    type: e.type || "General Meeting",
    date: e.date || "",
    time: e.time || "6:00 PM PT",
    endTime: e.end_time || "",
    location: e.location || "",
    description: e.description || "",
    trackAttendance: e.track_attendance || false,
    requirementCategory: e.requirement_category || "",
    pointValue: String(e.point_value ?? "1"),
  };
}

export default function Events() {
  const { events, attendance, addEvent, editEvent, deleteEvent } = useEvents();
  const { requirements } = useRequirements();

  const [showAdd, setShowAdd] = useState(false);
  const [addTypeDropdown, setAddTypeDropdown] = useState("General Meeting");
  const [newEvent, setNewEvent] = useState({ ...EMPTY_FORM });
  const [addErrors, setAddErrors] = useState({});

  const [editingEvent, setEditingEvent] = useState(null);
  const [editTypeDropdown, setEditTypeDropdown] = useState("General Meeting");
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editErrors, setEditErrors] = useState({});

  const [tab, setTab] = useState("upcoming");

  const categoryOptions = [
    { value: "", label: "None (no requirement)" },
    ...requirements
      .map((r) => ({ value: r.category, label: r.category }))
      .filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i),
  ];

  const upcoming = events.filter((e) => getEventState(e) === "upcoming")
    .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
  const ongoing = events.filter((e) => getEventState(e) === "ongoing")
    .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
  const past = events.filter((e) => getEventState(e) === "past")
    .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  const displayed = tab === "upcoming" ? upcoming : tab === "ongoing" ? ongoing : past;

  const typeColors = {
    "General Meeting": "#f97316",
    Workshop: "#f59e0b",
    "Speaker Event": "#06b6d4",
    Social: "#22c55e",
    Fundraiser: "#ec4899",
    Other: "#6b7280",
  };

  // ── Add ──
  const handleAdd = async () => {
    const errs = {};
    if (!newEvent.title.trim()) errs.title = true;
    if (!newEvent.date) errs.date = true;
    if (Object.keys(errs).length) { setAddErrors(errs); return; }

    await addEvent(newEvent);
    setNewEvent({ ...EMPTY_FORM });
    setAddTypeDropdown("General Meeting");
    setAddErrors({});
    setShowAdd(false);
  };

  // ── Edit open ──
  function openEdit(e) {
    setEditingEvent(e);
    setEditForm(eventToForm(e));
    // Set the dropdown to "Other" if the type isn't in the standard list
    const knownType = EVENT_TYPES.slice(0, -1).includes(e.type);
    setEditTypeDropdown(knownType ? e.type : "Other");
    setEditErrors({});
  }

  // ── Edit save ──
  const handleEditSave = async () => {
    const errs = {};
    if (!editForm.title.trim()) errs.title = true;
    if (!editForm.date) errs.date = true;
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    await editEvent(editingEvent.id, editForm);
    setEditingEvent(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text-primary, #0f172a)", letterSpacing: "-0.02em" }}>Events</h1>
          <p style={{ color: "var(--text-muted, #64748b)", marginTop: 4, fontSize: 14 }}>{events.length} total events</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Create Event</Button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--bg-card, #fff)", borderRadius: 10, padding: 4, width: "fit-content", border: "1px solid var(--border, #e2e8f0)" }}>
        {[
          { key: "upcoming", label: `Upcoming (${upcoming.length})`, activeColor: "#6366f1" },
          { key: "ongoing",  label: `Ongoing (${ongoing.length})`,   activeColor: "#22c55e" },
          { key: "past",     label: `Past (${past.length})`,         activeColor: "#f97316" },
        ].map(({ key, label, activeColor }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 600,
              background: tab === key ? activeColor : "transparent",
              color: tab === key ? "#fff" : "var(--text-muted, #64748b)",
              position: "relative",
            }}
          >
            {label}
            {key === "ongoing" && ongoing.length > 0 && tab !== "ongoing" && (
              <span style={{
                position: "absolute", top: 6, right: 6,
                width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Event Cards */}
      <div style={{ display: "grid", gap: 16 }}>
        {displayed.map((e) => {
          const attendeeCount = (attendance[e.id] || []).length;
          const state = getEventState(e);
          const stateBadge = state === "ongoing"
            ? { label: "● Ongoing", color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" }
            : state === "upcoming"
            ? { label: "Upcoming", color: "#6366f1", bg: "#eef2ff", border: "#a5b4fc" }
            : null;
          return (
            <Card key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: state === "ongoing" ? "3px solid #22c55e" : undefined }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>{e.title}</h3>
                  <Badge label={e.type} color={typeColors[e.type] || "#6b7280"} />
                  {stateBadge && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: stateBadge.color, background: stateBadge.bg, border: `1px solid ${stateBadge.border}`, padding: "2px 8px", borderRadius: 20 }}>
                      {stateBadge.label}
                    </span>
                  )}
                  {e.requirement_category && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", background: "#eef2ff", border: "1px solid #a5b4fc", padding: "2px 8px", borderRadius: 20 }}>
                      ◐ {e.requirement_category}
                    </span>
                  )}
                  {e.track_attendance && e.attendance_code && (
                    <CopyCodeButton code={e.attendance_code} />
                  )}
                  {e.track_attendance && e.attendance_code && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>
                      Share this code with members at the event
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--text-muted, #64748b)" }}>
                  <span>📅 {formatDisplayDate(e.date)}</span>
                  {e.time && <span>🕐 {e.time}{e.end_time ? ` – ${e.end_time}` : ""}</span>}
                  {e.location && <span>📍 {e.location}</span>}
                  <span>👥 {attendeeCount} attended</span>
                </div>
                {e.description && (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted, #94a3b8)", maxWidth: 600 }}>{e.description}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                <button
                  onClick={() => openEdit(e)}
                  style={{
                    border: "1.5px solid #e2e8f0", background: "transparent", color: "#64748b",
                    cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "6px 14px",
                    borderRadius: 8, fontFamily: "inherit", transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.color = "#f97316"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteEvent(e.id)}
                  style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, padding: "8px", flexShrink: 0 }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </Card>
          );
        })}
        {displayed.length === 0 && (
          <Card style={{ textAlign: "center", color: "var(--text-muted, #94a3b8)", padding: 48 }}>
            {tab === "upcoming" ? "No upcoming events. Create one!" : "No past events yet."}
          </Card>
        )}
      </div>

      {/* Create Event Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddErrors({}); }} title="Create Event">
        <EventFormFields
          form={newEvent}
          setForm={setNewEvent}
          typeDropdown={addTypeDropdown}
          setTypeDropdown={setAddTypeDropdown}
          categoryOptions={categoryOptions}
          errors={addErrors}
        />
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Button variant="secondary" onClick={() => { setShowAdd(false); setAddErrors({}); }}>Cancel</Button>
          <Button onClick={handleAdd}>Create Event</Button>
        </div>
      </Modal>

      {/* Edit Event Modal */}
      <Modal open={!!editingEvent} onClose={() => setEditingEvent(null)} title="Edit Event">
        {editingEvent && (
          <>
            <EventFormFields
              key={editingEvent.id}
              form={editForm}
              setForm={setEditForm}
              typeDropdown={editTypeDropdown}
              setTypeDropdown={setEditTypeDropdown}
              categoryOptions={categoryOptions}
              errors={editErrors}
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <Button variant="secondary" onClick={() => setEditingEvent(null)}>Cancel</Button>
              <Button onClick={handleEditSave}>Save Changes</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
