import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, FolderKanban, Lightbulb, Users } from "lucide-react";
import { SiteShell } from "./components/site-shell";

const features = [
  {
    icon: Compass,
    title: "Find your people",
    description: "Search by skills, interests, department, and the kind of work you want to do.",
  },
  {
    icon: FolderKanban,
    title: "Make progress together",
    description: "Turn a good idea into a project with clear roles, tasks, and momentum.",
  },
  {
    icon: Users,
    title: "Belong to a community",
    description: "Join small, focused campus teams built around shared interests and goals.",
  },
];

const steps = [
  { number: "01", title: "Set your intent", detail: "Share what you want to build, learn, or explore." },
  { number: "02", title: "Meet collaborators", detail: "Find students with complementary skills and energy." },
  { number: "03", title: "Form a small team", detail: "Invite the right people into a focused workspace." },
  { number: "04", title: "Ship something real", detail: "Keep ownership and next steps visible as you go." },
];

export default function Home() {
  return (
    <SiteShell>
      <section className="hero hero-home">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> Made for campus builders</p>
          <h1>Find your people. Make something that matters.</h1>
          <p className="hero-text">
            A better way to meet collaborators, start a team, and turn a campus idea into real work.
          </p>
          <div className="hero-actions">
            <Link href="/register" className="button button-primary">
              Get started <ArrowRight size={16} />
            </Link>
            <Link href="/discover" className="button button-secondary">
              Explore platform <Compass size={16} />
            </Link>
          </div>
          <p className="hero-footnote"><CheckCircle2 size={15} /> Free for students · Built around real collaboration</p>
        </div>

        <div className="hero-board">
          <div className="preview-window" aria-label="Preview of a team workspace">
            <div className="preview-topbar">
              <div className="preview-brand"><span className="preview-mark">IL</span><strong>Workspace</strong></div>
              <span className="preview-live"><i /> Sprint active</span>
            </div>
            <div className="preview-content">
              <div className="preview-heading">
                <div><span className="preview-kicker">YOUR TEAM</span><h2>Sprint Lab Alpha</h2></div>
                <span className="preview-count">4 / 6 members</span>
              </div>
              <p className="preview-description">A campus prototype that helps students find their next team.</p>
              <div className="preview-people" aria-label="Team member avatars">
                <span className="avatar preview-avatar avatar-coral">A</span>
                <span className="avatar preview-avatar avatar-blue">S</span>
                <span className="avatar preview-avatar avatar-gold">I</span>
                <span className="avatar preview-avatar avatar-green">M</span>
                <span className="preview-people-label">+ 2 collaborators</span>
              </div>
              <div className="preview-divider" />
              <div className="preview-task-head"><span>THIS WEEK</span><span>2 of 3 complete</span></div>
              <div className="preview-progress"><span /></div>
              <div className="preview-task"><span className="task-check done"><CheckCircle2 size={15} /></span><span>Map the student journey</span><span className="task-tag">Design</span></div>
              <div className="preview-task"><span className="task-check done"><CheckCircle2 size={15} /></span><span>Build profile matching</span><span className="task-tag">Backend</span></div>
              <div className="preview-task"><span className="task-check" /><span>Test the first team flow</span><span className="task-tag task-tag-due">Today</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block page-intro">
        <div className="section-head">
          <div>
            <p className="eyebrow">From idea to impact</p>
            <h2>Good work starts with the right people.</h2>
          </div>
          <p className="section-note">A simple path from finding collaborators to making progress together.</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article key={step.number} className="step-card step-card-compact">
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <p className="eyebrow">One place to build together</p>
            <h2>Less searching. More making.</h2>
          </div>
          <Link href="/about" className="text-link">See how it works <ArrowRight size={15} /></Link>
        </div>

        <div className="feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="feature-card">
                <div className="feature-icon">
                  <Icon size={18} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="closing-cta">
        <div className="closing-icon"><Lightbulb size={20} /></div>
        <div>
          <p className="eyebrow">Your next project starts here</p>
          <h2>Bring the idea. Find the team.</h2>
        </div>
        <Link href="/register" className="button button-light">Create your profile <ArrowRight size={16} /></Link>
      </section>
    </SiteShell>
  );
}
