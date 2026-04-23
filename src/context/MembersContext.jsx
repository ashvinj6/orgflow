import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const MembersContext = createContext();

export function MembersProvider({ children }) {
  const { activeOrgId } = useAuth();
  const [members, setMembers] = useState([]);

  const loadMembers = useCallback(async () => {
    if (!activeOrgId) { setMembers([]); return; }

    // Real user accounts in this org
    const { data: realData } = await supabase
      .from("org_members")
      .select("user_id, role, user_type, joined_at, profiles(id, name, email)")
      .eq("org_id", activeOrgId);

    const realMembers = (realData || []).map((m) => ({
      id: m.user_id,
      name: m.profiles?.name || "",
      email: m.profiles?.email || "",
      role: m.role || "Member",
      committee: "",
      major: "",
      joinDate: m.joined_at ? m.joined_at.split("T")[0] : "",
      isReal: true,
      userType: m.user_type,
    }));

    // Manually-added members
    const { data: manualData } = await supabase
      .from("manual_members")
      .select("*")
      .eq("org_id", activeOrgId);

    const manualMembers = (manualData || []).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email || "",
      role: m.role || "Member",
      committee: m.committee || "",
      major: m.major || "",
      joinDate: m.join_date || "",
      isManual: true,
    }));

    setMembers([...realMembers, ...manualMembers]);
  }, [activeOrgId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const addMember = async (member) => {
    const { data, error } = await supabase
      .from("manual_members")
      .insert({
        org_id: activeOrgId,
        name: member.name,
        email: member.email || null,
        role: member.role || "Member",
        committee: member.committee || null,
        major: member.major || null,
      })
      .select()
      .single();
    if (error) return null;
    const newMember = {
      id: data.id,
      name: data.name,
      email: data.email || "",
      role: data.role,
      committee: data.committee || "",
      major: data.major || "",
      joinDate: data.join_date || "",
      isManual: true,
    };
    setMembers((prev) => [...prev, newMember]);
    return newMember;
  };

  // Only manual members can be deleted this way
  const deleteMember = async (id) => {
    await supabase.from("manual_members").delete().eq("id", id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMember = async (id, updates) => {
    await supabase.from("manual_members").update(updates).eq("id", id);
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  return (
    <MembersContext.Provider value={{ members, addMember, updateMember, deleteMember, loadMembers }}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  const ctx = useContext(MembersContext);
  if (!ctx) throw new Error("useMembers must be used within MembersProvider");
  return ctx;
}
