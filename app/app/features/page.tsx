import { ArrowRight, CheckCircle2, Compass, Sparkles } from "lucide-react";
import Link from "next/link";
import { SiteShell } from "../components/site-shell";

export default function FeaturesPage() {
  return (
    <SiteShell>
      <section className="page-hero panel">
        <p className="eyebrow">Features</p>
        <h1>Everything students need to move from interest to execution.</h1>
        <p className="page-copy">
          IntentLink Campus is designed to help students define what they want to do, find the right people,
          and manage meaningful work with less chaos and more accountability.
        </p>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <div className="feature-icon"><Compass size={18} /></div>
          <p className="card-label" style={{ color: "#163a55" }}>01. Why students use it</p>
          <h3>No more last-minute team formation.</h3>
          <p>Students discover peers based on intent, skills, and availability instead of waiting for acquaintances to appear.</p>
        </article>

        <article className="feature-card">
          <div className="feature-icon"><Sparkles size={18} /></div>
          <p className="card-label" style={{ color: "#163a55" }}>02. Core experience</p>
          <h3>Intent-first collaboration.</h3>
          <p>Join with a current goal, find a compatible group, assign tasks, and keep momentum visible to everyone.</p>
        </article>

        <article className="feature-card">
          <div className="feature-icon"><CheckCircle2 size={18} /></div>
          <p className="card-label" style={{ color: "#163a55" }}>03. Student profiles</p>
          <h3>Profiles reflect now, not just history.</h3>
          <p>Students update their current intent, skills, and availability so profiles stay relevant and useful.</p>
        </article>
      </section>

      <section className="section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Platform flow</p>
            <h2>A simple sequence from onboarding to execution.</h2>
          </div>
        </div>

        <div className="flow-grid">
          <div className="step-card">
            <span>1. Join</span>
            <h3>Students onboard clearly.</h3>
            <p>Define current intent, primary skills, and weekly availability.</p>
          </div>
          <div className="step-card">
            <span>2. Match</span>
            <h3>Recommendations become actionable.</h3>
            <p>Teams are suggested based on compatibility and execution fit.</p>
          </div>
          <div className="step-card">
            <span>3. Execute</span>
            <h3>Teams assign work and move forward.</h3>
            <p>Tasks, ownership, and milestones keep work visible and accountable.</p>
          </div>
          <div className="step-card">
            <span>4. Archive</span>
            <h3>Inactive groups are cleaned up.</h3>
            <p>Clear lifecycle rules prevent dead communities from lingering in the network.</p>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Network snapshot</p>
            <h2>Designed for meaningful campus collaboration.</h2>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <strong>40+</strong>
            <span>pilot student participants</span>
          </div>
          <div className="metric-card">
            <strong>Fast</strong>
            <span>teammate discovery and matching</span>
          </div>
          <div className="metric-card">
            <strong>Clear</strong>
            <span>ownership and execution workflow</span>
          </div>
          <div className="metric-card">
            <strong>Lower-noise</strong>
            <span>community quality and governance</span>
          </div>
        </div>
      </section>

      <div className="form-actions">
        <Link href="/match" className="button button-primary">
          Try the match engine <ArrowRight size={16} />
        </Link>
      </div>
    </SiteShell>
  );
}
