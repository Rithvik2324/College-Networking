import { ArrowRight, Rocket } from "lucide-react";
import Link from "next/link";
import { SiteShell } from "../components/site-shell";

const roadmap = [
  {
    step: "Step 1",
    title: "Seed early builders",
    description: "Start with hackathon teams, project clubs, and startup-minded students who already need coordination.",
  },
  {
    step: "Step 2",
    title: "Run small cohorts",
    description: "Keep the first wave focused on small, high-intent communities so quality becomes visible quickly.",
  },
  {
    step: "Step 3",
    title: "Expand through ambassadors",
    description: "Scale across departments using visible wins, trust, and student-led advocacy.",
  },
];

export default function LaunchPage() {
  return (
    <SiteShell>
      <section className="page-hero panel">
        <p className="eyebrow">Campus Launch</p>
        <h1>How this platform rolls out in a real student ecosystem.</h1>
        <p className="page-copy">
          The launch model starts with high-intent communities and scales with visible student wins rather than broad generic adoption.
        </p>
      </section>

      <section className="section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Rollout</p>
            <h2>Launch in small, high-intent cohorts first.</h2>
          </div>
        </div>

        <div className="roadmap">
          {roadmap.map((item) => (
            <article key={item.step} className="step-card">
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-block cta-panel panel">
        <div>
          <p className="eyebrow">Join the network</p>
          <h2>Enter the network and start collaborating.</h2>
          <p>
            Students can register interest, select a current intent, and join the platform with a college email.
          </p>
        </div>

        <form className="waitlist-form">
          <div className="field">
            <label htmlFor="join-name">Full name</label>
            <input id="join-name" placeholder="Enter your name" />
          </div>
          <div className="field">
            <label htmlFor="join-email">College email</label>
            <input id="join-email" placeholder="name@college.edu" type="email" />
          </div>
          <div className="field">
            <label htmlFor="join-intent">Preferred intent</label>
            <select id="join-intent" defaultValue="Hackathon-Ready">
              <option>Hackathon-Ready</option>
              <option>Project-Building</option>
              <option>Startup Exploration</option>
              <option>Learning-Only</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="button button-primary">
              <Rocket size={16} />
              Join now
            </button>
          </div>
        </form>
      </section>

      <div className="form-actions">
        <Link href="/" className="button button-primary">
          Back home <ArrowRight size={16} />
        </Link>
      </div>
    </SiteShell>
  );
}
