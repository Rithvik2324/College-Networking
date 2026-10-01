"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Plus, Search, Users } from "lucide-react";
import { SiteShell } from "../components/site-shell";

type Community = {
  id: number;
  name: string;
  goal: string;
  description: string;
  intent: string;
  timeline: string;
  stage: string;
  ownerId: number;
  memberIds: number[];
  memberCount: number;
  maxMembers: number;
  isPrivate: boolean;
  owner: { id: number; name: string; avatarUrl: string | null };
  members: { userId: number; user: { id: number; name: string; avatarUrl: string | null } }[];
};

const intents = ["Hackathon-Ready", "Project-Building", "Startup Exploration", "Learning-Only"];

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", goal: "", intent: "Project-Building", description: "" });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/communities");
      const data = await response.json();
      if (response.status === 401) { setSignedIn(false); setCommunities([]); return; }
      if (!response.ok) throw new Error(data.error || "Could not load communities.");
      setSignedIn(true);
      setUserId(data.user.id);
      setCommunities(data.communities);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load communities.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleCommunities = useMemo(() => communities.filter((community) =>
    (!intent || community.intent === intent) &&
    (!query || `${community.name} ${community.goal} ${community.description}`.toLowerCase().includes(query.toLowerCase()))
  ), [communities, intent, query]);

  const createCommunity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not create team."); return; }
    setForm({ name: "", goal: "", intent: "Project-Building", description: "" });
    setShowCreate(false);
    await load();
  };

  const changeMembership = async (community: Community) => {
    const member = community.memberIds.includes(userId || -1);
    const response = await fetch(`/api/communities/${community.id}/membership`, { method: member ? "DELETE" : "POST" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update team membership."); return; }
    await load();
  };

  return (
    <SiteShell>
      <section className="page-hero page-hero-row">
        <div><p className="eyebrow">Campus communities</p><h1>Small teams. Shared momentum.</h1><p className="page-copy">Join a focused community or start one around a goal you care about. Every team has room for up to six students.</p></div>
        {signedIn && <div className="hero-actions-inline"><Link className="button button-secondary" href="/invitations">Team invitations <ArrowRight size={15} /></Link><button className="button button-primary" onClick={() => setShowCreate((open) => !open)}><Plus size={16} /> Create community</button></div>}
      </section>

      {!signedIn && !loading ? <section className="empty-state"><Users size={25} /><h2>Sign in to see campus communities</h2><p>Community membership and private team details are available to signed-in students.</p><div className="form-actions"><Link className="button button-primary" href="/register">Sign up</Link><Link className="button button-secondary" href="/login">Log in</Link></div></section> : <>
        {showCreate && <section className="section-card project-create-panel"><div className="section-head"><div><p className="eyebrow">Create a community</p><h2>Start with a clear shared goal</h2></div></div><form className="form-grid" onSubmit={createCommunity}>
          <div className="field"><label htmlFor="community-name">Name</label><input id="community-name" required minLength={3} maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
          <div className="field"><label htmlFor="community-intent">Intent</label><select id="community-intent" value={form.intent} onChange={(event) => setForm((current) => ({ ...current, intent: event.target.value }))}>{intents.map((value) => <option key={value}>{value}</option>)}</select></div>
          <div className="field field-full"><label htmlFor="community-goal">Team goal</label><input id="community-goal" required minLength={5} maxLength={240} value={form.goal} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} /></div>
          <div className="field field-full"><label htmlFor="community-description">A little more about it</label><textarea id="community-description" rows={3} maxLength={1000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
          <div className="form-actions field-full"><button className="button button-primary" type="submit">Create team</button><button className="button button-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button></div>
        </form></section>}

        <section className="toolbar" aria-label="Filter communities"><label className="search-with-icon"><Search size={16} /><input className="search-input" aria-label="Search communities" placeholder="Search teams and goals" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select className="filter-control" aria-label="Filter by intent" value={intent} onChange={(event) => setIntent(event.target.value)}><option value="">All intents</option>{intents.map((value) => <option key={value}>{value}</option>)}</select></section>
        {error && <p className="form-message form-message-error" role="alert">{error}</p>}
        {loading ? <div className="loading-state" role="status">Loading communities...</div> : visibleCommunities.length === 0 ? <section className="empty-state"><BriefcaseBusiness size={24} /><h2>No communities match</h2><p>Try a different search or start a team with a clear goal.</p></section> : <section className="community-grid" aria-label="Campus communities">{visibleCommunities.map((community) => {
          const joined = community.memberIds.includes(userId || -1);
          const full = community.memberCount >= community.maxMembers;
          return <article className="community-card community-feature-card" key={community.id}>
            <div className="community-card-meta"><span className="status-badge">{community.intent}</span><span className="community-stage">{community.stage}</span></div>
            <h2>{community.name}</h2><p>{community.goal}</p>
            <div className="community-card-members"><span className="avatar-stack">{community.members.slice(0, 4).map(({ user }) => <span className="avatar" title={user.name} key={user.id}>{user.name.slice(0, 1)}</span>)}</span><span>{community.memberCount} / {community.maxMembers} members</span></div>
            <div className="community-card-footer"><Link className="icon-text-link" href={`/communities/${community.id}`}>Open team <ArrowRight size={14} /></Link>{joined ? community.ownerId === userId ? <span className="tag">Owner</span> : <button className="button button-secondary button-small" onClick={() => void changeMembership(community)}>Leave</button> : <button className="button button-primary button-small" disabled={full} onClick={() => void changeMembership(community)}>{full ? "Team full" : "Join team"}</button>}</div>
          </article>;
        })}</section>}
      </>}
    </SiteShell>
  );
}
