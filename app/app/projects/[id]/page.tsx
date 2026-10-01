"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Users } from "lucide-react";
import { SiteShell } from "../../components/site-shell";

type Project = {
  id: number;
  ownerId: number;
  title: string;
  description: string;
  category: string;
  status: string;
  owner: { id: number; name: string; avatarUrl: string | null };
  members: { userId: number; role: string; user: { id: number; name: string; avatarUrl: string | null; primarySkill: string } }[];
  requiredSkills: { skill: { name: string } }[];
  joinRequests: { id: number; status: string }[];
};

type JoinRequest = { id: number; status: string; message: string; applicant: { id: number; name: string; primarySkill: string; department: string | null } };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [projectResponse, sessionResponse] = await Promise.all([fetch(`/api/projects/${id}`), fetch("/api/auth/session")]);
      const projectData = await projectResponse.json();
      const sessionData = await sessionResponse.json();
      if (!projectResponse.ok) throw new Error(projectData.error || "Project not found.");
      setProject(projectData.project);
      setUserId(sessionData.user?.id || null);
      if (sessionData.user?.id === projectData.project.ownerId) {
        const requestResponse = await fetch(`/api/projects/${id}/requests`);
        const requestData = await requestResponse.json();
        if (requestResponse.ok) setRequests(requestData.requests);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load project.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);

  const updateJoinRequest = async (requestId: number, status: "accepted" | "rejected") => {
    const response = await fetch(`/api/projects/${id}/requests`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update the request."); return; }
    setRequests((current) => current.map((entry) => entry.id === requestId ? { ...entry, status } : entry));
    await load();
  };

  const requestToJoin = async () => {
    const response = await fetch(`/api/projects/${id}/requests`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not request to join."); return; }
    await load();
  };

  const updateStatus = async (status: string) => {
    const response = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update the project."); return; }
    setProject((current) => current ? { ...current, status: data.project.status } : current);
  };

  const isOwner = Boolean(project && userId === project.ownerId);
  const isMember = Boolean(project?.members.some(({ userId: memberId }) => memberId === userId));
  const ownRequest = project?.joinRequests[0];

  return (
    <SiteShell>
      {loading ? <div className="loading-state" role="status">Loading project...</div> : !project ? <section className="empty-state"><h2>Project unavailable</h2><p>{error}</p><Link className="button button-secondary" href="/projects"><ArrowLeft size={15} /> Projects</Link></section> : <>
        <Link className="text-link" href="/projects"><ArrowLeft size={15} /> All projects</Link>
        <section className="project-detail-hero">
          <div className="project-detail-heading"><div><span className="status-badge">{project.status}</span><span className="tag">{project.category}</span><h1>{project.title}</h1></div>{isOwner && <label className="status-editor">Project status<select value={project.status} onChange={(event) => void updateStatus(event.target.value)}><option>Idea</option><option>Looking for teammates</option><option>Building</option><option>Launched</option><option>Paused</option></select></label>}</div>
          <p>{project.description}</p>
          <div className="project-detail-meta"><span><Users size={16} /> {project.members.length} collaborators</span><span><Clock3 size={16} /> Started by {project.owner.name}</span></div>
          <div className="tag-row">{project.requiredSkills.map(({ skill }) => <span className="tag tag-large" key={skill.name}>{skill.name}</span>)}</div>
          <div className="project-member-row"><strong>Team</strong><div className="project-member-list">{project.members.map(({ user }) => <Link key={user.id} href={`/students/${user.id}`} className="member-pill"><span className="avatar avatar-small">{user.name.slice(0, 1)}</span><span>{user.name}</span><small>{user.primarySkill}</small></Link>)}</div></div>
          {!isOwner && (isMember ? <Link className="button button-primary" href="/tasks">Open team tasks <ArrowRight size={15} /></Link> : ownRequest?.status === "pending" ? <button className="button button-secondary" disabled><Clock3 size={15} /> Request pending</button> : ownRequest?.status === "accepted" ? <button className="button button-secondary" disabled><Check size={15} /> Request accepted</button> : <button className="button button-primary" onClick={() => void requestToJoin()}>Request to join <ArrowRight size={15} /></button>)}
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
        </section>
        {isOwner && <section className="section-card"><div className="section-head"><div><p className="eyebrow">Project requests</p><h2>Students asking to join</h2></div></div>{requests.length === 0 ? <div className="empty-state"><h3>No requests yet</h3><p>New applications will show up here.</p></div> : <div className="request-list">{requests.map((request) => <article className="request-row" key={request.id}><span className="avatar">{request.applicant.name.slice(0, 1)}</span><div><strong>{request.applicant.name}</strong><p>{request.applicant.primarySkill}{request.applicant.department ? ` · ${request.applicant.department}` : ""}</p></div><span className="tag">{request.status}</span>{request.status === "pending" && <div className="request-actions"><button className="button button-primary button-small" onClick={() => void updateJoinRequest(request.id, "accepted")}>Accept</button><button className="button button-secondary button-small" onClick={() => void updateJoinRequest(request.id, "rejected")}>Decline</button></div>}</article>)}</div>}</section>}
      </>}
    </SiteShell>
  );
}
