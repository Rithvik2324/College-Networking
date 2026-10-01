"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { SiteShell } from "../components/site-shell";

type Community = { id: number; name: string; goal: string; intent: string; stage: string; ownerId: number; memberIds: number[]; memberCount: number; maxMembers: number };
type Invitation = { id: number; status: string; community: { id: number; name: string; goal: string; maxMembers: number; _count: { members: number } }; inviter: { id: number; name: string } };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Community[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [sessionResponse, communitiesResponse, invitationsResponse] = await Promise.all([fetch("/api/auth/session"), fetch("/api/communities"), fetch("/api/invitations")]);
    const [session, communityData, inviteData] = await Promise.all([sessionResponse.json(), communitiesResponse.json(), invitationsResponse.json()]);
    if (!session.user) { setError("Sign in to see your teams."); setLoading(false); return; }
    setUserId(session.user.id);
    setTeams((communityData.communities || []).filter((community: Community) => community.memberIds.includes(session.user.id)));
    setInvitations((inviteData.invitations || []).filter((invitation: Invitation) => invitation.status === "pending"));
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const respond = async (id: number, status: "accepted" | "rejected") => {
    const response = await fetch(`/api/invitations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not respond to invitation."); return; }
    await load();
  };

  return (
    <SiteShell>
      <section className="page-hero"><p className="eyebrow">Your collaboration</p><h1>My teams</h1><p className="page-copy">Keep up with the people and goals you’ve committed to.</p></section>
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status">Loading your teams...</div> : <>
        <section className="section-card"><div className="section-head"><div><p className="eyebrow">Invitations</p><h2>Teams that want you in</h2></div><Link className="text-link" href="/communities">Find a team <ArrowRight size={14} /></Link></div>
          {invitations.length === 0 ? <div className="empty-state"><h3>No pending invitations</h3><p>Invitations from community owners will appear here.</p></div> : <div className="request-list">{invitations.map((invitation) => <article className="request-row" key={invitation.id}><span className="avatar">{invitation.community.name.slice(0, 1)}</span><div><strong>{invitation.community.name}</strong><p>Invited by {invitation.inviter.name} · {invitation.community._count.members}/{invitation.community.maxMembers} members</p></div><div className="request-actions"><button className="button button-primary button-small" onClick={() => void respond(invitation.id, "accepted")}>Accept</button><button className="button button-secondary button-small" onClick={() => void respond(invitation.id, "rejected")}>Decline</button></div></article>)}</div>}
        </section>
        <section className="section-card"><div className="section-head"><div><p className="eyebrow">Active collaboration</p><h2>Teams you belong to</h2></div><span className="tag">{teams.length} teams</span></div>
          {teams.length === 0 ? <div className="empty-state"><Users size={24} /><h3>Your first team is waiting</h3><p>Explore communities to find a focused group, or start one around your idea.</p><Link className="button button-primary" href="/communities">Explore communities <ArrowRight size={15} /></Link></div> : <div className="community-grid">{teams.map((team) => <Link className="community-card community-feature-card" href={`/communities/${team.id}`} key={team.id}><div className="community-card-meta"><span className="status-badge">{team.intent}</span><span className="community-stage">{team.stage}</span></div><h2>{team.name}</h2><p>{team.goal}</p><div className="community-card-footer"><span>{team.memberCount}/{team.maxMembers} members · {team.ownerId === userId ? "Owner" : "Member"}</span><ArrowRight size={15} /></div></Link>)}</div>}
        </section>
      </>}
    </SiteShell>
  );
}
