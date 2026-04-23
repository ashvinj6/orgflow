import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const EventsContext = createContext();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function EventsProvider({ children }) {
  const { activeOrgId, user } = useAuth();
  const [events, setEvents] = useState([]);
  // attendance: { eventId: [userId, ...] }
  const [attendance, setAttendance] = useState({});

  const loadEvents = useCallback(async () => {
    if (!activeOrgId) { setEvents([]); return; }
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("org_id", activeOrgId)
      .order("date", { ascending: true });
    setEvents(data || []);
  }, [activeOrgId]);

  const loadAttendance = useCallback(async () => {
    if (!activeOrgId) { setAttendance({}); return; }
    const { data } = await supabase
      .from("attendance_records")
      .select("event_id, user_id")
      .eq("org_id", activeOrgId)
      .not("user_id", "is", null);

    const map = {};
    (data || []).forEach((r) => {
      if (!map[r.event_id]) map[r.event_id] = [];
      map[r.event_id].push(r.user_id);
    });
    setAttendance(map);
  }, [activeOrgId]);

  useEffect(() => {
    loadEvents();
    loadAttendance();
  }, [loadEvents, loadAttendance]);

  const addEvent = async (event) => {
    const code = event.trackAttendance ? generateCode() : null;
    const { data, error } = await supabase
      .from("events")
      .insert({
        org_id: activeOrgId,
        title: event.title,
        type: event.type,
        date: event.date,
        time: event.time || null,
        location: event.location || null,
        description: event.description || null,
        track_attendance: event.trackAttendance || false,
        attendance_code: code,
        end_time: event.endTime || null,
        requirement_category: event.requirementCategory || null,
        point_value: event.pointValue ? Number(event.pointValue) : 1,
      })
      .select()
      .single();
    if (error) return null;
    setEvents((prev) => [...prev, data]);
    return data;
  };

  const editEvent = async (id, updates) => {
    // If track_attendance is newly being turned on and there's no existing code, generate one
    const existing = events.find((e) => e.id === id);
    const needsNewCode = updates.trackAttendance && !existing?.attendance_code;
    const code = needsNewCode ? generateCode() : existing?.attendance_code ?? null;

    const { data, error } = await supabase
      .from("events")
      .update({
        title: updates.title,
        type: updates.type,
        date: updates.date,
        time: updates.time || null,
        location: updates.location || null,
        description: updates.description || null,
        track_attendance: updates.trackAttendance || false,
        attendance_code: updates.trackAttendance ? code : null,
        end_time: updates.endTime || null,
        requirement_category: updates.requirementCategory || null,
        point_value: updates.pointValue ? Number(updates.pointValue) : 1,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return null;
    setEvents((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  };

  const deleteEvent = async (id) => {
    await supabase.from("events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setAttendance((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  // Toggle exec manual attendance mark
  const toggleAttendance = async (eventId, memberId) => {
    const current = attendance[eventId] || [];
    if (current.includes(memberId)) {
      await supabase.from("attendance_records")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", memberId);
      setAttendance((prev) => ({
        ...prev,
        [eventId]: (prev[eventId] || []).filter((id) => id !== memberId),
      }));
    } else {
      const { data: profile } = await supabase
        .from("profiles").select("name, email").eq("id", memberId).single();
      await supabase.from("attendance_records").insert({
        event_id: eventId,
        org_id: activeOrgId,
        user_id: memberId,
        user_name: profile?.name || memberId,
        user_email: profile?.email || null,
        source: "manual",
      });
      setAttendance((prev) => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), memberId],
      }));
    }
  };

  // Record a member's code check-in (called from MemberView)
  const addAttendee = async (eventId, userId, orgId, source = "code") => {
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return; // already checked in

    const { data: profile } = await supabase
      .from("profiles").select("name, email").eq("id", userId).single();
    await supabase.from("attendance_records").insert({
      event_id: eventId,
      org_id: orgId || activeOrgId,
      user_id: userId,
      user_name: profile?.name || "",
      user_email: profile?.email || null,
      source: source,
    });
    setAttendance((prev) => ({
      ...prev,
      [eventId]: [...new Set([...(prev[eventId] || []), userId])],
    }));
  };

  const getEventAttendees = (eventId) => attendance[eventId] || [];

  // Verify a static attendance code for an event
  const verifyEventCode = (eventId, enteredCode) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return { valid: false, error: "Event not found." };
    if (!event.track_attendance || !event.attendance_code) {
      return { valid: false, error: "This event does not have an attendance code." };
    }
    if (event.attendance_code !== enteredCode.trim()) {
      return { valid: false, error: "Incorrect code. Double-check with your officer." };
    }
    return { valid: true };
  };

  // Fetch events for any org (used by member-side dashboard)
  const getEventsForOrg = async (orgId) => {
    if (!orgId) return [];
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("org_id", orgId)
      .order("date", { ascending: true });
    return data || [];
  };

  // Fetch attendance map for any org (used by member-side dashboard)
  const getAttendanceForOrg = async (orgId) => {
    if (!orgId) return {};
    const { data } = await supabase
      .from("attendance_records")
      .select("event_id, user_id")
      .eq("org_id", orgId)
      .not("user_id", "is", null);
    const map = {};
    (data || []).forEach((r) => {
      if (!map[r.event_id]) map[r.event_id] = [];
      map[r.event_id].push(r.user_id);
    });
    return map;
  };

  return (
    <EventsContext.Provider
      value={{
        events, attendance,
        addEvent, editEvent, deleteEvent,
        toggleAttendance, addAttendee,
        getEventAttendees,
        verifyEventCode,
        getEventsForOrg,
        getAttendanceForOrg,
        loadAttendance,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within EventsProvider");
  return ctx;
}
