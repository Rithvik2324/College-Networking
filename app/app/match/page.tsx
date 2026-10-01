"use client";

import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteShell } from "../components/site-shell";

type Recommendation = {
  id: number;
  name: string;
  skill: string;
  intent: string;
  availability: number;
  score: number;
  reasons: { intent: string; skills: string; availability: string };
};

export default function MatchPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => undefined);

    fetch("/api/match")
      .then((res) => (res.ok ? res.json() : { recommendations: [] }))
      .then((data) => setRecommendations(data.recommendations || []))
      .catch(() => setRecommendations([]));
  }, []);

  return (
    <SiteShell>
      <section className="page-hero panel">
        <p className="eyebrow">Matching Engine</p>
        <h1>Students choose what they want to do and get relevant teammates instantly.</h1>
        <p className="page-copy">
          Matching is based on current intent, complementary skills, availability, and execution alignment.
        </p>
      </section>

      <section className="section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Interactive tool</p>
            <h2>Find your likely team fit.</h2>
          </div>
        </div>

        <div className="metric-grid">
          {recommendations.length === 0 ? (
              <div className="result-card" style={{ gridColumn: "1 / -1" }}>
              <p className="card-label" style={{ color: "#163a55" }}>No recommendations yet</p>
              <p>Log in, complete onboarding, and the system will suggest compatible teammates.</p>
            </div>
          ) : (
            recommendations.map((person) => (
              <div className="result-card" key={person.id}>
                <p className="card-label" style={{ color: "#163a55" }}>Recommended teammate</p>
                <h3><Link href={`/students/${person.id}`}>{person.name}</Link></h3>
                <p>
                  {person.skill} · {person.intent} · {person.availability} hrs/week
                </p>
                <div className="badge" style={{ marginTop: 16 }}>{person.score}% fit</div>
                <ul className="list-check" style={{ marginTop: 12 }}>
                  <li><Star size={16} /> {person.reasons.intent}</li>
                  <li><Star size={16} /> {person.reasons.skills}</li>
                  <li><Star size={16} /> {person.reasons.availability}</li>
                </ul>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="form-actions">
        <Link href="/workspace" className="button button-primary">
          Go to workspace <ArrowRight size={16} />
        </Link>
        {!user && (
          <Link href="/login" className="button button-secondary" style={{ marginLeft: 10 }}>
            Login to personalize suggestions
          </Link>
        )}
      </div>
    </SiteShell>
  );
}
