import Link from "next/link";
import { ArrowRight, Compass, FolderKanban, Users } from "lucide-react";
import { SiteShell } from "../components/site-shell";

const principles = [
  { icon: Compass, title: "Start with intent", copy: "Profiles focus on what students want to do now, not just what they have done before." },
  { icon: Users, title: "Keep teams focused", copy: "Small groups make it easier to set a goal, share ownership, and stay accountable." },
  { icon: FolderKanban, title: "Make progress visible", copy: "Projects and tasks give good ideas a path from first conversation to finished work." },
];

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="about-hero"><p className="eyebrow">About IntentLink</p><h1>Campus collaboration, built around doing.</h1><p>IntentLink helps students find collaborators, form small teams, and turn shared curiosity into useful work.</p><Link className="button button-primary" href="/discover">Explore the network <ArrowRight size={15} /></Link></section>
      <section className="section-block"><div className="section-head"><div><p className="eyebrow">Our approach</p><h2>Better connections lead to better projects.</h2></div></div><div className="feature-grid">{principles.map(({ icon: Icon, title, copy }) => <article className="feature-card" key={title}><span className="feature-icon"><Icon size={18} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
      <section className="closing-cta"><div className="closing-icon"><Users size={20} /></div><div><p className="eyebrow">Ready to build?</p><h2>Meet your next collaborator.</h2></div><Link className="button button-light" href="/register">Create a profile <ArrowRight size={15} /></Link></section>
    </SiteShell>
  );
}
