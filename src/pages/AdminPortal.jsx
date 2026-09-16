import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import useIsMobile from "../hooks/useIsMobile";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function AdminPortal() {
  const { user, logout, getAllOrgsForAdmin, startAdminPreview } = useAuth();
  const isMobile = useIsMobile();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getAllOrgsForAdmin().then((data) => {
      setOrgs(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter((o) => o.name.toLowerCase().includes(q));
  }, [orgs, query]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Top nav ── */}
      <div style={{ background: "#0f172a", padding: isMobile ? "10px 16px" : "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", minHeight: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/orgflow_logo.png" alt="OrgFlow" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>OrgFlow</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f97316", border: "1px solid #f97316", borderRadius: 5, padding: "2px 8px", marginLeft: 4 }}>
            ADMIN
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!isMobile && (
            <span style={{ fontSize: 13, color: "#475569" }}>
              <strong style={{ color: "#e2e8f0" }}>{user?.name}</strong>
            </span>
          )}
          <button
            onClick={logout}
            style={{ padding: "6px 13px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.color = "#f97316"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            Log Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "20px 16px" : "36px 32px", boxSizing: "border-box" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", margin: 0, marginBottom: 4 }}>
            Admin Portal
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            Every organization on OrgFlow. Drop into any of them to see it as an exec or a member — read-only, nothing you do here touches their real data.
          </p>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organizations…"
          style={{
            width: "100%", padding: "11px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0",
            fontSize: 14, background: "#fff", color: "#0f172a", outline: "none",
            boxSizing: "border-box", fontFamily: "inherit", marginBottom: 20,
          }}
        />

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 14 }}>Loading organizations…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", border: "2px dashed #e2e8f0", borderRadius: 16, padding: "60px 32px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            {orgs.length === 0 ? "No organizations exist yet." : "No organizations match your search."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((org) => (
              <div
                key={org.id}
                style={{
                  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
                  padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{org.name}</div>
                  <div style={{ fontSize: 12.5, color: "#94a3b8" }}>
                    {org.execCount} exec{org.execCount === 1 ? "" : "s"} · {org.memberCount} member{org.memberCount === 1 ? "" : "s"} · created {formatDate(org.createdAt)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => startAdminPreview(org.id, org.name, "exec")}
                    style={{
                      padding: "8px 14px", borderRadius: 8, border: "none", background: "#f97316",
                      color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      transition: "opacity 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    View as Exec
                  </button>
                  <button
                    onClick={() => startAdminPreview(org.id, org.name, "member")}
                    style={{
                      padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "transparent",
                      color: "#0f172a", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  >
                    View as Member
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
