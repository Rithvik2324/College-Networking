"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarClock, MessageCircle, Send, Users } from "lucide-react";
import { SiteShell } from "../../components/site-shell";

type Community = {
  id: number; name: string; goal: string; description: string; intent: string; timeline: string; stage: string;
  ownerId: number; maxMembers: number; isPrivate: boolean; owner: { id: number; name: string };
  members: { userId: number; role: string; user: { id: number; name: string; primarySkill: string; department: string | null } }[];
  tasks: { id: number; title: string; status: string; dueAt: string | null; assigneeId: number | null }[];
};
type Message = { id: number; body: string; createdAt: string; sender: { id: number; name: string } };
type Student = { id: number; name: string; skill: string };

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [inviteeId, setInviteeId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [communityResponse, sessionResponse] = await Promise.all([fetch(`/api/communities/${id}`), fetch("/api/auth/session")]);
      const [communityData, sessionData] = await Promise.all([communityResponse.json(), sessionResponse.json()]);
      if (!communityResponse.ok) throw new Error(communityData.error || "Community not found.");
      const currentUserId = sessionData.user?.id || null;
      setUserId(currentUserId);
      setCommunity(communityData.community);
      const isMember = communityData.community.members.some((member: Community["members"][number]) => member.userId === currentUserId);
      if (isMember) {
        const messageResponse = await fetch(`/api/messages?communityId=${id}`);
        const messageData = await messageResponse.json();
        if (messageResponse.ok) setMessages(messageData.messages);
      }
      if (communityData.community.ownerId === currentUserId) {
        const studentResponse = await fetch("/api/students");
        const studentData = await studentResponse.json();
        if (studentResponse.ok) setStudents(studentData.students.filter((student: Student) => !communityData.community.members.some((member: Community["members"][number]) => member.userId === student.id)));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load community.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);

  const isMember = Boolean(community?.members.some(({ userId: memberId }) => memberId === userId));
  const isOwner = Boolean(community && community.ownerId === userId);
  const isFull = Boolean(community && community.members.length >= community.maxMembers);

  const changeMembership = async () => {
    if (!community) return;
    const response = await fetch(`/api/communities/${id}/membership`, { method: isMember ? "DELETE" : "POST" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update membership."); return; }
    await load();
  };

  const inviteStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch(`/api/communities/${id}/invitations`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteeId: Number(inviteeId) }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not send invitation."); return; }
    setInviteeId("");
    setError("Invitation sent.");
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ communityId: Number(id), text: messageText }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not send message."); return; }
    setMessages((current) => [...current, data.message]);
    setMessageText("");
  };

  const changeStage = async (stage: string) => {
    const response = await fetch(`/api/communities/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update community."); return; }
    setCommunity((current) => current ? { ...current, stage: data.community.stage } : current);
  };

  return (
    <SiteShell>
      {loading ? <div className="loading-state" role="status">Loading team workspace...</div> : !community ? <section className="empty-state"><h2>Community unavailable</h2><p>{error}</p><Link className="button button-secondary" href="/communities"><ArrowLeft size={15} /> Communities</Link></section> : <>
        <Link className="text-link" href="/communities"><ArrowLeft size={15} /> All communities</Link>
        <section className="project-detail-hero">
          <div className="project-detail-heading"><div><span className="status-badge">{community.intent}</span><span className="tag">{community.stage}</span><h1>{community.name}</h1></div>{isOwner && <label className="status-editor">Team stage<select value={community.stage} onChange={(event) => void changeStage(event.target.value)}><option>Create</option><option>Execute</option><option>Complete</option><option>Archive</option></select></label>}</div>
          <p className="community-goal">{community.goal}</p><p>{community.description}</p>
          <div className="project-detail-meta"><span><Users size={16} /> {community.members.length} / {community.maxMembers} members</span><span><CalendarClock size={16} /> {community.timeline}</span><span>Owned by {community.owner.name}</span></div>
          <div className="form-actions">{!isOwner && <button className={isMember ? "button button-secondary" : "button button-primary"} disabled={!isMember && isFull} onClick={() => void changeMembership()}>{isMember ? "Leave team" : isFull ? "Team is full" : "Join team"}</button>}<Link className="button button-secondary" href={`/tasks?communityId=${community.id}`}>Open task board <ArrowRight size={15} /></Link></div>
          {error && <p className="form-message" role="status">{error}</p>}
        </section>

        <div className="profile-columns">
          <section className="profile-section"><div className="section-head"><div><p className="eyebrow">Team roster</p><h2>People working on it</h2></div><span className="tag">Max {community.maxMembers}</span></div>
            <div className="member-list">{community.members.map(({ user, role }) => <article className="member-row" key={user.id}><span className="avatar">{user.name.slice(0, 1)}</span><div><strong>{user.name}</strong><p>{user.primarySkill}{user.department ? ` · ${user.department}` : ""}</p></div><span className="tag">{role}</span></article>)}</div>
            {isOwner && <form className="invite-form" onSubmit={inviteStudent}><label htmlFor="invite-student">Invite a student</label><div className="toolbar"><select id="invite-student" className="filter-control" required value={inviteeId} onChange={(event) => setInviteeId(event.target.value)} disabled={isFull}><option value="">Choose student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.skill}</option>)}</select><button className="button button-primary" disabled={isFull || !inviteeId}>{isFull ? "Team full" : "Send invitation"}</button></div></form>}
          </section>
          <section className="profile-section"><div className="section-head"><div><p className="eyebrow">Tasks</p><h2>Current work</h2></div><Link className="text-link" href={`/tasks?communityId=${community.id}`}>View all <ArrowRight size={14} /></Link></div>
            {community.tasks.length === 0 ? <p className="muted-copy">No tasks have been added to this team.</p> : <div className="task-list">{community.tasks.slice(0, 5).map((task) => <div className="task-row" key={task.id}><span className={task.status === "Completed" ? "task-status task-status-done" : "task-status"} /><div><strong>{task.title}</strong><small>{task.status}{task.dueAt ? ` · Due ${new Date(task.dueAt).toLocaleDateString()}` : ""}</small></div></div>)}</div>}
          </section>
        </div>

        {isMember && <section className="profile-section chat-panel"><div className="section-head"><div><p className="eyebrow">Team conversation</p><h2><MessageCircle size={20} /> Shared messages</h2></div><span className="tag">Refresh to check for new messages</span></div>
          <div className="chat-history" aria-live="polite">{messages.length === 0 ? <div className="empty-state"><MessageCircle size={22} /><h3>Start the conversation</h3><p>Share the next decision, update, or useful link with the team.</p></div> : messages.map((message) => <article className={message.sender.id === userId ? "chat-message chat-message-own" : "chat-message"} key={message.id}><span className="chat-message-author">{message.sender.name} · {new Date(message.createdAt).toLocaleString()}</span><p>{message.body}</p></article>)}</div>
          <form className="chat-composer" onSubmit={sendMessage}><input className="search-input" aria-label="Write a team message" placeholder="Write a message" maxLength={2000} value={messageText} onChange={(event) => setMessageText(event.target.value)} required /><button className="button button-primary" type="submit"><Send size={15} /> Send</button></form>
        </section>}
      </>}
    </SiteShell>
  );
}
