"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, CheckCheck } from "lucide-react";
import { SiteShell } from "../components/site-shell";

type Notification = { id: number; type: string; message: string; href: string | null; read: boolean; createdAt: string };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    const response = await fetch("/api/notifications");
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not load notifications.");
    else setNotifications(data.notifications);
    setLoading(false);
  };
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const markAllRead = async () => {
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAll: true }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update notifications."); return; }
    setNotifications((current) => current.map((entry) => ({ ...entry, read: true })));
  };

  const unread = notifications.filter((entry) => !entry.read).length;
  return (
    <SiteShell>
      <section className="page-hero page-hero-row"><div><p className="eyebrow">Your updates</p><h1>Notifications</h1><p className="page-copy">Requests, team updates, assignments, and direct messages in one place.</p></div><button className="button button-secondary" disabled={!unread} onClick={() => void markAllRead()}><CheckCheck size={16} /> Mark all read</button></section>
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status">Loading notifications...</div> : notifications.length === 0 ? (
        <section className="empty-state"><Bell size={24} /><h2>You’re all caught up</h2><p>Updates will appear here as your teams get moving.</p><Link className="button button-primary" href="/discover">Find collaborators <ArrowRight size={15} /></Link></section>
      ) : <section className="notification-list">{notifications.map((notification) => <article className={notification.read ? "notification-row" : "notification-row notification-unread"} key={notification.id}><span className="notification-mark"><Bell size={16} /></span><div className="notification-content"><p>{notification.message}</p><small>{notification.type.replaceAll("-", " ")} · {new Date(notification.createdAt).toLocaleString()}</small></div>{!notification.read && <span className="notification-dot" aria-label="Unread" />}{notification.href && <Link className="icon-text-link" href={notification.href}>Open <ArrowRight size={14} /></Link>}</article>)}</section>}
    </SiteShell>
  );
}