"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  /** Optional className to override default styling */
  className?: string;
  /** Show as icon-only (no label) */
  iconOnly?: boolean;
}

export default function LogoutButton({ className, iconOnly = false }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className}
      style={
        className
          ? undefined
          : {
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: iconOnly ? "8px" : "8px 14px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px",
              color: "#fca5a5",
              fontSize: "13px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "background 0.2s, border-color 0.2s",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }
      }
      onMouseEnter={(e) => {
        if (!className && !loading) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(239, 68, 68, 0.14)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(239, 68, 68, 0.35)";
        }
      }}
      onMouseLeave={(e) => {
        if (!className) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(239, 68, 68, 0.08)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(239, 68, 68, 0.2)";
        }
      }}
      title="Sign out"
    >
      {loading ? (
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          style={{ animation: "spin 0.7s linear infinite" }}
        >
          <circle
            cx="7.5"
            cy="7.5"
            r="6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="28"
            strokeDashoffset="10"
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path
            d="M5.5 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M10 10.5l3-3-3-3M13 7.5H6"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {!iconOnly && (loading ? "Signing out…" : "Sign Out")}
    </button>
  );
}