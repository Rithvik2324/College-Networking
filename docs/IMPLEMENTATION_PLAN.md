# Implementation Plan

> This is the original migration roadmap. The active implementation and verified progress are tracked in `IMPLEMENTATION_STATUS.md`; do not use this historical plan as a current feature inventory.

## Phase 0 — Repository audit and baseline

Status: completed

Completed:

- Verified the repository is a static frontend with multi-page HTML and JavaScript
- Reviewed the actual pages and browser-based workflows
- Confirmed the app uses `localStorage` for persistence rather than a server or database
- Documented the existing features and limitations in this audit file
- Confirmed there is no existing dependency management or automated test pipeline

Next action:

- Create the production-first architecture plan and migration path for the next implementation phase

## Phase 1 — Foundation and application structure

Planned focus:

- establish a real application shell with routing and layout
- move to a framework-compatible structure (Next.js + TypeScript)
- define shared design tokens and UI primitives
- protect the current brand identity while improving maintainability

Requirements:

- consistent responsive navigation and page sections
- reusable card, button, form, and empty-state components
- error, loading, and empty states for all major flows

## Phase 2 — Domain model and database

Planned focus:

- define normalized entities for users, colleges, departments, skills, communities, tasks, messages, and notifications
- standardize auth and profile data
- add PostgreSQL migrations and Prisma schema
- create seed scripts that do not run in production automatically

Required domain objects:

- User
- StudentProfile
- College
- Department
- Skill
- Community
- Project
- Task
- Notification
- Message
- AuditLog

## Phase 3 — Authentication and onboarding

Planned focus:

- secure registration and login
- institutional email verification
- session management with HTTP-only cookies
- protected route enforcement
- profile completion and intent-based onboarding

Key questions to answer before implementation:

- Which auth flow will be used for student accounts?
- How will institutional domains be verified and managed?
- What is the required college and department taxonomy?

## Phase 4 — Matching engine and discovery

Planned focus:

- replace the current front-end heuristic with a server-side recommendation service
- keep the logic deterministic and explainable
- make weights configurable
- provide score explanations for recommendation outcomes

Suggested initial scoring factors:

- intent compatibility: 30%
- skill complementarity: 25%
- interest match: 15%
- availability compatibility: 15%
- project relevance: 10%
- collaboration preference alignment: 5%

## Phase 5 — Communities, tasks, and execution

Planned focus:

- create robust community lifecycle states
- enforce permission boundaries on the server
- implement task assignment and execution tracking
- support small micro-community operations without clutter

## Phase 6 — Real-time communication and notifications

Planned focus:

- direct messages and community chat
- unread counts and read states
- task and invitation notifications
- real-time updates with server-side authorization

## Phase 7 — Admin and governance

Planned focus:

- role-based access control
- moderation flows
- reporting
- audit logs
- campus analytics from actual records

## Phase 8 — Quality, security, and release readiness

Planned focus:

- validation at all system boundaries
- secure password hashing
- CSRF and session security
- rate limiting and secure uploads
- robust tests before release
- production build and deployment validation

## First small implementation milestone

The next step is not a giant rewrite. It is to prepare the codebase for a production-ready architecture while preserving the existing prototype and product language.

The immediate milestone should include:

1. a real project structure with a framework foundation
2. a shared design system built from the current static UI
3. a Prisma domain model matching the product concept
4. secure auth and onboarding scaffolding
5. a migration plan from `localStorage` to the server-backed data model

This keeps the implementation grounded in what already works while solving the actual scalability and security gaps in the current project.
