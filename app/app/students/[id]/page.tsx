"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CalendarClock, GraduationCap, UserPlus } from "lucide-react";
import { SiteShell } from "../../components/site-shell";

type Student = {
  id: number;
  name: string;
  college: string | null;
  department: string | null;
  yearOfStudy: number | null;
  avatarUrl: string | null;
  intent: string;
  skill: string;
  skills: string[];
  interests: string[];
  availability: number;
  bio: string;
  projects: { id: number; title: string; category: string; status: string }[];
  communities: { id: number; name: string; intent: string }[];
};

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [request, setRequest] = useState<{ id: number; status: string; direction: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/students/${id}`).then(async (response) => ({ ok: response.ok, data: await response.json() })),
      fetch("/api/collaboration-requests").then(async (response) => ({ ok: response.ok, data: await response.json() })),
    ]).then(([profileResult, requestResult]) => {
      if (!profileResult.ok) throw new Error(profileResult.data.error || "Could not load this profile.");
      setStudent(profileResult.data.student);
      if (requestResult.ok) {
        const existing = requestResult.data.requests.find((entry: { senderId: number; receiverId: number }) =>
          (entry.senderId === Number(id) || entry.receiverId === Number(id))
        );
        if (existing) {
          setRequest({
            id: existing.id,
            status: existing.status,
            direction: existing.senderId === Number(id) ? "received" : "sent",
          });
        }
      }
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load this profile."))
      .finally(() => setLoading(false));
  }, [id]);

  const connect = async (status?: "accepted" | "rejected") => {
    if (!student) return;
    const response = status && request
      ? await fetch(`/api/collaboration-requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
      : await fetch("/api/collaboration-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: student.id }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update the request."); return; }
    setRequest({ id: data.request.id, status: status || "pending", direction: status ? "connected" : "sent" });
  };

  return (
    <SiteShell>
      {loading ? <div className="loading-state" role="status">Loading student profile...</div> : error && !student ? (
        <section className="empty-state"><h2>Profile unavailable</h2><p>{error}</p><Link className="button button-secondary" href="/discover"><ArrowLeft size={15} /> Back to discover</Link></section>
      ) : student ? (
        <>
          <Link className="text-link" href="/discover"><ArrowLeft size={15} /> Back to discover</Link>
          <section className="profile-hero">
            <div className="profile-avatar-wrap">{student.avatarUrl ? <Image className="profile-avatar" src={student.avatarUrl} width={104} height={104} unoptimized alt="" /> : <span className="profile-avatar profile-avatar-fallback">{student.name.slice(0, 1).toUpperCase()}</span>}</div>
            <div className="profile-intro">
              <span className="status-badge">{student.intent}</span>
              <h1>{student.name}</h1>
              <p>{student.bio}</p>
              <div className="profile-meta">
                <span><Building2 size={15} />{student.college || "Campus member"}</span>
                <span><GraduationCap size={15} />{student.department || student.skill}{student.yearOfStudy ? ` · Year ${student.yearOfStudy}` : ""}</span>
                <span><CalendarClock size={15} />{student.availability} hrs / week</span>
              </div>
              <div className="profile-actions">
                {request?.status === "accepted" ? <Link href="/messages" className="button button-primary">Message student <ArrowRight size={15} /></Link>
                  : request?.status === "pending" && request.direction === "received" ? <><button className="button button-primary" onClick={() => void connect("accepted")}>Accept request</button><button className="button button-secondary" onClick={() => void connect("rejected")}>Decline</button></>
                  : request?.status === "pending" ? <button className="button button-secondary" disabled>Request pending</button>
                  : <button className="button button-primary" onClick={() => void connect()}><UserPlus size={15} /> Send collaboration request</button>}
              </div>
              {error && <p className="form-message form-message-error" role="alert">{error}</p>}
            </div>
          </section>

          <div className="profile-columns">
            <section className="profile-section">
              <div className="section-head"><div><p className="eyebrow">Skills</p><h2>What they bring</h2></div></div>
              <div className="tag-row">{student.skills.map((skill) => <span className="tag tag-large" key={skill}>{skill}</span>)}</div>
              <p className="profile-section-label">Interested in</p>
              <div className="tag-row">{student.interests.map((interest) => <span className="tag" key={interest}>{interest}</span>)}</div>
            </section>
            <section className="profile-section">
              <div className="section-head"><div><p className="eyebrow">Selected work</p><h2>Projects and teams</h2></div></div>
              {student.projects.length === 0 && student.communities.length === 0 ? <p className="muted-copy">No public projects or teams yet.</p> : <div className="profile-work-list">
                {student.projects.map((project) => <Link className="profile-work-item" href={`/projects/${project.id}`} key={`project-${project.id}`}><span>{project.category}</span><strong>{project.title}</strong><small>{project.status}</small></Link>)}
                {student.communities.map((community) => <Link className="profile-work-item" href={`/communities/${community.id}`} key={`community-${community.id}`}><span>Community · {community.intent}</span><strong>{community.name}</strong><small>View team</small></Link>)}
              </div>}
            </section>
          </div>
        </>
      ) : null}
    </SiteShell>
  );
}
