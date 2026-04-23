import { useMembers } from "../context/MembersContext";
import { useEvents } from "../context/EventsContext";
import { Card, StatCard, Badge } from "../components/UI";
import { getMemberAttendanceCount, getEngagementLevel, getEngagementColor } from "../data/mockData";

export default function Insights() {
  const { members } = useMembers();
  const { events, attendance } = useEvents();

  const pastEvents = events.filter((e) => new Date(e.date) <= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Engagement breakdown
  const engagementBreakdown = { High: 0, Medium: 0, Low: 0, Inactive: 0 };
  members.forEach((m) => {
    const count = getMemberAttendanceCount(m.id, attendance);
    const level = getEngagementLevel(count, pastEvents.length);
    if (engagementBreakdown[level] !== undefined) engagementBreakdown[level]++;
  });

  // Attendance by event type
  const byType = {};
  pastEvents.forEach((e) => {
    if (!byType[e.type]) byType[e.type] = { total: 0, events: 0 };
    byType[e.type].total += (attendance[e.id] || []).length;
    byType[e.type].events += 1;
  });

  // Member ranking
  const memberRanking = members
    .map((m) => ({ ...m, count: getMemberAttendanceCount(m.id, attendance), level: getEngagementLevel(getMemberAttendanceCount(m.id, attendance), pastEvents.length) }))
    .sort((a, b) => b.count - a.count);

  // Attendance trend per event
  const trendData = pastEvents.map((e) => ({
    label: e.title.length > 20 ? e.title.slice(0, 20) + "…" : e.title,
    count: (attendance[e.id] || []).length,
    total: members.length,
  }));

  const maxCount = Math.max(...trendData.map((d) => d.count), 1);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "var(--text-primary, #0f172a)", letterSpacing: "-0.02em" }}>Insights</h1>
        <p style={{ color: "var(--text-muted, #64748b)", marginTop: 4, fontSize: 14 }}>Engagement analytics and attendance trends</p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard label="High Engagement" value={engagementBreakdown.High} color="#22c55e" sublabel={`${((engagementBreakdown.High / members.length) * 100).toFixed(0)}% of members`} />
        <StatCard label="Medium" value={engagementBreakdown.Medium} color="#f59e0b" sublabel={`${((engagementBreakdown.Medium / members.length) * 100).toFixed(0)}% of members`} />
        <StatCard label="Low" value={engagementBreakdown.Low} color="#ef4444" sublabel={`${((engagementBreakdown.Low / members.length) * 100).toFixed(0)}% of members`} />
        <StatCard label="Inactive" value={engagementBreakdown.Inactive} color="#6b7280" sublabel={`${((engagementBreakdown.Inactive / members.length) * 100).toFixed(0)}% of members`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Attendance Trend Bar Chart */}
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>Attendance by Event</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {trendData.map((d, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-primary, #334155)", fontWeight: 500 }}>{d.label}</span>
                  <span style={{ color: "var(--text-muted, #94a3b8)" }}>{d.count}/{d.total}</span>
                </div>
                <div style={{ height: 24, background: "var(--border, #f1f5f9)", borderRadius: 6, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(d.count / maxCount) * 100}%`,
                      background: "linear-gradient(90deg, #f97316, #ef4444)",
                      borderRadius: 6,
                      transition: "width 0.3s ease",
                      minWidth: d.count > 0 ? 20 : 0,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* By Event Type */}
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>Avg Attendance by Type</h3>
          {Object.entries(byType).map(([type, data]) => {
            const avg = (data.total / data.events).toFixed(1);
            const typeColors = { "General Meeting": "#f97316", Workshop: "#f59e0b", "Speaker Event": "#06b6d4", Social: "#22c55e", Fundraiser: "#ec4899" };
            return (
              <div key={type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border, #f1f5f9)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: typeColors[type] || "#6b7280" }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary, #0f172a)" }}>{type}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>{avg}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)", marginLeft: 4 }}>avg ({data.events} events)</span>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Full Member Ranking */}
      <Card>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>Full Member Ranking</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border, #e2e8f0)" }}>
              {["#", "Name", "Committee", "Events Attended", "Rate", "Engagement"].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted, #64748b)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {memberRanking.map((m, i) => {
              const rate = pastEvents.length > 0 ? ((m.count / pastEvents.length) * 100).toFixed(0) : 0;
              return (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--border, #f1f5f9)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text-muted, #94a3b8)" }}>{i + 1}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-primary, #0f172a)" }}>{m.name}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-primary, #334155)" }}>{m.committee}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{m.count}/{pastEvents.length}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-muted, #64748b)" }}>{rate}%</td>
                  <td style={{ padding: "10px 12px" }}><Badge label={m.level} color={getEngagementColor(m.level)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
