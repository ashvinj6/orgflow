import { useState } from "react";
import { useMembers } from "../context/MembersContext";
import { useEvents } from "../context/EventsContext";
import { Card, SearchInput, Badge, Modal, Button, FormField, Input, Select } from "../components/UI";
import { getEngagementLevel, getEngagementColor } from "../data/mockData";

const ROLES = ["Member", "President", "Vice President", "Treasurer", "Secretary", "Events Director", "Marketing Director", "Other Officer"];
const COMMITTEES = ["Executive", "Tech", "Events", "Outreach", "Finance", "Academics", "General"];

// Count events attended by a member (attendance map covers all sources)
function getMemberAttendedEvents(memberId, attendance) {
  return Object.values(attendance).filter((attendees) => attendees.includes(memberId)).length;
}

export default function Members() {
  const { members, addMember, deleteMember } = useMembers();
  const { events, attendance } = useEvents();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", role: "Member", committee: "", major: "", email: "" });
  const [otherRole, setOtherRole] = useState("");

  const pastEvents = events.filter((e) => new Date(e.date) <= new Date());

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = m.name.toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q) || (m.role || "").toLowerCase().includes(q);
    const matchRole = filterRole === "All" || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleAdd = () => {
    if (!newMember.name.trim()) return;
    const roleToSave = newMember.role === "Other Officer" && otherRole.trim() ? otherRole.trim() : newMember.role;
    addMember({ ...newMember, role: roleToSave });
    setNewMember({ name: "", role: "Member", committee: "", major: "", email: "" });
    setOtherRole("");
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text-primary, #0f172a)", letterSpacing: "-0.02em" }}>Members</h1>
          <p style={{ color: "var(--text-muted, #64748b)", marginTop: 4, fontSize: 14 }}>{members.length} total members</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Member</Button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)", fontSize: 14, background: "var(--bg-card, #fff)", color: "var(--text-primary, #0f172a)" }}
        >
          <option value="All">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {members.length === 0 ? (
          <div style={{ padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary, #0f172a)", marginBottom: 6 }}>No members yet</div>
            <p style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", maxWidth: 320, margin: "0 auto 20px" }}>
              Members will appear here once they join using the member join code. You can also add them manually.
            </p>
            <Button onClick={() => setShowAdd(true)}>+ Add Member Manually</Button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #e2e8f0)" }}>
                {["Name", "Role", "Committee", "Joined", "Attendance", "Engagement"].map((h) => (
                  <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted, #64748b)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {h}
                  </th>
                ))}
                <th style={{ padding: "14px 16px", width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const count = getMemberAttendedEvents(m.id, attendance);
                const level = getEngagementLevel(count, pastEvents.length);
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--border, #f1f5f9)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.isManual ? "#94a3b8" : "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary, #0f172a)", display: "flex", alignItems: "center", gap: 6 }}>
                            {m.name}
                            {m.isManual && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", background: "#f1f5f9", padding: "1px 6px", borderRadius: 10 }}>manual</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>{m.email || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary, #334155)" }}>{m.role || ""}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted, #64748b)" }}>{m.committee || ""}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted, #94a3b8)", fontSize: 13 }}>
                      {m.joinDate ? new Date(m.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>
                      {count}/{pastEvents.length}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge label={level} color={getEngagementColor(level)} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {m.isManual && (
                        <button onClick={() => deleteMember(m.id)} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }} title="Remove">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && members.length > 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted, #94a3b8)" }}>No members match your search.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Add Member Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Member Manually">
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 16 }}>
          Add someone who hasn't signed up yet. They'll show up in attendance tracking and reports.
        </p>
        <FormField label="Full Name"><Input value={newMember.name} onChange={(v) => setNewMember({ ...newMember, name: v })} placeholder="Jane Doe" /></FormField>
        <FormField label="Email"><Input value={newMember.email} onChange={(v) => setNewMember({ ...newMember, email: v })} placeholder="jane@university.edu" /></FormField>
        <FormField label="Role">
          <Select value={newMember.role} onChange={(v) => { setNewMember({ ...newMember, role: v }); setOtherRole(""); }} options={ROLES.map((r) => ({ value: r, label: r }))} />
          {newMember.role === "Other Officer" && (
            <Input value={otherRole} onChange={setOtherRole} placeholder="Specify role title..." style={{ marginTop: 8 }} />
          )}
        </FormField>
        <FormField label="Committee (optional)"><Select value={newMember.committee} onChange={(v) => setNewMember({ ...newMember, committee: v })} options={[{ value: "", label: "None" }, ...COMMITTEES.map((c) => ({ value: c, label: c }))]} /></FormField>
        <FormField label="Major (optional)"><Input value={newMember.major} onChange={(v) => setNewMember({ ...newMember, major: v })} placeholder="Computer Science" /></FormField>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Add Member</Button>
        </div>
      </Modal>
    </div>
  );
}
