import { useState } from "react";

export default function Sidebar({
  pages,
  currentPage,
  onNavigate,
  open,
  onToggle,
  onLogout,
  user,
  activeOrg,
  onSwitchOrg,
  onAddOrg,
  getOrgJoinCode,
}) {
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [copiedOrgId, setCopiedOrgId] = useState(null);

  const orgs = user?.orgs ?? [];
  const hasMultipleOrgs = orgs.length > 1;

  async function handleCopyCode(orgId, e) {
    e.stopPropagation();
    const code = await getOrgJoinCode?.(orgId);
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedOrgId(orgId);
      setTimeout(() => setCopiedOrgId(null), 1800);
    });
  }

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: open ? 240 : 64,
        background: "var(--bg-sidebar, #0f172a)",
        color: "var(--text-sidebar, #e2e8f0)",
        transition: "width 0.3s ease",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 100,
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: open ? "24px 20px" : "24px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
        onClick={onToggle}
      >
        <img src="/orgflow_logo.png" alt="OrgFlow" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, objectFit: "cover" }} />
        {open && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>OrgFlow</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 1 }}>Student Org Hub</div>
          </div>
        )}
      </div>

      {/* ── Org switcher (only for org accounts) ── */}
      {user?.userType === "org" && activeOrg && (
        <div style={{ position: "relative", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            onClick={() => {
              if (open && (hasMultipleOrgs || onAddOrg)) setOrgDropdownOpen((v) => !v);
            }}
            style={{
              padding: open ? "12px 16px" : "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "space-between" : "center",
              cursor: open && (hasMultipleOrgs || onAddOrg) ? "pointer" : "default",
              userSelect: "none",
            }}
          >
            {open ? (
              <>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 2,
                    }}
                  >
                    Current Org
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#e2e8f0",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 148,
                    }}
                  >
                    {activeOrg.orgName}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{activeOrg.role}</div>
                </div>
                {(hasMultipleOrgs || onAddOrg) && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      transition: "transform 0.15s ease",
                      transform: orgDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      flexShrink: 0,
                    }}
                  >
                    ▾
                  </span>
                )}
              </>
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(249,115,22,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#f97316",
                  flexShrink: 0,
                }}
              >
                {activeOrg.orgName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Dropdown */}
          {open && orgDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 8,
                right: 8,
                background: "#1e293b",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                zIndex: 200,
                overflow: "hidden",
              }}
            >
              {orgs.map((org) => {
                const isActive = org.orgId === activeOrg.orgId;
                return (
                  <div
                    key={org.orgId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 12px",
                      cursor: "pointer",
                      background: isActive ? "rgba(249,115,22,0.12)" : "transparent",
                      transition: "background 0.12s ease",
                    }}
                    onClick={() => {
                      onSwitchOrg?.(org.orgId);
                      setOrgDropdownOpen(false);
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Org initial badge */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: isActive ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.07)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        color: isActive ? "#f97316" : "#94a3b8",
                        flexShrink: 0,
                        marginRight: 10,
                      }}
                    >
                      {org.orgName.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? "#f97316" : "#cbd5e1",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {org.orgName}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{org.role}</div>
                    </div>

                    {/* Copy invite code button */}
                    <button
                      title="Copy invite code"
                      onClick={(e) => handleCopyCode(org.orgId, e)}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        padding: "4px 6px",
                        borderRadius: 5,
                        fontSize: 13,
                        color: copiedOrgId === org.orgId ? "#34d399" : "#475569",
                        flexShrink: 0,
                        transition: "color 0.15s ease",
                      }}
                      onMouseEnter={(e) => { if (copiedOrgId !== org.orgId) e.currentTarget.style.color = "#94a3b8"; }}
                      onMouseLeave={(e) => { if (copiedOrgId !== org.orgId) e.currentTarget.style.color = "#475569"; }}
                    >
                      {copiedOrgId === org.orgId ? "✓" : "⧉"}
                    </button>
                  </div>
                );
              })}

              {/* Divider + Add org */}
              {onAddOrg && (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
                  <div
                    onClick={() => { onAddOrg(); setOrgDropdownOpen(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      cursor: "pointer",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "1.5px dashed #334155",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        color: "#475569",
                        flexShrink: 0,
                      }}
                    >
                      +
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>
                      Add Organization
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Nav Items ── */}
      <div style={{ padding: "12px 8px", flex: 1 }}>
        {Object.entries(pages).map(([key, { label, icon }]) => {
          const active = currentPage === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: open ? "10px 14px" : "10px 0",
                justifyContent: open ? "flex-start" : "center",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? "#fff" : "rgba(255,255,255,0.55)",
                background: active ? "rgba(249,115,22,0.2)" : "transparent",
                marginBottom: 2,
                transition: "all 0.15s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? "rgba(249,115,22,0.2)" : "transparent"; }}
            >
              <span style={{ flexShrink: 0, width: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
              {open && <span>{label}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: open ? "14px 12px" : "14px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {open && user && (
          <div
            style={{
              marginBottom: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#e2e8f0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email}
            </div>
          </div>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: open ? "9px 10px" : "9px 0",
              justifyContent: open ? "flex-start" : "center",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.45)",
              background: "transparent",
              fontFamily: "inherit",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.12)";
              e.currentTarget.style.color = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.45)";
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: "center" }}>⎋</span>
            {open && <span>Log Out</span>}
          </button>
        )}
      </div>
    </nav>
  );
}
