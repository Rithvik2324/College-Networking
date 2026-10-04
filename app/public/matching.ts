export type Intent =
  | "Hackathon-Ready"
  | "Project-Building"
  | "Startup Exploration"
  | "Learning-Only";

export type Skill =
  | "Frontend"
  | "Backend"
  | "AI/ML"
  | "UI/UX"
  | "Blockchain"
  | "Marketing";

export type Person = {
  id: number;
  name: string;
  intent: Intent;
  skill: Skill;
  availability: number;
  interests?: string[];
};

const intentCompatibility: Record<Intent, Record<Intent, number>> = {
  "Hackathon-Ready": {
    "Hackathon-Ready": 32,
    "Project-Building": 20,
    "Startup Exploration": 14,
    "Learning-Only": 10,
  },
  "Project-Building": {
    "Hackathon-Ready": 18,
    "Project-Building": 32,
    "Startup Exploration": 16,
    "Learning-Only": 12,
  },
  "Startup Exploration": {
    "Hackathon-Ready": 14,
    "Project-Building": 16,
    "Startup Exploration": 30,
    "Learning-Only": 12,
  },
  "Learning-Only": {
    "Hackathon-Ready": 10,
    "Project-Building": 12,
    "Startup Exploration": 12,
    "Learning-Only": 28,
  },
};

const complementaryPairs: Record<Skill, Skill[]> = {
  Frontend: ["Backend", "UI/UX", "AI/ML"],
  Backend: ["Frontend", "AI/ML", "Blockchain"],
  "AI/ML": ["Backend", "Frontend", "Marketing"],
  "UI/UX": ["Frontend", "Marketing", "Backend"],
  Blockchain: ["Backend", "Frontend", "Marketing"],
  Marketing: ["UI/UX", "AI/ML", "Frontend"],
};

const skillScore = (a: Skill, b: Skill) => {
  if (a === b) return 24;
  if (complementaryPairs[a]?.includes(b)) return 20;
  return 8;
};

const availabilityScore = (a: number, b: number) => {
  const gap = Math.abs(a - b);
  return Math.max(0, 32 - gap * 3);
};

const sharedInterestScore = (a: Person, b: Person) => {
  const aSet = new Set(a.interests || []);
  const bSet = new Set(b.interests || []);
  const overlaps = [...aSet].filter((item) => bSet.has(item));
  return overlaps.length * 10;
};

export function scoreCompatibility(a: Person, b: Person) {
  const intentScore = intentCompatibility[a.intent][b.intent] ?? 10;
  const pairSkill = skillScore(a.skill, b.skill);
  const availability = availabilityScore(a.availability, b.availability);
  const interests = sharedInterestScore(a, b);

  const total = Math.min(100, intentScore + pairSkill + availability + interests);
  return Math.round(total);
}

export function getMatchingRecommendations(user: Person, peers: Person[]) {
  return peers
    .filter((peer) => peer.id !== user.id)
    .map((peer) => ({
      ...peer,
      score: scoreCompatibility(user, peer),
      reasons: {
        intent: user.intent === peer.intent ? "Same active goal" : "Different but complementary intent",
        skills: complementaryPairs[user.skill]?.includes(peer.skill)
          ? "Complementary skill fit"
          : "Cross-functional potential",
        availability: `Availability delta: ${Math.abs(user.availability - peer.availability)} hours`,
      },
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
