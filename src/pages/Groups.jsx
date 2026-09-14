import { useState } from "react";
import { useGroups } from "../context/GroupsContext";
import { useMembers } from "../context/MembersContext";
import { Card, SearchInput, Modal, Button, FormField, Input } from "../components/UI";

// ── Create Group Modal ──
function CreateGroupModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) { setError("Please enter a group name."); return; }
    setSaving(true);
    const result = await onSave(name);
    setSaving(false);
    if (result?.success === false) { setError(result.error); return; }
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Create Group">
      <FormField label="Group Name">
        <Input value={name} onChange={setName} placeholder="e.g. Fall 2025" />
      </FormField>
      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>{saving ? "Creating…" : "Create Group"}</Button>
      </div>
    </Modal>
  );
}

// ── Manage Members Modal ──
function ManageMembersModal({ group, allMembers, initialIds, onSave, onClose }) {
  const [selected, setSelected] = useState(new Set(initialIds));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = allMembers.filter((m) => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
  });

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const members = allMembers
      .filter((m) => selected.has(m.id))
      .map((m) => ({ id: m.id, memberType: m.isReal ? "real" : "manual" }));
    const result = await onSave(members);
    setSaving(false);
    if (result?.success === false) { setError(result.error); return; }
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Manage Members — ${group.name}`}>
      <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 14 }}>
        Select who belongs to this group. Requirements scoped to this group will only be visible to members checked here.
      </p>
      <div style={{ marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search members..." />
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border, #e2e8f0)", borderRadius: 8 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No members match your search.</div>
        )}
        {filtered.map((m, i) => (
          <label
            key={m.id}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px",
              borderBottom: i === filtered.length - 1 ? "none" : "1px solid #f1f5f9",
              cursor: "pointer",
            }}
          >
            <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} style={{ width: 16, height: 16, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{m.role}{m.email ? ` · ${m.email}` : ""}</div>
            </div>
            {m.userType === "exec" && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#f97316", background: "#fff7ed", padding: "1px 7px", borderRadius: 10, flexShrink: 0 }}>exec</span>
            )}
          </label>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#94a3b8", margin: "10px 0 0" }}>{selected.size} member{selected.size !== 1 ? "s" : ""} selected</p>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, marginTop: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>{saving ? "Saving…" : "Save Members"}</Button>
      </div>
    </Modal>
  );
}

// ── Delete Confirm ──
function DeleteConfirm({ group, onConfirm, onCancel }) {
  return (
    <Modal open onClose={onCancel} title="Delete Group">
      <p style={{ fontSize: 14, color: "var(--text-primary, #0f172a)", marginTop: 0 }}>
        Are you sure you want to delete <strong>{group.name}</strong>?
      </p>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Any requirement scoped to this group will become visible org-wide instead of being deleted.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Delete</Button>
      </div>
    </Modal>
  );
}

export default function Groups() {
  const { groups, createGroup, deleteGroup, setGroupMembers, getGroupMemberIds } = useGroups();
  const { members } = useMembers();
  const [showCreate, setShowCreate] = useState(false);
  const [managing, setManaging] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text-primary, #0f172a)", letterSpacing: "-0.02em" }}>Groups</h1>
          <p style={{ color: "var(--text-muted, #64748b)", marginTop: 4, fontSize: 14 }}>
            Organize members into groups and scope requirements to just one group.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Create Group</Button>
      </div>

      {groups.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "56px 32px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◇</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary, #0f172a)", marginBottom: 6 }}>No groups yet</div>
          <p style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", maxWidth: 360, margin: "0 auto 20px" }}>
            Create a group like "Fall 2025" or "New Member Class", add members with checkboxes, then scope a requirement to it from the Requirements page.
          </p>
          <Button onClick={() => setShowCreate(true)}>+ Create Your First Group</Button>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {groups.map((g) => {
            const count = getGroupMemberIds(g.id).size;
            return (
              <Card key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary, #0f172a)", margin: 0 }}>{g.name}</h3>
                  <button
                    onClick={() => setConfirmDelete(g)}
                    style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: 15 }}
                    title="Delete group"
                  >
                    ✕
                  </button>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted, #64748b)", margin: "0 0 16px" }}>
                  {count} member{count !== 1 ? "s" : ""}
                </p>
                <Button variant="secondary" onClick={() => setManaging(g)} style={{ width: "100%" }}>
                  Manage Members
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal onSave={createGroup} onClose={() => setShowCreate(false)} />
      )}

      {managing && (
        <ManageMembersModal
          group={managing}
          allMembers={members}
          initialIds={getGroupMemberIds(managing.id)}
          onSave={(memberList) => setGroupMembers(managing.id, memberList)}
          onClose={() => setManaging(null)}
        />
      )}

      {confirmDelete && (
        <DeleteConfirm
          group={confirmDelete}
          onConfirm={() => { deleteGroup(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
