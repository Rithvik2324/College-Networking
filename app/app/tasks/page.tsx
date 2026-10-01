"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Search } from "lucide-react";
import { SiteShell } from "../components/site-shell";

type Member = { userId: number; user: { id: number; name: string } };
type Community = { id: number; name: string; members: Member[] };
type Project = { id: number; title: string; members: Member[] };
type Activity = { id: number; action: string; details: string; createdAt: string; actor: { name: string } };
type Task = { id: number; title: string; description: string; status: string; priority: string; dueAt: string | null; community: { id: number; name: string } | null; project: { id: number; title: string } | null; assignee: { id: number; name: string } | null; activities: Activity[] };
const statuses = ["To Do", "In Progress", "Review", "Completed"];

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", assigneeId: "", dueDate: "", priority: "Medium" });

  const load = async () => {
    setLoading(true);
    try {
      const [sessionResponse, communityResponse, projectResponse, taskResponse] = await Promise.all([fetch("/api/auth/session"), fetch("/api/communities"), fetch("/api/projects"), fetch("/api/tasks")]);
      const [sessionData, communityData, projectData, taskData] = await Promise.all([sessionResponse.json(), communityResponse.json(), projectResponse.json(), taskResponse.json()]);
      if (!sessionData.user) { router.replace("/login"); return; }
      const requestedCommunity = new URLSearchParams(window.location.search).get("communityId");
      setUserId(sessionData.user.id);
      const memberCommunities = (communityData.communities || []).filter((community: Community) => community.members.some(({ userId: memberId }) => memberId === sessionData.user.id));
      const memberProjects = (projectData.projects || []).filter((project: Project) => project.members.some(({ userId: memberId }) => memberId === sessionData.user.id));
      setCommunities(memberCommunities);
      setProjects(memberProjects);
      setTasks(taskData.tasks || []);
      setWorkspace((current) => current || (requestedCommunity ? `community:${requestedCommunity}` : "") || (memberCommunities[0] ? `community:${memberCommunities[0].id}` : memberProjects[0] ? `project:${memberProjects[0].id}` : ""));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load tasks.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedCommunity = workspace.startsWith("community:") ? communities.find((entry) => entry.id === Number(workspace.split(":")[1])) : undefined;
  const selectedProject = workspace.startsWith("project:") ? projects.find((entry) => entry.id === Number(workspace.split(":")[1])) : undefined;
  const assignees = selectedCommunity?.members || selectedProject?.members || [];
  const visibleTasks = tasks.filter((task) =>
    (statusFilter === "All" || task.status === statusFilter) &&
    (!query || `${task.title} ${task.description} ${task.community?.name || ""} ${task.project?.title || ""}`.toLowerCase().includes(query.toLowerCase()))
  );

  const createTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const [kind, rawId] = workspace.split(":");
    const body = {
      ...(kind === "community" ? { communityId: Number(rawId) } : { projectId: Number(rawId) }),
      title: form.title,
      description: form.description,
      assigneeId: form.assigneeId ? Number(form.assigneeId) : userId,
      dueDate: form.dueDate || undefined,
      priority: form.priority,
    };
    const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not create task."); return; }
    setForm({ title: "", description: "", assigneeId: "", dueDate: "", priority: "Medium" });
    setShowCreate(false);
    await load();
  };

  const updateTask = async (task: Task, status: string) => {
    const response = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, status }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update task."); return; }
    setTasks((current) => current.map((entry) => entry.id === task.id ? { ...entry, ...data.task } : entry));
  };

  return (
    <SiteShell>
      <section className="page-hero page-hero-row"><div><p className="eyebrow">Execution</p><h1>Tasks keep good ideas moving.</h1><p className="page-copy">A shared list of owners, next steps, and deadlines across your teams and projects.</p></div><button className="button button-primary" onClick={() => setShowCreate((open) => !open)} disabled={!communities.length && !projects.length}><Plus size={16} /> New task</button></section>
      <section className="toolbar task-toolbar"><label className="search-with-icon"><Search size={16} /><input className="search-input" aria-label="Search tasks" placeholder="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select className="filter-control" aria-label="Filter tasks by workspace" value={workspace} onChange={(event) => setWorkspace(event.target.value)}><option value="">Choose a workspace</option>{communities.map((community) => <option key={`community-${community.id}`} value={`community:${community.id}`}>Team · {community.name}</option>)}{projects.map((project) => <option key={`project-${project.id}`} value={`project:${project.id}`}>Project · {project.title}</option>)}</select></section>
      {showCreate && <section className="section-card project-create-panel"><div className="section-head"><div><p className="eyebrow">Add work</p><h2>Create a task</h2></div></div><form className="form-grid" onSubmit={createTask}>
        <div className="field"><label htmlFor="task-title">Task name</label><input id="task-title" required minLength={2} maxLength={140} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></div>
        <div className="field"><label htmlFor="task-priority">Priority</label><select id="task-priority" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
        <div className="field field-full"><label htmlFor="task-description">Description</label><textarea id="task-description" rows={2} maxLength={1000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
        <div className="field"><label htmlFor="task-assignee">Assign to</label><select id="task-assignee" value={form.assigneeId || String(userId || "")} onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value }))}><option value={userId || ""}>Me</option>{assignees.filter(({ userId: memberId }) => memberId !== userId).map(({ user }) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></div>
        <div className="field"><label htmlFor="task-due">Due date</label><input id="task-due" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} /></div>
        <div className="form-actions field-full"><button className="button button-primary" type="submit" disabled={!workspace}>Create task</button><button className="button button-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button></div>
      </form></section>}
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      <div className="task-view-controls"><div className="segmented-control" aria-label="Task status filter">{["All", ...statuses].map((status) => <button type="button" key={status} aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}>{status}</button>)}</div><span className="tag">{visibleTasks.length} tasks</span></div>
      {loading ? <div className="loading-state" role="status">Loading tasks...</div> : visibleTasks.length === 0 ? <section className="empty-state"><CheckCircle2 size={24} /><h2>No tasks in this view</h2><p>Change the filters or add a task to a team or project you belong to.</p></section> : <section className="task-board" aria-label="Your tasks">{visibleTasks.map((task) => <article className="task-card" key={task.id}>
        <div className="task-card-top"><span className={task.status === "Completed" ? "task-status task-status-done" : "task-status"} /><span className="status-badge">{task.status}</span><span className={`priority-tag priority-${task.priority.toLowerCase()}`}>{task.priority}</span></div>
        <h2>{task.title}</h2>{task.description && <p>{task.description}</p>}
        <div className="task-card-meta"><span>{task.community?.name || task.project?.title || "Workspace"}</span><span>{task.assignee ? `Assigned to ${task.assignee.name}` : "Unassigned"}</span>{task.dueAt && <span>Due {new Date(task.dueAt).toLocaleDateString()}</span>}</div>
        <div className="task-card-footer"><label className="status-editor">Status<select value={task.status} onChange={(event) => void updateTask(task, event.target.value)}>{["Backlog", ...statuses].map((status) => <option key={status}>{status}</option>)}</select></label><details className="task-history"><summary>Activity ({task.activities.length})</summary><div>{task.activities.map((activity) => <p key={activity.id}><strong>{activity.actor.name}</strong> {activity.action} · {activity.details}<small>{new Date(activity.createdAt).toLocaleString()}</small></p>)}</div></details></div>
      </article>)}</section>}
    </SiteShell>
  );
}
