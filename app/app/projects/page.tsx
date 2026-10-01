"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FolderKanban, Plus, Search, Users } from "lucide-react";
import { SiteShell } from "../components/site-shell";

type Project = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  owner: { id: number; name: string; avatarUrl: string | null };
  members: { user: { id: number; name: string; avatarUrl: string | null } }[];
  requiredSkills: { skill: { name: string } }[];
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "Campus life", skills: "" });

  const loadProjects = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    try {
      const response = await fetch(`/api/projects?${params.toString()}`);
      const data = await response.json();
      if (response.status === 401) { setSignedIn(false); setProjects([]); return; }
      if (!response.ok) throw new Error(data.error || "Could not load projects.");
      setSignedIn(true);
      setProjects(data.projects);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load projects.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadProjects(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean) }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not create project."); return; }
    setForm({ title: "", description: "", category: "Campus life", skills: "" });
    setShowCreate(false);
    await loadProjects();
  };

  return (
    <SiteShell>
      <section className="page-hero page-hero-row">
        <div><p className="eyebrow">Project exchange</p><h1>Ideas looking for their next collaborator.</h1><p className="page-copy">Browse active campus work, see who is building, and request a place on the team.</p></div>
        {signedIn && <button className="button button-primary" onClick={() => setShowCreate((visible) => !visible)}><Plus size={16} /> Start a project</button>}
      </section>

      {!signedIn && !loading ? <section className="empty-state"><FolderKanban size={25} /><h2>Join to explore campus projects</h2><p>Sign in to browse teams, request to join a project, or share an idea of your own.</p><Link className="button button-primary" href="/login">Log in <ArrowRight size={15} /></Link></section> : <>
        {showCreate && <section className="section-card project-create-panel"><div className="section-head"><div><p className="eyebrow">New project</p><h2>Put your idea in motion</h2></div></div><form className="form-grid" onSubmit={createProject}>
          <div className="field"><label htmlFor="project-title">Project title</label><input id="project-title" required minLength={3} maxLength={100} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></div>
          <div className="field"><label htmlFor="project-category">Category</label><select id="project-category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}><option>Campus life</option><option>Education</option><option>Climate</option><option>Health</option><option>Creative</option><option>Other</option></select></div>
          <div className="field field-full"><label htmlFor="project-description">What are you building?</label><textarea id="project-description" required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
          <div className="field field-full"><label htmlFor="project-skills">Skills needed</label><input id="project-skills" placeholder="Design, frontend, research" value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} /></div>
          <div className="form-actions field-full"><button className="button button-primary" type="submit">Create project</button><button className="button button-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button></div>
        </form></section>}

        <section className="toolbar project-toolbar" aria-label="Search projects">
          <input className="search-input" aria-label="Search projects" placeholder="Search projects and ideas" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadProjects(); }} />
          <select className="filter-control" aria-label="Filter project category" value={category} onChange={(event) => { setCategory(event.target.value); window.setTimeout(() => void loadProjects(), 0); }}><option value="">All categories</option><option>Campus life</option><option>Education</option><option>Climate</option><option>Health</option><option>Creative</option><option>Other</option></select>
          <button className="button button-secondary" type="button" onClick={() => void loadProjects()}><Search size={15} /> Search</button>
        </section>
        {error && <p className="form-message form-message-error" role="alert">{error}</p>}
        {loading ? <div className="loading-state" role="status">Loading projects...</div> : projects.length === 0 ? <section className="empty-state"><FolderKanban size={24} /><h2>No projects found</h2><p>Try a broader search or start a project to bring an idea to the network.</p></section> : (
          <section className="project-grid" aria-label="Campus projects">{projects.map((project) => <article className="project-card" key={project.id}>
            <div className="project-card-top"><span className="status-badge">{project.status}</span><span className="project-category">{project.category}</span></div>
            <h2>{project.title}</h2><p>{project.description}</p>
            <div className="project-skills">{project.requiredSkills.map(({ skill }) => <span className="tag" key={skill.name}>{skill.name}</span>)}</div>
            <div className="project-card-meta"><span className="avatar-stack">{project.members.slice(0, 4).map(({ user }) => <span className="avatar" title={user.name} key={user.id}>{user.name.slice(0, 1)}</span>)}</span><span><Users size={14} /> {project.members.length} member{project.members.length === 1 ? "" : "s"}</span></div>
            <div className="project-card-footer"><span>Started by {project.owner.name}</span><Link className="icon-text-link" href={`/projects/${project.id}`}>View project <ArrowRight size={14} /></Link></div>
          </article>)}</section>
        )}
      </>}
    </SiteShell>
  );
}
