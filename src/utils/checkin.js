import { supabase } from "../lib/supabase";

export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Create a new live check-in session ──
export async function createSession({ eventId, eventTitle, orgId, durationMinutes }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  // Deactivate any existing active session for this event
  await supabase
    .from("checkin_sessions")
    .update({ active: false })
    .eq("event_id", eventId)
    .eq("org_id", orgId)
    .eq("active", true);

  const { data, error } = await supabase
    .from("checkin_sessions")
    .insert({
      event_id: eventId,
      event_title: eventTitle,
      org_id: orgId,
      code: generateCode(),
      expires_at: expiresAt.toISOString(),
      active: true,
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

// ── Get the active session for a specific event (exec view) ──
export async function getActiveSessionForEvent(orgId, eventId) {
  const { data } = await supabase
    .from("checkin_sessions")
    .select("*")
    .eq("org_id", orgId)
    .eq("event_id", eventId)
    .eq("active", true)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data || null;
}

// ── Get all active sessions for an org (member view) ──
export async function getActiveSessionsForOrg(orgId) {
  const { data } = await supabase
    .from("checkin_sessions")
    .select("*")
    .eq("org_id", orgId)
    .eq("active", true)
    .gt("expires_at", new Date().toISOString());
  return data || [];
}

// ── Validate a code entered by a member ──
export async function getSessionByCode(code) {
  const { data } = await supabase
    .from("checkin_sessions")
    .select("*")
    .eq("code", code.trim())
    .eq("active", true)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data || null;
}

// ── End a session early ──
export async function endSession(sessionId) {
  await supabase
    .from("checkin_sessions")
    .update({ active: false })
    .eq("id", sessionId);
}

// ── Regenerate the code and extend expiry ──
export async function refreshSession(sessionId, durationMinutes) {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("checkin_sessions")
    .update({ code: generateCode(), expires_at: expiresAt })
    .eq("id", sessionId)
    .select()
    .single();
  return data;
}

// ── Record a member check-in ──
export async function recordCheckIn({ sessionId, eventId, orgId, userId, userName, userEmail }) {
  // Check for duplicate
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { success: false, error: "You've already checked in to this event." };

  const { data, error } = await supabase
    .from("attendance_records")
    .insert({
      event_id: eventId,
      org_id: orgId,
      user_id: userId,
      user_name: userName,
      user_email: userEmail || null,
      source: "session",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, record: data };
}

// ── Get all code/session check-in records for an event (excludes manual marks) ──
export async function getEventCheckIns(eventId) {
  const { data } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("event_id", eventId)
    .neq("source", "manual")
    .order("checked_in_at", { ascending: true });
  return data || [];
}

// ── Check if a user has checked in to a specific event ──
export async function hasCheckedIn(eventId, userId) {
  const { data } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// ── Format ms remaining as M:SS ──
export function formatCountdown(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}
