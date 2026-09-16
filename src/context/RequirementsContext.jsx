import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const RequirementsContext = createContext();

export function RequirementsProvider({ children }) {
  const { activeOrgId } = useAuth();
  const [requirements, setRequirements] = useState([]);

  const load = useCallback(async () => {
    if (!activeOrgId) { setRequirements([]); return; }
    const { data } = await supabase
      .from("participation_requirements")
      .select("*, groups(name)")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: true });
    setRequirements((data || []).map((r) => ({ ...r, group_name: r.groups?.name ?? null })));
  }, [activeOrgId]);

  useEffect(() => { load(); }, [load]);

  const addRequirement = async (fields) => {
    const { data, error } = await supabase
      .from("participation_requirements")
      .insert({ org_id: activeOrgId, ...fields })
      .select("*, groups(name)")
      .single();
    if (error) return { success: false, error: error.message };
    const withGroupName = { ...data, group_name: data.groups?.name ?? null };
    setRequirements((prev) => [...prev, withGroupName]);
    return { success: true, data: withGroupName };
  };

  const updateRequirement = async (id, fields) => {
    const { data, error } = await supabase
      .from("participation_requirements")
      .update(fields)
      .eq("id", id)
      .select("*, groups(name)")
      .single();
    if (error) return { success: false, error: error.message };
    const withGroupName = { ...data, group_name: data.groups?.name ?? null };
    setRequirements((prev) => prev.map((r) => (r.id === id ? withGroupName : r)));
    return { success: true, data: withGroupName };
  };

  const deleteRequirement = async (id) => {
    await supabase.from("participation_requirements").delete().eq("id", id);
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  };

  // Load requirements for any org (used by member dashboard).
  // RLS already hides requirements scoped to a group the member isn't in —
  // this just also pulls the group name so it can be shown for the ones that are visible.
  const getRequirementsForOrg = async (orgId) => {
    if (!orgId) return [];
    const { data } = await supabase
      .from("participation_requirements")
      .select("*, groups(name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });
    return (data || []).map((r) => ({ ...r, group_name: r.groups?.name ?? null }));
  };

  // Compute progress for all requirements given a member's attended event set
  // attendedSet: Set<eventId>, events: full event array (with requirement_category + point_value)
  function computeProgress(reqs, attendedSet, events) {
    return reqs.map((req) => {
      const catEvents = events.filter((e) => e.requirement_category === req.category);
      const attended = catEvents.filter((e) => attendedSet.has(e.id));
      const count =
        req.unit === "points"
          ? attended.reduce((s, e) => s + (e.point_value || 1), 0)
          : attended.length;
      return {
        ...req,
        count,
        completed: count >= req.required_count,
        pct: Math.min(Math.round((count / req.required_count) * 100), 100),
      };
    });
  }

  return (
    <RequirementsContext.Provider
      value={{
        requirements,
        addRequirement,
        updateRequirement,
        deleteRequirement,
        getRequirementsForOrg,
        computeProgress,
        reload: load,
      }}
    >
      {children}
    </RequirementsContext.Provider>
  );
}

export function useRequirements() {
  const ctx = useContext(RequirementsContext);
  if (!ctx) throw new Error("useRequirements must be used within RequirementsProvider");
  return ctx;
}
