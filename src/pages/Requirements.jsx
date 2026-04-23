import { useState } from "react";
import { useRequirements } from "../context/RequirementsContext";
import { useEvents } from "../context/EventsContext";
import { useMembers } from "../context/MembersContext";
import { Card, Button, Modal, FormField, Input } from "../components/UI";

const CATEGORY_SUGGESTIONS = [
  "Social", "Professional", "Academic", "Community Service", "Leadership", "General",
];

const PRESET_COLORS = {
  Social:             "#f97316",
  Professional:       "#6366f1",
  Academic:           "#0ea5e9",
  "Community Service":"#22c55e",
  Leadership:         "#ec4899",
  General:            "#64748b",
};
const FALLBACK_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

function categoryColor(cat) {
  if (PRESET_COLORS[cat]) return PRESET_COLORS[cat];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = ((h << 5) - h) + cat.charCodeAt(i);
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length];
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + "T00:00:00") - new Date()) / 86_400_000);
}

function DeadlineChip({ deadline }) {
  const d = daysUntil(deadline);
  if (d === null) return <span style={{ fontSize: 11, color: "#94a3b8" }}>No deadline</span>;
  const color = d < 0 ? "#ef4444" : d < 14 ? "#f59e0b" : "#22c55e";
  const label = d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : `${d}d left`;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}14`, padding: "2px 9px", borderRadius: 20 }}>
      {label}
    </span>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────────
function RequirementModal({ initial, onSave, onClose }) {
  const [name, setName]     = useState(initial?.name ?? "");
  const [category, setCat]  = useState(initial?.category ?? "");
  const [unit, setUnit]     = useState(initial?.unit ?? "events");
  const [count, setCount]   = useState(String(initial?.required_count ?? 3));
  const [deadline, setDl]   = useState(initial?.deadline ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !count) {
      setError("Please fill in Name, Category, and Required count."); return;
    }
    setSaving(true);
    const result = await onSave({
      name: name.trim(),
      category: category.trim(),
      unit,
      required_count: Math.max(1, parseInt(count) || 1),
      deadline: deadline || null,
    });
    setSaving(false);
    if (result?.success === false) { setError(result.error); return; }
    onClose();
  }

  const sharedInputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1px solid var(--border, #e2e8f0)", fontSize: 14,
    background: "var(--bg-primary, #f8fafc)", color: "var(--text-primary, #0f172a)",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <Modal open onClose={onClose} title={initial ? "Edit Requirement" : "Add Requirement"}>
      <form onSubmit={handleSubmit}>
        <FormField label="Requirement Name">
          <Input value={name} onChange={setName} placeholder="e.g. Professional Development" />
        </FormField>

        <FormField label="Category">
          <input
            list="req-cat-list"
            value={category}
            onChange={(e) => setCat(e.target.value)}
            placeholder="e.g. Social, Professional, Academic"
            style={sharedInputStyle}
          />
          <datalist id="req-cat-list">
            {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
          </datalist>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>
            Events tagged with this category will count toward this requirement.
          </p>
        </FormField>

        <FormField label="Track By">
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ key: "events", label: "# of Events" }, { key: "points", label: "Points" }].map(({ key, label }) => (
              <button
                key={key} type="button" onClick={() => setUnit(key)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 6, border: "none",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: unit === key ? "#fff" : "transparent",
                  color: unit === key ? "#0f172a" : "#94a3b8",
                  boxShadow: unit === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>
            {unit === "points"
              ? "Each event has a point value (set when creating events). Points are summed."
              : "Each attended event counts as 1 toward the requirement."}
          </p>
        </FormField>

        <FormField label={unit === "points" ? "Required Points" : "Required Events"}>
          <Input type="number" value={count} onChange={setCount} placeholder="3" />
        </FormField>

        <FormField label="Deadline (optional)">
          <Input type="date" value={deadline} onChange={setDl} />
        </FormField>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "10px 22px", borderRadius: 8, border: "none",
              background: saving ? "#e2e8f0" : "#f97316",
              color: saving ? "#94a3b8" : "#fff",
              fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer",
              fontFamily: "inherit", transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            {saving ? "Saving…" : initial ? "Save Changes" : "Add Requirement"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Per-member progress row ───────────────────────────────────────
function MemberProgressRow({ member, req, events, attendedSet, isLast }) {
  const catEvents = events.filter((e) => e.requirement_category === req.category);
  const attended  = catEvents.filter((e) => attendedSet.has(e.id));
  const count     = req.unit === "points"
    ? attended.reduce((s, e) => s + (e.point_value || 1), 0)
    : attended.length;
  const pct       = Math.min(Math.round((count / req.required_count) * 100), 100);
  const completed = count >= req.required_count;
  const barColor  = completed ? "#22c55e" : categoryColor(req.category);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 20px",
      borderBottom: isLast ? "none" : "1px solid #f8fafc",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: completed ? "#22c55e18" : "#6366f118",
        border: `1.5px solid ${barColor}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: barColor,
      }}>
        {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{member.name}</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {count} / {req.required_count} {req.unit}
          </span>
        </div>
        <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, background: barColor,
            borderRadius: 3, transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {completed ? (
        <span style={{
          fontSize: 11, fontWeight: 700, color: "#22c55e",
          background: "#f0fdf4", padding: "2px 9px", borderRadius: 20, flexShrink: 0,
        }}>
          ✓ Done
        </span>
      ) : (
        <span style={{
          fontSize: 11, color: "#94a3b8", width: 32, textAlign: "right", flexShrink: 0,
        }}>
          {pct}%
        </span>
      )}
    </div>
  );
}

