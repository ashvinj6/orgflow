import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

function generateJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function loadUserData(authUserId, email) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, user_type")
    .eq("id", authUserId)
    .single();

  if (!profile) return null;

  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id, role, user_type, orgs(id, name)")
    .eq("user_id", authUserId);

  const orgs = (memberships || []).map((m) => ({
    orgId: m.org_id,
    orgName: m.orgs?.name || "",
    role: m.role,
    userType: m.user_type,
  }));

  return {
    id: authUserId,
    name: profile.name,
    email,
    userType: profile.user_type,
    orgs,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newOrgCodes, setNewOrgCodes] = useState(null);

  const activeOrg = user?.orgs?.find((o) => o.orgId === activeOrgId) ?? user?.orgs?.[0] ?? null;

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const userData = await loadUserData(session.user.id, session.user.email);
        setUser(userData);
        setActiveOrgId(userData?.orgs?.[0]?.orgId ?? null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setActiveOrgId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: "Invalid email or password." };

    const userData = await loadUserData(data.user.id, data.user.email);
    if (!userData) return { success: false, error: "Account setup incomplete. Please contact support." };

    setUser(userData);
    setActiveOrgId(userData.orgs?.[0]?.orgId ?? null);
    return { success: true };
  }

  async function signup({ name, email, password, userType, orgName, role, joinCode }) {
    // 1. Create auth user
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };

    const userId = data.user.id;

    // 2. Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: userId, name, email, user_type: userType });
    if (profileError) return { success: false, error: profileError.message };

    let createdCodes = null;

    if (userType === "org") {
      if (joinCode) {
        // Join existing org with exec code
        const { data: org } = await supabase
          .from("orgs")
          .select("id, name")
          .eq("exec_join_code", joinCode.trim().toUpperCase())
          .single();
        if (!org) return { success: false, error: "Invalid exec join code." };

        const { error: mErr } = await supabase
          .from("org_members")
          .insert({ org_id: org.id, user_id: userId, role, user_type: "exec" });
        if (mErr) return { success: false, error: mErr.message };
      } else {
        // Create new org
        const execCode = generateJoinCode();
        const memberCode = generateJoinCode();

        const { data: org, error: orgErr } = await supabase
          .from("orgs")
          .insert({ name: orgName, exec_join_code: execCode, member_join_code: memberCode })
          .select()
          .single();
        if (orgErr) return { success: false, error: orgErr.message };

        const { error: mErr } = await supabase
          .from("org_members")
          .insert({ org_id: org.id, user_id: userId, role, user_type: "exec" });
        if (mErr) return { success: false, error: mErr.message };

        createdCodes = { execCode, memberCode, orgName };
      }
    } else {
      // Member signup
      const { data: org } = await supabase
        .from("orgs")
        .select("id, name")
        .eq("member_join_code", joinCode?.trim().toUpperCase())
        .single();
      if (!org) return { success: false, error: "Invalid member join code." };

      const { error: mErr } = await supabase
        .from("org_members")
        .insert({ org_id: org.id, user_id: userId, role: "Member", user_type: "member" });
      if (mErr) return { success: false, error: mErr.message };
    }

    // 3. Load user into state
    const userData = await loadUserData(userId, email);
    setUser(userData);
    setActiveOrgId(userData?.orgs?.[0]?.orgId ?? null);
    if (createdCodes) setNewOrgCodes(createdCodes);

    return { success: true };
  }

  // Already-logged-in exec joins another org
  async function joinOrg(joinCode, role) {
    if (!user) return { success: false, error: "Not logged in." };

    const { data: org } = await supabase
      .from("orgs")
      .select("id, name")
      .eq("exec_join_code", joinCode.trim().toUpperCase())
      .single();
    if (!org) return { success: false, error: "Invalid exec join code." };
    if (user.orgs?.find((o) => o.orgId === org.id)) {
      return { success: false, error: "You're already in this organization." };
    }

    const { error } = await supabase
      .from("org_members")
      .insert({ org_id: org.id, user_id: user.id, role, user_type: "exec" });
    if (error) return { success: false, error: error.message };

    const updated = { ...user, orgs: [...user.orgs, { orgId: org.id, orgName: org.name, role, userType: "exec" }] };
    setUser(updated);
    setActiveOrgId(org.id);
    return { success: true, org };
  }

  // Already-logged-in member joins another org
  async function joinMemberOrg(memberCode) {
    if (!user) return { success: false, error: "Not logged in." };

    const { data: org } = await supabase
      .from("orgs")
      .select("id, name")
      .eq("member_join_code", memberCode.trim().toUpperCase())
      .single();
    if (!org) return { success: false, error: "Invalid member join code." };
    if (user.orgs?.find((o) => o.orgId === org.id)) {
      return { success: false, error: "You're already in this organization." };
    }

    const { error } = await supabase
      .from("org_members")
      .insert({ org_id: org.id, user_id: user.id, role: "Member", user_type: "member" });
    if (error) return { success: false, error: error.message };

    const updated = { ...user, orgs: [...user.orgs, { orgId: org.id, orgName: org.name }] };
    setUser(updated);
    return { success: true, org };
  }

  function switchOrg(orgId) {
    setActiveOrgId(orgId);
  }

  async function getOrgCodes(orgId) {
    const { data } = await supabase
      .from("orgs")
      .select("exec_join_code, member_join_code")
      .eq("id", orgId)
      .single();
    if (!data) return null;
    return { execCode: data.exec_join_code, memberCode: data.member_join_code };
  }

  async function regenerateCode(orgId, type) {
    const newCode = generateJoinCode();
    const field = type === "exec" ? "exec_join_code" : "member_join_code";
    await supabase.from("orgs").update({ [field]: newCode }).eq("id", orgId);
    return newCode;
  }

  async function getOrgRoster(orgId) {
    const { data } = await supabase
      .from("org_members")
      .select("user_id, role, user_type, profiles(name, email)")
      .eq("org_id", orgId);

    const execs = (data || [])
      .filter((m) => m.user_type === "exec")
      .map((m) => ({ id: m.user_id, name: m.profiles?.name || "", email: m.profiles?.email || "", role: m.role }));
    const members = (data || [])
      .filter((m) => m.user_type === "member")
      .map((m) => ({ id: m.user_id, name: m.profiles?.name || "", email: m.profiles?.email || "" }));

    return { execs, members };
  }

  async function getOrgJoinCode(orgId) {
    const { data } = await supabase
      .from("orgs")
      .select("exec_join_code")
      .eq("id", orgId)
      .single();
    return data?.exec_join_code ?? null;
  }

  function clearNewOrgCodes() {
    setNewOrgCodes(null);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setActiveOrgId(null);
    setNewOrgCodes(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user, activeOrg, activeOrgId, loading, newOrgCodes,
        login, signup, joinOrg, joinMemberOrg, switchOrg,
        getOrgCodes, getOrgJoinCode, regenerateCode, getOrgRoster,
        clearNewOrgCodes, logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
