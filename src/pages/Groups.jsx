import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGroups } from "../context/GroupsContext";
import { useMembers } from "../context/MembersContext";
import { supabase } from "../lib/supabase";
import { Badge, Button, Card, FormField, Input, Modal, SearchInput } from "../components/UI";

const EMPTY_DRAFT = { id: null, name: "", memberKeys: [] };
const memberKey = (member) => `${member.isManual ? "manual" : "real"}:${member.id}`;
const isExec = (member) => member.userType === "exec" || (member.isManual && member.role && member.role !== "Member");

export default function Groups() {
  const { activeOrgId } = useAuth();
  const { members } = useMembers();
  const { reload: reloadSharedGroups } = useGroups();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [showEditor, setShowEditor] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const rosterByKey = useMemo(() => new Map(members.map((member) => [memberKey(member), member])), [members]);

  const loadGroups = useCallback(async () => {
    if (!activeOrgId) { setGroups([]); setLoading(false); return; }
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, created_at, group_members(member_id, member_type)")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false });

    if (error) {
      setGroups([]);
      setLoadError(error.message);
    } else {
      setGroups((data || []).map((group) => ({
        ...group,
        memberKeys: (group.group_members || []).map((membership) => `${membership.member_type}:${membership.member_id}`),
      })));
    }
    setLoading(false);
  }, [activeOrgId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => [member.name, member.email, member.role].some((value) => (value || "").toLowerCase().includes(query)));
  }, [members, search]);
  const execMembers = visibleMembers.filter(isExec);
  const regularMembers = visibleMembers.filter((member) => !isExec(member));

  function openCreate() {
    setDraft(EMPTY_DRAFT); setSearch(""); setSaveError(""); setShowEditor(true);
  }

  function openEdit(group) {
    setDraft({ id: group.id, name: group.name, memberKeys: group.memberKeys });
    setSearch(""); setSaveError(""); setShowEditor(true);
  }

  function toggleMember(key) {
    setDraft((current) => ({
      ...current,
      memberKeys: current.memberKeys.includes(key) ? current.memberKeys.filter((value) => value !== key) : [...current.memberKeys, key],
    }));
  }

  async function saveGroup() {
    const name = draft.name.trim();
    if (!name) { setSaveError("Enter a group name."); return; }
    if (saving) return;
    setSaving(true); setSaveError("");
    let groupId = draft.id;

    if (groupId) {
      const { error } = await supabase.from("groups").update({ name }).eq("id", groupId).eq("org_id", activeOrgId);
      if (error) { setSaveError(error.message); setSaving(false); return; }
      const { error: clearError } = await supabase.from("group_members").delete().eq("group_id", groupId);
      if (clearError) { setSaveError(clearError.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("groups").insert({ org_id: activeOrgId, name }).select("id").single();
      if (error) { setSaveError(error.message); setSaving(false); return; }
      groupId = data.id;
      // Keep the created ID so a membership-write retry does not create a duplicate.
      setDraft((current) => ({ ...current, id: groupId }));
    }

    if (draft.memberKeys.length > 0) {
      const memberships = draft.memberKeys.map((key) => {
        const [memberType, memberId] = key.split(":");
        return { group_id: groupId, member_id: memberId, member_type: memberType };
      });
      const { error } = await supabase.from("group_members").insert(memberships);
      if (error) { setSaveError(error.message); setSaving(false); return; }
    }

    await Promise.all([loadGroups(), reloadSharedGroups()]);
    setSaving(false); setShowEditor(false);
  }

  async function deleteGroup() {
    if (!pendingDelete) return;
    const { error } = await supabase.from("groups").delete().eq("id", pendingDelete.id).eq("org_id", activeOrgId);
    if (error) setLoadError(error.message);
    else {
      setGroups((current) => current.filter((group) => group.id !== pendingDelete.id));
      await reloadSharedGroups();
    }
    setPendingDelete(null);
  }

  function renderMemberSection(title, sectionMembers, badgeColor) {
    return (
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>{sectionMembers.length}</span>
        </div>
        <div style={{ border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, overflow: "hidden" }}>
          {sectionMembers.length === 0 ? (
            <div style={{ padding: 16, fontSize: 13, color: "var(--text-muted, #94a3b8)", textAlign: "center" }}>No matching members</div>
          ) : sectionMembers.map((member) => {
            const key = memberKey(member);
            const selected = draft.memberKeys.includes(key);
            return (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderBottom: "1px solid var(--border, #f1f5f9)", cursor: "pointer", background: selected ? "#fff7ed" : "transparent" }}>
                <input type="checkbox" checked={selected} onChange={() => toggleMember(key)} style={{ width: 17, height: 17, accentColor: "#f97316" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.email || "No email"}</div>
                </div>
                <Badge label={member.role || "Member"} color={badgeColor} />
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text-primary, #0f172a)", letterSpacing: "-0.02em" }}>Groups</h1>
          <p style={{ color: "var(--text-muted, #64748b)", marginTop: 4, fontSize: 14 }}>Organize exec and regular members into custom groups, then scope requirements to a group from the Requirements page.</p>
        </div>
        <Button onClick={openCreate}>+ Create Group</Button>
      </div>

      {loadError && <div style={{ padding: "12px 16px", marginBottom: 18, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>Could not load groups: {loadError}</div>}

      {loading ? (
        <Card style={{ textAlign: "center", color: "var(--text-muted, #64748b)" }}>Loading groups…</Card>
      ) : groups.length === 0 ? (
        <Card style={{ padding: "52px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>◫</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary, #0f172a)", marginBottom: 6 }}>No groups yet</div>
          <p style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", maxWidth: 390, margin: "0 auto 20px" }}>Create a group such as Fall 2025, Recruitment Team, or Event Committee, then choose who belongs in it.</p>
          <Button onClick={openCreate}>Create Your First Group</Button>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
          {groups.map((group) => {
            const groupMembers = group.memberKeys.map((key) => rosterByKey.get(key)).filter(Boolean);
            return (
              <Card key={group.id}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div><h2 style={{ margin: 0, fontSize: 18, color: "var(--text-primary, #0f172a)" }}>{group.name}</h2><div style={{ marginTop: 5, fontSize: 13, color: "var(--text-muted, #64748b)" }}>{groupMembers.length} {groupMembers.length === 1 ? "member" : "members"}</div></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="secondary" onClick={() => openEdit(group)} style={{ padding: "6px 10px", fontSize: 12 }}>Edit</Button>
                    <Button variant="secondary" onClick={() => setPendingDelete(group)} style={{ padding: "6px 10px", fontSize: 12, color: "#dc2626" }}>Delete</Button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 18 }}>
                  {groupMembers.length === 0 ? <span style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)" }}>No members selected</span> : groupMembers.slice(0, 8).map((member) => <span key={memberKey(member)} style={{ padding: "5px 9px", borderRadius: 20, background: isExec(member) ? "#fff7ed" : "#eef2ff", color: isExec(member) ? "#c2410c" : "#4338ca", fontSize: 12, fontWeight: 600 }}>{member.name}</span>)}
                  {groupMembers.length > 8 && <span style={{ padding: "5px 9px", fontSize: 12, color: "var(--text-muted, #64748b)" }}>+{groupMembers.length - 8} more</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showEditor} onClose={() => !saving && setShowEditor(false)} title={draft.id ? "Edit Group" : "Create Group"}>
        <FormField label="Group name"><Input value={draft.name} onChange={(name) => setDraft((current) => ({ ...current, name }))} placeholder="e.g. Fall 2025" /></FormField>
        <SearchInput value={search} onChange={setSearch} placeholder="Search members..." />
        <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 8 }}>{draft.memberKeys.length} selected</div>
        {renderMemberSection("Executive members", execMembers, "#f97316")}
        {renderMemberSection("Regular members", regularMembers, "#6366f1")}
        {saveError && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13, marginTop: 16 }}>{saveError}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <Button variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
          <Button onClick={saveGroup} style={{ opacity: saving ? 0.65 : 1 }}>{saving ? "Saving…" : draft.id ? "Save Changes" : "Create Group"}</Button>
        </div>
      </Modal>

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete Group">
        <p style={{ marginTop: 0, color: "var(--text-primary, #0f172a)", fontSize: 14 }}>Delete <strong>{pendingDelete?.name}</strong>? This removes the group, but does not remove anyone from the organization. Requirements scoped to this group become visible org-wide.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}><Button variant="secondary" onClick={() => setPendingDelete(null)}>Cancel</Button><Button variant="danger" onClick={deleteGroup}>Delete Group</Button></div>
      </Modal>
    </div>
  );
}
