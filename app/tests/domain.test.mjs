import assert from "node:assert/strict";
import test from "node:test";
import { getMatchingRecommendations, scoreCompatibility } from "../lib/matching.ts";
import { serializeUser } from "../lib/users.ts";

test("matching ranks complementary, intent-aligned collaborators first", () => {
  const student = {
    id: 1,
    name: "Student One",
    intent: "Hackathon-Ready",
    skill: "Backend",
    availability: 10,
    interests: ["Climate", "Accessibility"],
  };
  const strongFit = {
    id: 2,
    name: "Student Two",
    intent: "Hackathon-Ready",
    skill: "Frontend",
    availability: 10,
    interests: ["Climate"],
  };
  const weakFit = {
    id: 3,
    name: "Student Three",
    intent: "Learning-Only",
    skill: "Marketing",
    availability: 30,
    interests: ["Music"],
  };

  assert.ok(scoreCompatibility(student, strongFit) > scoreCompatibility(student, weakFit));
  const recommendations = getMatchingRecommendations(student, [weakFit, strongFit]);
  assert.equal(recommendations[0].id, strongFit.id);
  assert.equal(recommendations[0].reasons.skills, "Complementary skill fit");
});

test("public user serialization never exposes a password hash", () => {
  const user = {
    id: 7,
    name: "Campus Builder",
    email: "builder@college.edu",
    passwordHash: "private-hash",
    role: "student",
    college: "Northstar University",
    department: "Engineering",
    yearOfStudy: 2,
    avatarUrl: null,
    intent: "Project-Building",
    primarySkill: "Backend",
    availability: 8,
    bio: "Likes useful software.",
    onboardingComplete: true,
    onboardingStep: 3,
    notificationsEnabled: true,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    skills: [{ skill: { name: "Backend" } }],
    interests: [{ interest: { name: "Climate" } }],
  };

  const safeUser = serializeUser(user);
  assert.equal(safeUser.skill, "Backend");
  assert.deepEqual(safeUser.skills, ["Backend"]);
  assert.deepEqual(safeUser.interests, ["Climate"]);
  assert.equal("passwordHash" in safeUser, false);
});
