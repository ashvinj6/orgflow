import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 0 }}>{subtitle}</p>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border, #e2e8f0)", margin: "32px 0" }} />;
}

// ── Single code card ──
function CodeCard({ label, description, code, type, orgId, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [displayCode, setDisplayCode] = useState(code);

  // Keep in sync if parent refreshes
  useEffect(() => setDisplayCode(code), [code]);

  function handleCopy() {
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleRegenerate() {
    if (!confirming) { setConfirming(true); return; }
    const newCode = await onRegenerate(orgId, type);
    if (newCode) setDisplayCode(newCode);
    setConfirming(false);
  }

  const accentColor = type === "exec" ? "#f97316" : "#6366f1";

  return (
    <div
      style={{
        flex: 1,
        background: "var(--bg-card, #fff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: 14,
        padding: "24px",
        minWidth: 0,
      }}
    >
      {/* Label badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 20,
          background: `${accentColor}12`,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>

      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
        {description}
      </p>

      {/* Code display */}
      <div
        style={{
          background: "#f8fafc",
          border: `2px dashed ${accentColor}40`,
          borderRadius: 10,
          padding: "16px 20px",
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "0.22em",
            fontFamily: "monospace",
          }}
        >
          {displayCode}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: "9px 0",
            borderRadius: 8,
            border: "1.5px solid var(--border, #e2e8f0)",
            background: copied ? "#f0fdf4" : "transparent",
            color: copied ? "#16a34a" : "#64748b",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s ease",
          }}
        >
          {copied ? "✓ Copied" : "Copy Code"}
        </button>
        <button
          onClick={handleRegenerate}
          style={{
            flex: 1,
            padding: "9px 0",
            borderRadius: 8,
            border: confirming ? "1.5px solid #ef4444" : "1.5px solid var(--border, #e2e8f0)",
            background: confirming ? "#fef2f2" : "transparent",
            color: confirming ? "#dc2626" : "#94a3b8",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s ease",
          }}
          onBlur={() => setTimeout(() => setConfirming(false), 200)}
        >
          {confirming ? "Confirm Reset" : "Regenerate"}
        </button>
      </div>
      {confirming && (
        <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6, textAlign: "center" }}>
          Old code will stop working immediately.
        </p>
      )}
    </div>
  );
}

// ── Roster row ──
function RosterRow({ name, email, role, badge, badgeColor }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: "1px solid var(--border, #e2e8f0)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: `${badgeColor}18`,
          border: `1.5px solid ${badgeColor}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: badgeColor,
          flexShrink: 0,
          marginRight: 12,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{name}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{email}</div>
      </div>
      {role && (
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            background: `${badgeColor}12`,
            color: badgeColor,
            flexShrink: 0,
          }}
        >
          {role}
        </span>
      )}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div
      style={{
        padding: "32px 20px",
        textAlign: "center",
        color: "#94a3b8",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}

export default function OrgSettings() {
  const { activeOrg, activeOrgId, getOrgCodes, regenerateCode, getOrgRoster, user } = useAuth();
  const [codes, setCodes] = useState(null);
  const [roster, setRoster] = useState({ execs: [], members: [] });

  useEffect(() => {
    if (!activeOrgId) return;
    getOrgCodes(activeOrgId).then(setCodes);
    getOrgRoster(activeOrgId).then(setRoster);
  }, [activeOrgId]);

  async function handleRegenerate(orgId, type) {
    const newCode = await regenerateCode(orgId, type);
    setCodes((prev) => ({
      ...prev,
      [type === "exec" ? "execCode" : "memberCode"]: newCode,
    }));
    return newCode;
  }

  if (!activeOrg || !codes) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>
        Loading organization settings...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#f97316",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          Organization Settings
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: 6,
          }}
        >
          {activeOrg.orgName}
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
          Manage your organization's join codes, view your roster, and configure settings.
        </p>
      </div>

      {/* ── Org Info ── */}
      <div
        style={{
          background: "var(--bg-card, #fff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 14,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "#fff7ed",
            border: "2px solid #f97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 800,
            color: "#f97316",
            flexShrink: 0,
          }}
        >
          {activeOrg.orgName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{activeOrg.orgName}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
            Your role: <strong style={{ color: "#0f172a" }}>{activeOrg.role}</strong>
            &nbsp;·&nbsp;
            <span>
              {roster.execs.length} officer{roster.execs.length !== 1 ? "s" : ""}
            </span>
            &nbsp;·&nbsp;
            <span>
              {roster.members.length} member{roster.members.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── Join Codes ── */}
      <SectionHeader
        title="Join Codes"
        subtitle="Share these codes with the right people. Each code type grants different access."
      />

      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <CodeCard
          label="Exec Join Code"
          description="Share with officers and exec board members. Grants full dashboard access."
          code={codes.execCode}
          type="exec"
          orgId={activeOrgId}
          onRegenerate={handleRegenerate}
        />
        <CodeCard
          label="Member Join Code"
          description="Share with general members. Grants access to the member portal."
          code={codes.memberCode}
          type="member"
          orgId={activeOrgId}
          onRegenerate={handleRegenerate}
        />
      </div>

      <Divider />

      {/* ── Exec Board ── */}
      <SectionHeader
        title="Exec Board"
        subtitle="Officers with full dashboard access to this organization."
      />
      <div
        style={{
          background: "var(--bg-card, #fff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 32,
        }}
      >
        {roster.execs.length === 0 ? (
          <EmptyState icon="◉" text="No exec board members found." />
        ) : (
          roster.execs.map((u) => (
            <RosterRow
              key={u.id}
              name={u.name}
              email={u.email}
              role={u.role}
              badge={u.name}
              badgeColor="#f97316"
            />
          ))
        )}
      </div>

      <Divider />

      {/* ── Members ── */}
      <SectionHeader
        title="Members"
        subtitle="General members who joined with the member code."
      />
      <div
        style={{
          background: "var(--bg-card, #fff)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 40,
        }}
      >
        {roster.members.length === 0 ? (
          <EmptyState icon="🎓" text="No members have joined yet. Share the member join code to get started." />
        ) : (
          roster.members.map((u) => (
            <RosterRow
              key={u.id}
              name={u.name}
              email={u.email}
              badge={u.name}
              badgeColor="#6366f1"
            />
          ))
        )}
      </div>
    </div>
  );
}
