"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Search, UserPlus, Users } from "lucide-react";
import { SiteShell } from "../components/site-shell";

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
  requestId: number | null;
  requestStatus: string | null;
  requestDirection: string | null;
};

const intentOptions = ["Hackathon-Ready", "Project-Building", "Startup Exploration", "Learning-Only"];

export default function DiscoverPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filters, setFilters] = useState({ q: "", skill: "", interest: "", department: "", year: "", intent: "" });
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");

  const loadStudents = async (values = filters) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
    try {
      const response = await fetch(`/api/students?${params.toString()}`);
      if (response.status === 401) {
        setSignedIn(false);
        setStudents([]);
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load students.");
      setSignedIn(true);
      setStudents(data.students);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadStudents(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const updateRequest = async (student: Student, status?: "accepted" | "rejected") => {
    setError("");
    const response = status && student.requestId
      ? await fetch(`/api/collaboration-requests/${student.requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      : await fetch("/api/collaboration-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiverId: student.id }),
        });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update this request."); return; }
    const requestId = data.request?.id || student.requestId;
    setStudents((current) => current.map((entry) => entry.id === student.id
      ? { ...entry, requestId, requestStatus: status || "pending", requestDirection: status ? "connected" : "sent" }
      : entry));
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadStudents(filters);
  };

  return (
    <SiteShell>
      <section className="page-hero">
        <p className="eyebrow">Student network</p>
        <h1>Find the right people to build with.</h1>
        <p className="page-copy">Search campus profiles by skills, interests, department, and what students want to do next.</p>
      </section>

      <section className="section-card" aria-label="Student filters">
        <form onSubmit={submitSearch} className="toolbar">
          <input className="search-input" aria-label="Search students" placeholder="Search names, bios, or departments" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
          <input className="filter-control" aria-label="Filter by skill" placeholder="Skill" value={filters.skill} onChange={(event) => setFilters((current) => ({ ...current, skill: event.target.value }))} />
          <input className="filter-control" aria-label="Filter by interest" placeholder="Interest" value={filters.interest} onChange={(event) => setFilters((current) => ({ ...current, interest: event.target.value }))} />
          <input className="filter-control" aria-label="Filter by department" placeholder="Department" value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))} />
          <select className="filter-control" aria-label="Filter by year" value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}>
            <option value="">Any year</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option>
          </select>
          <select className="filter-control" aria-label="Filter by intent" value={filters.intent} onChange={(event) => setFilters((current) => ({ ...current, intent: event.target.value }))}>
            <option value="">Any intent</option>{intentOptions.map((intent) => <option key={intent}>{intent}</option>)}
          </select>
          <button className="button button-primary" type="submit"><Search size={16} /> Search</button>
        </form>
      </section>

      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      {!signedIn && !loading ? (
        <section className="empty-state">
          <Users size={25} />
          <h2>Sign in to explore the student network</h2>
          <p>Student profiles are visible to signed-in campus members. Create an account to find collaborators and send requests.</p>
          <div className="form-actions"><Link className="button button-primary" href="/register">Create account <ArrowRight size={15} /></Link><Link className="button button-secondary" href="/login">Log in</Link></div>
        </section>
      ) : loading ? (
        <div className="loading-state" role="status">Loading student profiles...</div>
      ) : students.length === 0 ? (
        <section className="empty-state"><Search size={24} /><h2>No students match these filters</h2><p>Try a broader skill, interest, or department search.</p></section>
      ) : (
        <section className="community-grid" aria-label={`${students.length} student profiles`}>
          {students.map((student) => (
            <article className="student-card" key={student.id}>
              <div className="student-card-head">
                {student.avatarUrl ? <Image className="student-avatar" src={student.avatarUrl} width={40} height={40} unoptimized alt="" /> : <span className="avatar">{student.name.slice(0, 1).toUpperCase()}</span>}
                <div className="student-card-title"><h2>{student.name}</h2><p>{student.department || "Campus member"}{student.yearOfStudy ? ` · Year ${student.yearOfStudy}` : ""}</p></div>
              </div>
              <span className="status-badge">{student.intent}</span>
              <p className="student-bio">{student.bio || "Ready to meet collaborators and try something new."}</p>
              <div className="tag-row">{student.skills.slice(0, 3).map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
              <div className="tag-row tag-row-muted">{student.interests.slice(0, 3).map((interest) => <span className="tag" key={interest}>{interest}</span>)}</div>
              <div className="student-card-footer">
                <span>{student.availability} hrs / week</span>
                <Link className="icon-text-link" href={`/students/${student.id}`}>Profile <ArrowRight size={14} /></Link>
              </div>
              {student.requestStatus === "pending" && student.requestDirection === "received" ? (
                <div className="student-actions"><button className="button button-primary" onClick={() => void updateRequest(student, "accepted")}>Accept</button><button className="button button-secondary" onClick={() => void updateRequest(student, "rejected")}>Decline</button></div>
              ) : student.requestStatus === "accepted" ? (
                <Link className="button button-secondary student-connect" href="/messages">Connected · Message</Link>
              ) : student.requestStatus === "pending" ? (
                <button className="button button-secondary student-connect" disabled><CheckCircle2Icon /> Request pending</button>
              ) : (
                <button className="button button-primary student-connect" onClick={() => void updateRequest(student)}><UserPlus size={15} /> Connect</button>
              )}
            </article>
          ))}
        </section>
      )}
    </SiteShell>
  );
}

function CheckCircle2Icon() {
  return <span aria-hidden="true">✓</span>;
}
