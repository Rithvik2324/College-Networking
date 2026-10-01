import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SiteShell } from "../components/site-shell";

const rules = [
  "College email verification keeps the network campus-only.",
  "No follower counts or vanity metrics distract from execution goals.",
  "Inactive groups are archived before they become clutter.",
  "Small group sizes keep accountability and clarity high.",
];

export default function RulesPage() {
  return (
    <SiteShell>
      <section className="page-hero panel">
        <p className="eyebrow">Rules + Governance</p>
        <h1>The platform is built to reward execution, not popularity.</h1>
        <p className="page-copy">
          Governance keeps the network useful, low-noise, and focused on meaningful student outcomes.
        </p>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <div className="feature-icon"><ShieldCheck size={18} /></div>
          <p className="card-label" style={{ color: "#163a55" }}>01. Group lifecycle</p>
          <h3>Create → Execute → Complete → Archive</h3>
          <p>Every group follows a clear lifecycle so work stays visible, accountable, and easy to manage.</p>
        </article>

        <article className="feature-card">
          <div className="feature-icon"><ShieldCheck size={18} /></div>
          <p className="card-label" style={{ color: "#163a55" }}>02. Network rules</p>
          <h3>Low-noise collaboration rules</h3>
          <p>Quality control is designed into the student experience from the start, not bolted on later.</p>
        </article>
      </section>

      <section className="section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Platform safeguards</p>
            <h2>Important rules that protect the network.</h2>
          </div>
        </div>

        <ul className="rule-list">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Benefits</p>
            <h2>Students get more clarity and better outcomes.</h2>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <strong>Faster</strong>
            <span>team formation</span>
          </div>
          <div className="metric-card">
            <strong>Higher</strong>
            <span>project follow-through</span>
          </div>
          <div className="metric-card">
            <strong>Cleaner</strong>
            <span>collaboration spaces</span>
          </div>
          <div className="metric-card">
            <strong>More</strong>
            <span>purposeful student connections</span>
          </div>
        </div>
      </section>

      <div className="form-actions">
        <Link href="/launch" className="button button-primary">
          Launch flow <ArrowRight size={16} />
        </Link>
      </div>
    </SiteShell>
  );
}
