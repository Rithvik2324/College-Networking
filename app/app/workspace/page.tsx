"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, CalendarDays, CheckCircle2, Compass, FolderKanban, Plus, Users } from "lucide-react";
import { SiteShell } from "../components/site-shell";

type User = { id: number; name: string; skill: string; intent: string; onboardingComplete: boolean; college: string | null; department: string | null; yearOfStudy: number | null; interests: string[]; skills: string[]; bio: string };
type Community = { id: number; name: string; goal: string; intent: string; stage: string; memberCount: number; maxMembers: number };
type Task = { id: number; title: string; status: string; dueAt: string | null; community?: { name: string } | null; project?: { title: string } | null };
type Project = { id: number; title: string; category: string; status: string; members: { userId: number }[] };
type Recommendation = { id: number; name: string; skill: string; intent: string; score: number; department?: string | null };
type Notification = { id: number; type: string; message: string; read: boolean; createdAt: string };

export default function WorkspacePage() {
  const [user, setUser] = useState<User | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [invitationCount, setInvitationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [profileResponse, communitiesResponse, tasksResponse, projectsResponse, matchesResponse, notificationsResponse, invitationsResponse] = await Promise.all([
          fetch("/api/profile"), fetch("/api/communities"), fetch("/api/tasks"), fetch("/api/projects"), fetch("/api/match"), fetch("/api/notifications"), fetch("/api/invitations"),
        ]);
        const [profileData, communityData, taskData, projectData, matchData, notificationData, invitationData] = await Promise.all([
          profileResponse.json(), communitiesResponse.json(), tasksResponse.json(), projectsResponse.json(), matchesResponse.json(), notificationsResponse.json(), invitationsResponse.json(),
        ]);
        if (!profileResponse.ok) throw new Error(profileData.error || "Could not load your dashboard.");
        setUser(profileData.user);
        setCommunities((communityData.communities || []).filter((community: Community & { memberIds: number[] }) => community.memberIds.includes(profileData.user.id)));
        setTasks(taskData.tasks || []);
        setProjects(projectData.projects || []);
        setRecommendations(matchData.recommendations || []);
        setNotifications(notificationData.notifications || []);
        setInvitationCount((invitationData.invitations || []).filter((invitation: { status: string }) => invitation.status === "pending").length);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not load your dashboard.");
      } finally { setLoading(false); }
    };
    void load();
  }, []);

  const completion = user ? [user.name, user.college, user.department, user.yearOfStudy, user.bio, user.interests.length, user.skills.length].filter(Boolean).length : 0;
  const completionPercent = Math.round((completion / 7) * 100);
  const upcomingTasks = tasks.filter((task) => task.status !== "Completed").slice(0, 4);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <SiteShell>
      {loading ? <div className="loading-state" role="status">Loading your workspace...</div> : !user ? <section className="empty-state"><h2>Dashboard unavailable</h2><p>{error}</p><Link className="button button-primary" href="/login">Log in</Link></section> : <>
        <section className="dashboard-welcome"><div><p className="eyebrow">Your campus workspace</p><h1>{greeting}, {user.name.split(" ")[0]}.</h1><p>{user.intent} · {user.department || "Student builder"} · {user.skill}</p></div><Link className="button button-primary" href="/discover"><Compass size={16} /> Find collaborators</Link></section>
        {error && <p className="form-message form-message-error" role="alert">{error}</p>}

        {!user.onboardingComplete && <Link className="onboarding-banner" href="/onboarding"><span><strong>Finish setting up your profile</strong><small>Complete onboarding to improve your matches and join the campus network.</small></span><span className="progress-inline"><i style={{ width: `${completionPercent}%` }} /></span><ArrowRight size={17} /></Link>}

        <section className="dashboard-metrics" aria-label="Workspace summary">
          <article className="dashboard-metric"><span className="dashboard-metric-icon"><Users size={17} /></span><div><strong>{communities.length}</strong><span>My teams</span></div></article>
          <article className="dashboard-metric"><span className="dashboard-metric-icon dashboard-metric-coral"><FolderKanban size={17} /></span><div><strong>{projects.filter((project) => project.members.some((member) => member.userId === user.id)).length}</strong><span>Projects</span></div></article>
          <article className="dashboard-metric"><span className="dashboard-metric-icon dashboard-metric-gold"><CalendarDays size={17} /></span><div><strong>{tasks.filter((task) => task.status !== "Completed").length}</strong><span>Open tasks</span></div></article>
          <article className="dashboard-metric"><span className="dashboard-metric-icon dashboard-metric-blue"><Bell size={17} /></span><div><strong>{unreadCount + invitationCount}</strong><span>Needs your attention</span></div></article>
        </section>

        <div className="dashboard-columns">
          <section className="dashboard-section"><div className="section-head"><div><p className="eyebrow">Recommended</p><h2>People to meet</h2></div><Link className="text-link" href="/discover">See all <ArrowRight size={14} /></Link></div>
            {recommendations.length === 0 ? <div className="empty-state"><h3>Add more to your profile</h3><p>Set your interests and skills to get better teammate suggestions.</p><Link className="text-link" href="/profile">Edit profile <ArrowRight size={14} /></Link></div> : <div className="dashboard-people">{recommendations.slice(0, 3).map((person) => <Link className="dashboard-person" href={`/students/${person.id}`} key={person.id}><span className="avatar">{person.name.slice(0, 1)}</span><span className="dashboard-person-info"><strong>{person.name}</strong><small>{person.skill}{person.department ? ` · ${person.department}` : ""}</small></span><span className="match-score">{person.score}%</span></Link>)}</div>}
          </section>

          <section className="dashboard-section"><div className="section-head"><div><p className="eyebrow">Up next</p><h2>Tasks to move forward</h2></div><Link className="text-link" href="/tasks">Task board <ArrowRight size={14} /></Link></div>
            {upcomingTasks.length === 0 ? <div className="empty-state"><CheckCircle2 size={22} /><h3>You’re all caught up</h3><p>New tasks from your teams will show up here.</p></div> : <div className="task-list">{upcomingTasks.map((task) => <article className="task-row" key={task.id}><span className="task-status" /><div><strong>{task.title}</strong><small>{task.community?.name || task.project?.title || "Workspace task"}{task.dueAt ? ` · Due ${new Date(task.dueAt).toLocaleDateString()}` : ` · ${task.status}`}</small></div></article>)}</div>}
          </section>

          <section className="dashboard-section"><div className="section-head"><div><p className="eyebrow">Team spaces</p><h2>Active teams</h2></div><Link className="text-link" href="/teams">My teams <ArrowRight size={14} /></Link></div>
            {communities.length === 0 ? <div className="empty-state"><h3>No teams yet</h3><p>Join a focused group or start one around an idea.</p><Link className="button button-secondary" href="/communities">Explore communities</Link></div> : <div className="dashboard-team-list">{communities.slice(0, 3).map((community) => <Link className="dashboard-team" href={`/communities/${community.id}`} key={community.id}><span className="dashboard-team-mark"><Users size={17} /></span><span><strong>{community.name}</strong><small>{community.stage} · {community.memberCount}/{community.maxMembers} members</small></span><ArrowRight size={15} /></Link>)}</div>}
          </section>

          <section className="dashboard-section"><div className="section-head"><div><p className="eyebrow">Campus ideas</p><h2>Projects in motion</h2></div><Link className="text-link" href="/projects">Explore projects <ArrowRight size={14} /></Link></div>
            {projects.length === 0 ? <div className="empty-state"><h3>Bring an idea to the network</h3><p>Browse open projects and find a place to contribute.</p><Link className="button button-secondary" href="/projects"><Plus size={15} /> Browse projects</Link></div> : <div className="dashboard-project-list">{projects.slice(0, 3).map((project) => <Link className="dashboard-project" href={`/projects/${project.id}`} key={project.id}><span className="status-badge">{project.status}</span><strong>{project.title}</strong><small>{project.category} · {project.members.length} collaborators</small></Link>)}</div>}
          </section>
        </div>

        <section className="dashboard-activity"><div className="section-head"><div><p className="eyebrow">Recent activity</p><h2>Stay in the loop</h2></div><Link className="text-link" href="/notifications">All notifications <ArrowRight size={14} /></Link></div>
          {notifications.length === 0 ? <p className="muted-copy">Team updates and requests will appear here.</p> : <div className="activity-list">{notifications.slice(0, 4).map((notification) => <article className="activity-row" key={notification.id}><span className={notification.read ? "activity-dot" : "activity-dot activity-dot-unread"} /><div><strong>{notification.message}</strong><small>{new Date(notification.createdAt).toLocaleString()}</small></div></article>)}</div>}
        </section>
      </>}
    </SiteShell>
  );
}