"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Compass,
  FolderKanban,
  House,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Users,
  UserRound,
  X,
  CheckSquare,
} from "lucide-react";

const publicItems = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/communities", label: "Communities" },
  { href: "/about", label: "About" },
];

const workspaceItems = [
  { href: "/workspace", label: "Overview", icon: House },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/teams", label: "My teams", icon: Users },
  { href: "/communities", label: "Communities", icon: BriefcaseBusiness },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "My profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

const appPaths = ["/workspace", "/discover", "/students", "/teams", "/communities", "/projects", "/tasks", "/messages", "/notifications", "/invitations", "/profile", "/settings"];

type SessionUser = { id: number; name: string; avatarUrl?: string | null };

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isAppView = appPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/");
    router.refresh();
    setLoggingOut(false);
  };

  const showSidebar = Boolean(user && isAppView);

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand" aria-label="IntentLink Campus home">
            <span className="brand-mark">IL</span>
            <span className="brand-name">
              <strong>IntentLink</strong>
              <small>Campus</small>
            </span>
          </Link>

          <button
            className="nav-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className={`nav-shell${menuOpen ? " nav-shell-open" : ""}`}>
            <nav className="nav" aria-label="Main navigation">
              {publicItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="nav-actions">
              {user ? (
                <>
                  <Link href="/profile" className="user-chip">
                    <span className="avatar avatar-small">{user.name.slice(0, 1).toUpperCase()}</span>
                    <span>{user.name.split(" ")[0]}</span>
                  </Link>
                  <button className="icon-button" type="button" onClick={handleLogout} disabled={loggingOut} aria-label="Log out" title="Log out">
                    <LogOut size={17} />
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="nav-login" onClick={() => setMenuOpen(false)}>Log in</Link>
                  <Link href="/register" className="button button-primary button-small" onClick={() => setMenuOpen(false)}>Sign up</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={showSidebar ? "workspace-layout" : "public-layout"}>
        {showSidebar && (
          <aside className="workspace-sidebar" aria-label="Workspace navigation">
            <p className="sidebar-label">Workspace</p>
            <nav className="sidebar-nav">
              {workspaceItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={active ? "sidebar-link active" : "sidebar-link"} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}
        <main className={showSidebar ? "main-content main-content-app" : "main-content"}>
          {children}
        </main>
      </div>

      {!showSidebar && (
        <footer className="site-footer">
          <Link href="/" className="footer-brand">IntentLink Campus</Link>
          <span>Build your next idea with people who care about it.</span>
          <div><Link href="/discover">Discover</Link><Link href="/communities">Communities</Link><Link href="/about">About</Link></div>
        </footer>
      )}
    </div>
  );
}
