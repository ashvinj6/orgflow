// Parse "6:00 PM PT" or "6:00 PM" → minutes since midnight (timezone label ignored for local comparison)
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.replace(/\s+(PT|MT|CT|ET)$/i, "").trim();
  const m = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

// Returns "upcoming" | "ongoing" | "past"
export function getEventState(event) {
  const now = new Date();
  const eventDate = new Date(event.date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);

  if (eventDate > today) return "upcoming";
  if (eventDate < today) return "past";

  // Same day — compare times
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = parseTimeToMinutes(event.time);

  if (startMin === null) return "past"; // no time set → treat as ended

  if (nowMin < startMin) return "upcoming";

  const endMin = parseTimeToMinutes(event.end_time) ?? (startMin + 120); // default 2-hr window
  if (nowMin <= endMin) return "ongoing";
  return "past";
}

// True when the event ended today (same calendar day, past end time)
export function isLateToday(event) {
  const today = new Date().toISOString().slice(0, 10);
  return event.date === today && getEventState(event) === "past";
}