// ── Delete confirm dialog ─────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 600, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", width: 380, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Delete requirement?</h3>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.5 }}>
          This permanently removes the requirement. Member attendance data is not affected.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function Requirements() {
  const { requirements, addRequirement, updateRequirement, deleteRequirement } = useRequirements();
  const { events, attendance } = useEvents();
  const { members } = useMembers();
  const [showAdd, setShowAdd]       = useState(false);
  const [editing, setEditing]       = useState(null);
  const [confirmDelete, setConfirm] = useState(null);
  const [expanded, setExpanded]     = useState({});

  // Build { userId: Set<eventId> } for fast per-member lookup
  const memberAttended = {};
  Object.entries(attendance).forEach(([eventId, attendees]) => {
    attendees.forEach((uid) => {
      if (!memberAttended[uid]) memberAttended[uid] = new Set();
      memberAttended[uid].add(eventId);
    });
  });

  // Only real members (have Supabase user accounts) can have tracked attendance
  const realMembers = members.filter((m) => m.isReal);

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Participation
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary, #0f172a)", margin: 0, letterSpacing: "-0.02em" }}>
            Requirements
          </h1>
          <p style={{ color: "var(--text-muted, #64748b)", marginTop: 4, fontSize: 14, margin: 0 }}>
            Define what members need to do each semester and track their progress.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Requirement</Button>
      </div>

      {/* Empty state */}
      {requirements.length === 0 && (
        <Card style={{ textAlign: "center", padding: "56px 32px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>◈</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
            No requirements defined yet
          </div>
          <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Add requirements to tell members what events to attend. Tag events with a category when creating them so attendance counts automatically.
          </p>
          <Button onClick={() => setShowAdd(true)}>+ Add Your First Requirement</Button>
        </Card>
      )}

      {/* Requirements list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {requirements.map((req) => {
          const color = categoryColor(req.category);
          const isExpanded = !!expanded[req.id];

          // Completion stats across all real members
          const completedMembers = realMembers.filter((m) => {
            const attended = memberAttended[m.id] || new Set();
            const catEvents = events.filter((e) => e.requirement_category === req.category);
            const inCat = catEvents.filter((e) => attended.has(e.id));
            const n = req.unit === "points"
              ? inCat.reduce((s, e) => s + (e.point_value || 1), 0)
              : inCat.length;
            return n >= req.required_count;
          });

          const total = realMembers.length;
          const completedCount = completedMembers.length;
          const completionPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
          const isOverdue = daysUntil(req.deadline) !== null && daysUntil(req.deadline) < 0;
          const barColor = completionPct === 100 ? "#22c55e" : isOverdue ? "#ef4444" : color;

          return (
            <Card key={req.id} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px" }}>
                {/* Top row: badges + actions */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color,
                      background: `${color}14`, padding: "3px 10px",
                      borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      {req.category}
                    </span>
                    <DeadlineChip deadline={req.deadline} />
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => setEditing(req)}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirm(req.id)}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Name + description */}
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 3px", letterSpacing: "-0.01em" }}>
                  {req.name}
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  Requires{" "}
                  <strong style={{ color: "#0f172a" }}>
                    {req.required_count} {req.unit}
                  </strong>
                  {req.deadline && (
                    <> by {new Date(req.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
                  )}
                </p>

                {/* Overall completion bar */}
                {total > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                        Overall completion
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: completionPct === 100 ? "#22c55e" : "#0f172a" }}>
                        {completedCount} / {total} members
                      </span>
                    </div>
                    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${completionPct}%`, background: barColor,
                        borderRadius: 4, transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                )}

                {total === 0 && (
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, marginBottom: 0 }}>
                    No members with accounts yet. Share the member join code to get started.
                  </p>
                )}

                {/* Expand toggle */}
                {total > 0 && (
                  <button
                    onClick={() => toggleExpand(req.id)}
                    style={{ marginTop: 12, padding: 0, border: "none", background: "none", fontSize: 12, fontWeight: 600, color: "#6366f1", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {isExpanded ? "▲ Hide breakdown" : `▼ Show member breakdown`}
                  </button>
                )}
              </div>

              {/* Member breakdown */}
              {isExpanded && total > 0 && (
                <div style={{ borderTop: "1px solid #f1f5f9" }}>
                  {realMembers.map((m, i) => (
                    <MemberProgressRow
                      key={m.id}
                      member={m}
                      req={req}
                      events={events}
                      attendedSet={memberAttended[m.id] || new Set()}
                      isLast={i === realMembers.length - 1}
                    />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {showAdd && (
        <RequirementModal onSave={addRequirement} onClose={() => setShowAdd(false)} />
      )}
      {editing && (
        <RequirementModal
          initial={editing}
          onSave={(fields) => updateRequirement(editing.id, fields)}
          onClose={() => setEditing(null)}
        />
      )}
      {confirmDelete && (
        <DeleteConfirm
          onConfirm={() => { deleteRequirement(confirmDelete); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
