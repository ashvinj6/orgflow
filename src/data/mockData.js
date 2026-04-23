// ── Members ──
export const MOCK_MEMBERS = [
  { id: "m1", name: "Ashvin Sharma", role: "President", committee: "Executive", major: "Computer Science", joinDate: "2024-01-15", email: "ashvin@university.edu" },
  { id: "m2", name: "Priya Patel", role: "VP Operations", committee: "Executive", major: "Business Analytics", joinDate: "2024-01-15", email: "priya@university.edu" },
  { id: "m3", name: "Marcus Chen", role: "VP Academics", committee: "Executive", major: "Data Science", joinDate: "2024-01-20", email: "marcus@university.edu" },
  { id: "m4", name: "Sofia Rodriguez", role: "Event Lead", committee: "Events", major: "Marketing", joinDate: "2024-02-01", email: "sofia@university.edu" },
  { id: "m5", name: "James Kim", role: "Member", committee: "Tech", major: "Software Engineering", joinDate: "2024-02-10", email: "james@university.edu" },
  { id: "m6", name: "Aisha Johnson", role: "Member", committee: "Outreach", major: "Communications", joinDate: "2024-02-15", email: "aisha@university.edu" },
  { id: "m7", name: "Tyler Brooks", role: "Committee Lead", committee: "Finance", major: "Accounting", joinDate: "2024-03-01", email: "tyler@university.edu" },
  { id: "m8", name: "Nina Okafor", role: "Member", committee: "Tech", major: "Computer Science", joinDate: "2024-03-05", email: "nina@university.edu" },
  { id: "m9", name: "Diego Flores", role: "Member", committee: "Events", major: "Graphic Design", joinDate: "2024-03-10", email: "diego@university.edu" },
  { id: "m10", name: "Rachel Wong", role: "Member", committee: "Outreach", major: "Public Relations", joinDate: "2024-04-01", email: "rachel@university.edu" },
  { id: "m11", name: "Ethan Davis", role: "Member", committee: "Tech", major: "Computer Engineering", joinDate: "2024-04-15", email: "ethan@university.edu" },
  { id: "m12", name: "Lily Tanaka", role: "Member", committee: "Academics", major: "Mathematics", joinDate: "2024-05-01", email: "lily@university.edu" },
];

// ── Events ──
export const MOCK_EVENTS = [
  { id: "e1", title: "Spring Kickoff Meeting", type: "General Meeting", date: "2026-01-20", time: "6:00 PM", location: "Student Union Room 201", description: "Welcome back meeting to outline spring semester plans and goals." },
  { id: "e2", title: "Resume Workshop", type: "Workshop", date: "2026-02-05", time: "5:30 PM", location: "Career Center Lab", description: "Hands-on session helping members polish their resumes." },
  { id: "e3", title: "Tech Talk: AI in 2026", type: "Speaker Event", date: "2026-02-18", time: "7:00 PM", location: "Engineering Hall 105", description: "Guest speaker from industry discussing AI trends." },
  { id: "e4", title: "Networking Mixer", type: "Social", date: "2026-03-01", time: "6:30 PM", location: "Campus Lounge", description: "Casual networking event with alumni and current members." },
  { id: "e5", title: "Hackathon Prep", type: "Workshop", date: "2026-03-15", time: "4:00 PM", location: "CS Building Lab 3", description: "Team formation and project ideation for upcoming hackathon." },
  { id: "e6", title: "General Body Meeting", type: "General Meeting", date: "2026-04-25", time: "6:00 PM", location: "Student Union Room 201", description: "Mid-semester updates and committee reports." },
  { id: "e7", title: "End of Year Banquet", type: "Social", date: "2026-05-10", time: "7:00 PM", location: "University Ballroom", description: "Celebrating the year's achievements and officer transitions." },
];

// ── Attendance Records ──
// Maps event ID -> array of member IDs who attended
export const MOCK_ATTENDANCE = {
  e1: ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "m11", "m12"],
  e2: ["m1", "m2", "m3", "m5", "m6", "m8", "m11"],
  e3: ["m1", "m3", "m4", "m5", "m8", "m9", "m11", "m12"],
  e4: ["m1", "m2", "m4", "m6", "m7", "m9", "m10"],
  e5: ["m1", "m3", "m5", "m8", "m11"],
  e6: ["m1", "m2", "m3", "m4", "m5", "m7", "m8", "m10", "m11"],
  e7: [],
};

// ── Notes ──
export const MOCK_NOTES = [
  { id: "n1", title: "Officer Transition Checklist", author: "Ashvin Sharma", date: "2025-04-10", category: "Handoff", content: "Key things to pass along to incoming president:\n- Budget spreadsheet is in shared Drive\n- Venue contacts saved in org email\n- Always book rooms at least 3 weeks ahead\n- Faculty advisor prefers email over Slack" },
  { id: "n2", title: "Resume Workshop Learnings", author: "Priya Patel", date: "2025-02-06", category: "Event Learning", content: "What went well: High turnout (7 members), good engagement. What to improve: Need more laptops next time, some members didn't bring their resumes. Book the larger lab next time." },
  { id: "n3", title: "Budget Reminder", author: "Tyler Brooks", date: "2025-03-20", category: "Reminder", content: "Submit funding request to SGA by April 15 for fall semester. Need itemized budget with at least 3 vendor quotes for any purchase over $200." },
];

// ── Helper functions ──
export function getMemberAttendanceCount(memberId, attendance) {
  return Object.values(attendance).filter((attendees) => attendees.includes(memberId)).length;
}

export function getEngagementLevel(attendanceCount, totalEvents) {
  if (totalEvents === 0) return "New";
  const rate = attendanceCount / totalEvents;
  if (rate >= 0.75) return "High";
  if (rate >= 0.4) return "Medium";
  if (rate > 0) return "Low";
  return "Inactive";
}

export function getEngagementColor(level) {
  const colors = {
    High: "#22c55e",
    Medium: "#f59e0b",
    Low: "#ef4444",
    Inactive: "#6b7280",
    New: "#8b5cf6",
  };
  return colors[level] || "#6b7280";
}
