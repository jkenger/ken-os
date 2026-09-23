import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function WorkspaceShell({
  email,
  active,
  children,
}: {
  email: string;
  active: "resume" | "skills";
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" href="/"><span className="brand-mark">K</span><span>ken<span className="brand-muted">.os</span></span></Link>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav aria-label="Workspace">
          <Link className={`nav-item${active === "resume" ? " active" : ""}`} href="/"><span className="nav-icon">▤</span> Resume hub</Link>
          <Link className={`nav-item${active === "skills" ? " active" : ""}`} href="/skills"><span className="nav-icon">◇</span> Agent skills</Link>
        </nav>
        <div className="sidebar-bottom"><div className="avatar">{email[0]?.toUpperCase()}</div><div className="account"><strong>Personal space</strong><small>{email}</small></div></div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">WORKSPACE <span>/</span> {active === "resume" ? "RESUME HUB" : "AGENT SKILLS"}</div>
          <form action="/api/auth/signout" method="post"><Button variant="ghost" size="sm" className="text-button" type="submit">Sign out ↗</Button></form>
        </header>
        {children}
      </main>
    </div>
  );
}
