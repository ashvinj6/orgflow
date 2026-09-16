export default function AdminPreviewBar({ orgName, viewAs, onExit }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        zIndex: 2000,
        background: "#f97316",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <span>
        👁 Admin Preview — viewing <strong>{orgName}</strong> as {viewAs === "exec" ? "an Exec" : "a Member"} (read-only)
      </span>
      <button
        onClick={onExit}
        style={{
          padding: "4px 12px",
          borderRadius: 6,
          border: "1.5px solid rgba(255,255,255,0.6)",
          background: "rgba(0,0,0,0.12)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.25)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.12)")}
      >
        Exit Preview
      </button>
    </div>
  );
}
