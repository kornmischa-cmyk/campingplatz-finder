"use client";

import { ReactNode } from "react";

export function Chip({
  active,
  activeColor = "var(--accent-green)",
  onClick,
  children,
  className = "",
}: {
  active?: boolean;
  activeColor?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-[5px] rounded-full px-3 py-1.5 text-xs whitespace-nowrap border cursor-pointer select-none ${className}`}
      style={
        active
          ? {
              background: activeColor,
              borderColor: activeColor,
              color: "#161b18",
              fontWeight: 700,
            }
          : {
              borderColor: "var(--border)",
              color: "var(--text-dim)",
              background: "transparent",
            }
      }
    >
      {children}
    </button>
  );
}

export function RowButton({
  onClick,
  children,
  variant = "outline",
  href,
  className = "",
}: {
  onClick?: () => void;
  children: ReactNode;
  variant?: "solid" | "outline" | "danger" | "outline-accent";
  href?: string;
  className?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    solid: { background: "var(--accent)", color: "#161b18" },
    outline: { border: "1px solid var(--border)", color: "var(--text-hi)" },
    danger: { border: "1px solid var(--danger)", color: "var(--danger)" },
    "outline-accent": { border: "1px solid var(--accent)", color: "var(--accent)" },
  };

  const base = `rounded-xl text-center p-3 text-[13px] font-semibold cursor-pointer block ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={base}
        style={{ ...styles[variant], textDecoration: "none" }}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${base} w-full`} style={styles[variant]}>
      {children}
    </button>
  );
}
