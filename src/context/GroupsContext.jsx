import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const GroupsContext = createContext();

export function GroupsProvider({ children }) {
  const { activeOrgId } = useAuth();
  const [groups, setGroups] = useState([]);
  // Raw membership rows: [{ group_id, member_id, member_type }]
  const [memberships, setMemberships] = useState([]);

  const load = useCallback(async () => {
    if (!activeOrgId) { setGroups([]); setMemberships([]); return; }

    const { data: groupData } = await supabase
      .from("groups")
      .select("*")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: true });
    const orgGroups = groupData || [];
    setGroups(orgGroups);

    if (orgGroups.length === 0) { setMemberships([]); return; }

    const { data: memberData } = await supabase
      .from("group_members")
      .select("group_id, member_id, member_type")
      .in("group_id", orgGroups.map((g) => g.id));
    setMemberships(memberData || []);
  }, [activeOrgId]);

  useEffect(() => { load(); }, [load]);

  const createGroup = async (name) => {
    const { data, error } = await supabase
      .from("groups")
      .insert({ org_id: activeOrgId, name: name.trim() })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setGroups((prev) => [...prev, data]);
    return { success: true, data };
  };

  const renameGroup = async (id, name) => {
    const { data, error } = await supabase
      .from("groups")
      .update({ name: name.trim() })
      .eq("id", id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setGroups((prev) => prev.map((g) => (g.id === id ? data : g)));
    return { success: true, data };
  };

  const deleteGroup = async (id) => {
    await supabase.from("groups").delete().eq("id", id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setMemberships((prev) => prev.filter((m) => m.group_id !== id));
  };

  // Replaces the full member list for a group in one go.
  // members: [{ id, memberType: 'real' | 'manual' }]
  const setGroupMembers = async (groupId, members) => {
    await supabase.from("group_members").delete().eq("group_id", groupId);
    if (members.length > 0) {
      const rows = members.map((m) => ({ group_id: groupId, member_id: m.id, member_type: m.memberType }));
      const { error } = await supabase.from("group_members").insert(rows);
      if (error) return { success: false, error: error.message };
    }
    setMemberships((prev) => [
      ...prev.filter((m) => m.group_id !== groupId),
      ...members.map((m) => ({ group_id: groupId, member_id: m.id, member_type: m.memberType })),
    ]);
    return { success: true };
  };

  const getGroupMemberIds = (groupId) =>
    new Set(memberships.filter((m) => m.group_id === groupId).map((m) => m.member_id));

  const getGroupsForMember = (memberId) =>
    groups.filter((g) => memberships.some((m) => m.group_id === g.id && m.member_id === memberId));

  return (
    <GroupsContext.Provider
      value={{
        groups,
        memberships,
        createGroup,
        renameGroup,
        deleteGroup,
        setGroupMembers,
        getGroupMemberIds,
        getGroupsForMember,
        reload: load,
      }}
    >
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used within GroupsProvider");
  return ctx;
}
