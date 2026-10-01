const STORAGE_KEY = "intentlink-platform-state";
const WAITLIST_KEY = "intentlink-waitlist";

const seedStudents = [
  { id: 1, name: "Aarav", email: "aarav@college.edu", intent: "Hackathon-Ready", skill: "Backend", availability: 12, verified: true, lastActiveDays: 0 },
  { id: 2, name: "Saanvi", email: "saanvi@college.edu", intent: "Hackathon-Ready", skill: "UI/UX", availability: 9, verified: true, lastActiveDays: 1 },
  { id: 3, name: "Ishaan", email: "ishaan@college.edu", intent: "Project-Building", skill: "Frontend", availability: 10, verified: true, lastActiveDays: 2 },
  { id: 4, name: "Meera", email: "meera@college.edu", intent: "Project-Building", skill: "AI/ML", availability: 11, verified: true, lastActiveDays: 0 },
  { id: 5, name: "Vihaan", email: "vihaan@college.edu", intent: "Startup Exploration", skill: "Marketing", availability: 8, verified: true, lastActiveDays: 4 },
  { id: 6, name: "Anika", email: "anika@college.edu", intent: "Startup Exploration", skill: "Backend", availability: 13, verified: true, lastActiveDays: 1 },
  { id: 7, name: "Riya", email: "riya@college.edu", intent: "Learning-Only", skill: "Frontend", availability: 6, verified: true, lastActiveDays: 3 },
  { id: 8, name: "Karthik", email: "karthik@college.edu", intent: "Learning-Only", skill: "Blockchain", availability: 7, verified: true, lastActiveDays: 5 },
  { id: 9, name: "Dev", email: "dev@college.edu", intent: "Hackathon-Ready", skill: "AI/ML", availability: 14, verified: true, lastActiveDays: 0 },
  { id: 10, name: "Nisha", email: "nisha@college.edu", intent: "Project-Building", skill: "UI/UX", availability: 10, verified: true, lastActiveDays: 2 }
];

const seedGroups = [
  {
    id: 101,
    name: "Sprint Lab Alpha",
    goal: "Build a hackathon-ready campus collaboration prototype",
    intent: "Hackathon-Ready",
    timeline: "1 Week",
    ownerId: 1,
    memberIds: [1, 2, 9],
    stage: "Execute",
    lastActiveDays: 1
  },
  {
    id: 102,
    name: "Build Circle Studio",
    goal: "Ship a working project collaboration portal for campus clubs",
    intent: "Project-Building",
    timeline: "2 Weeks",
    ownerId: 3,
    memberIds: [3, 4, 10],
    stage: "Create",
    lastActiveDays: 2
  },
  {
    id: 103,
    name: "Peer Lab Commons",
    goal: "Run a beginner-friendly learning cohort around web and blockchain",
    intent: "Learning-Only",
    timeline: "1 Month",
    ownerId: 7,
    memberIds: [7, 8],
    stage: "Complete",
    lastActiveDays: 8
  }
];

const seedTasks = [
  { id: 301, groupId: 101, title: "Finalize landing page flow", assigneeId: 2, done: true },
  { id: 302, groupId: 101, title: "Connect matching logic to profiles", assigneeId: 1, done: false },
  { id: 303, groupId: 102, title: "Define sprint milestones", assigneeId: 10, done: false },
  { id: 304, groupId: 103, title: "Prepare learning track resources", assigneeId: 8, done: true }
];

const seedActivity = [
  "Pilot network initialized with verified campus members.",
  "Sprint Lab Alpha moved into execution stage.",
  "Learning cohort completed its first cycle and can now be archived."
];

const groupNames = {
  "Hackathon-Ready": "Sprint Lab Alpha",
  "Project-Building": "Build Circle Studio",
  "Startup Exploration": "Venture Pod Nexus",
  "Learning-Only": "Peer Lab Commons"
};

const groupDescriptions = {
  "Hackathon-Ready": "A fast-moving micro-community optimized for short deadlines, complementary tech skills, and rapid demo delivery.",
  "Project-Building": "A balanced build team focused on consistent weekly progress, clear responsibilities, and completion discipline.",
  "Startup Exploration": "A discovery-driven group that blends product, technical, and validation thinking before full commitment.",
  "Learning-Only": "A low-pressure cohort for guided exploration, peer support, and skill-building before joining higher-intensity teams."
};

const suggestedTaskLibrary = {
  "Hackathon-Ready": "Prepare final hackathon pitch and demo flow",
  "Project-Building": "Break the project into milestone-based deliverables",
  "Startup Exploration": "Interview 5 target users and summarize insights",
  "Learning-Only": "Plan next peer-learning session and reading list"
};

const intentOrder = ["Hackathon-Ready", "Project-Building", "Startup Exploration", "Learning-Only"];

let selectedTaskGroupId = null;
let state = loadState();

const matcherForm = document.querySelector("#matcher-form");
const studentNameInput = document.querySelector("#student-name");
const intentSelect = document.querySelector("#intent-select");
const skillSelect = document.querySelector("#skill-select");
const availabilityRange = document.querySelector("#availability-range");
const availabilityValue = document.querySelector("#availability-value");
const teammateList = document.querySelector("#teammate-list");
const groupName = document.querySelector("#group-name");
const groupSummary = document.querySelector("#group-summary");
const compatibilityBadge = document.querySelector("#compatibility-badge");

const studentForm = document.querySelector("#student-form");
const studentFormMessage = document.querySelector("#student-form-message");
const groupForm = document.querySelector("#group-form");
const groupFormMessage = document.querySelector("#group-form-message");
const directoryIntentFilter = document.querySelector("#directory-intent-filter");
const studentDirectory = document.querySelector("#student-directory");
const groupBoard = document.querySelector("#group-board");
const groupOwnerSelect = document.querySelector("#group-owner");
const taskGroupSelect = document.querySelector("#task-group-select");
const taskAssigneeSelect = document.querySelector("#task-assignee");
const taskBoard = document.querySelector("#task-board");
const taskForm = document.querySelector("#task-form");
const taskFormMessage = document.querySelector("#task-form-message");
const platformMetrics = document.querySelector("#platform-metrics");
const activityFeed = document.querySelector("#activity-feed");
const archiveInactiveButton = document.querySelector("#archive-inactive");
const addSuggestedTaskButton = document.querySelector("#add-suggested-task");

const waitlistForm = document.querySelector("#waitlist-form");
const waitlistMessage = document.querySelector("#waitlist-message");

const navToggle = document.querySelector("#nav-toggle");
const topbar = document.querySelector(".topbar");

function createInitialState() {
  return {
    students: seedStudents,
    groups: seedGroups,
    tasks: seedTasks,
    activity: seedActivity,
    counters: { student: 11, group: 104, task: 305 }
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initial = createInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(saved);
  } catch {
    const initial = createInitialState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addActivity(message) {
  state.activity.unshift(message);
  state.activity = state.activity.slice(0, 10);
  saveState();
}

function getStudentById(id) {
  return state.students.find((student) => student.id === id);
}

function getGroupById(id) {
  return state.groups.find((group) => group.id === id);
}

function setMessage(element, text, type = "") {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.classList.remove("is-success", "is-error");

  if (type) {
    element.classList.add(`is-${type}`);
  }
}

function isInstitutionalEmail(email) {
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.(edu|ac\.in|edu\.in)$/i.test(normalized);
}

function updateNavState(isOpen) {
  if (!navToggle || !topbar) {
    return;
  }

  topbar.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
}

function availabilityGapScore(a, b) {
  const gap = Math.abs(a - b);
  return Math.max(0, 30 - gap * 3);
}

function skillScore(userSkill, peerSkill) {
  if (userSkill === peerSkill) {
    return 24;
  }

  const complementaryPairs = {
    Frontend: ["Backend", "UI/UX", "AI/ML"],
    Backend: ["Frontend", "AI/ML", "Blockchain"],
    "AI/ML": ["Backend", "Frontend", "Marketing"],
    "UI/UX": ["Frontend", "Marketing", "Backend"],
    Blockchain: ["Backend", "Frontend", "Marketing"],
    Marketing: ["UI/UX", "AI/ML", "Frontend"]
  };

  return complementaryPairs[userSkill]?.includes(peerSkill) ? 20 : 10;
}

function scorePeer(user, peer) {
  let score = 0;

  if (user.intent === peer.intent) {
    score += 46;
  }

  score += skillScore(user.skill, peer.skill);
  score += availabilityGapScore(user.availability, peer.availability);

  return Math.min(score, 98);
}

function buildTeammateCard(peer, score) {
  const article = document.createElement("article");
  article.className = "teammate-card";
  article.innerHTML = `
    <header>
      <div>
        <strong>${peer.name}</strong>
        <p>${peer.intent} - ${peer.skill}</p>
      </div>
      <div class="badge">${score}% fit</div>
    </header>
    <p>${peer.email}</p>
    <p>${peer.availability} hrs/week available</p>
  `;
  return article;
}

function updateMatches(event) {
  if (event) {
    event.preventDefault();
  }

  if (!studentNameInput || !intentSelect || !skillSelect || !availabilityRange || !teammateList || !groupName || !groupSummary || !compatibilityBadge) {
    return;
  }

  const user = {
    name: studentNameInput.value.trim() || "You",
    intent: intentSelect.value,
    skill: skillSelect.value,
    availability: Number(availabilityRange.value)
  };

  const rankedPeers = state.students
    .map((peer) => ({ peer, score: scorePeer(user, peer) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  teammateList.innerHTML = "";

  rankedPeers.forEach(({ peer, score }) => {
    teammateList.appendChild(buildTeammateCard(peer, score));
  });

  const topScore = rankedPeers[0]?.score ?? 80;
  groupName.textContent = groupNames[user.intent];
  groupSummary.textContent = `${groupDescriptions[user.intent]} Suggested for ${user.name}, with ${user.skill} as the anchor skill and ${user.availability} hrs/week availability.`;
  compatibilityBadge.textContent = `${topScore}% alignment`;
}

function renderOwnerOptions() {
  if (!groupOwnerSelect) {
    return;
  }

  groupOwnerSelect.innerHTML = state.students
    .map((student) => `<option value="${student.id}">${student.name} - ${student.intent}</option>`)
    .join("");
}

function renderTaskGroupOptions() {
  if (!taskGroupSelect || !addSuggestedTaskButton) {
    return;
  }

  const activeGroups = state.groups.filter((group) => group.stage !== "Archive");
  const fallbackGroupId = activeGroups[0]?.id ?? null;
  const nextGroupId = activeGroups.some((group) => group.id === selectedTaskGroupId) ? selectedTaskGroupId : fallbackGroupId;

  taskGroupSelect.innerHTML = activeGroups.length
    ? activeGroups.map((group) => `<option value="${group.id}">${group.name}</option>`).join("")
    : '<option value="">No active groups</option>';

  selectedTaskGroupId = nextGroupId;

  if (selectedTaskGroupId !== null) {
    taskGroupSelect.value = String(selectedTaskGroupId);
  }

  const hasGroups = activeGroups.length > 0;
  taskGroupSelect.disabled = !hasGroups;
  addSuggestedTaskButton.disabled = !hasGroups;
}

function renderTaskAssigneeOptions() {
  if (!taskAssigneeSelect || !taskGroupSelect) {
    return;
  }

  const selectedGroup = getGroupById(Number(taskGroupSelect.value));
  const memberIds = selectedGroup?.memberIds ?? [];
  const options = memberIds
    .map((memberId) => {
      const member = getStudentById(memberId);
      return member ? `<option value="${member.id}">${member.name}</option>` : "";
    })
    .join("");

  taskAssigneeSelect.innerHTML = options || '<option value="">No group members</option>';
  taskAssigneeSelect.disabled = !memberIds.length;
}

function renderStudents() {
  if (!studentDirectory || !directoryIntentFilter) {
    return;
  }

  const intentFilter = directoryIntentFilter.value;
  const students = state.students.filter((student) => intentFilter === "All" || student.intent === intentFilter);

  if (!students.length) {
    studentDirectory.innerHTML = '<div class="empty-state">No students match this intent filter yet. Try another intent or add a new student.</div>';
    return;
  }

  studentDirectory.innerHTML = students
    .map((student) => {
      const groupCount = state.groups.filter((group) => group.memberIds.includes(student.id) && group.stage !== "Archive").length;
      return `
        <article class="directory-card">
          <div class="directory-top">
            <div>
              <h4>${student.name}</h4>
              <p>${student.email}</p>
            </div>
            <span class="intent-chip">${student.intent}</span>
          </div>
          <p>Skill: <strong>${student.skill}</strong></p>
          <p>Availability: <strong>${student.availability} hrs/week</strong></p>
          <p>Active groups: <strong>${groupCount}</strong></p>
          <div class="directory-actions">
            <button class="button button-secondary small" type="button" data-action="cycle-intent" data-student-id="${student.id}">Switch Intent</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderGroups() {
  if (!groupBoard) {
    return;
  }

  if (!state.groups.length) {
    groupBoard.innerHTML = '<div class="empty-state">No communities created yet. Start one from the form above to activate the workspace.</div>';
    return;
  }

  groupBoard.innerHTML = state.groups
    .map((group) => {
      const owner = getStudentById(group.ownerId);
      const members = group.memberIds
        .map((memberId) => getStudentById(memberId))
        .filter(Boolean)
        .map((member) => `<span>${member.name}</span>`)
        .join("");

      const suggestedMembers = state.students
        .filter((student) => student.intent === group.intent && !group.memberIds.includes(student.id))
        .slice(0, 2)
        .map((student) => `
          <button class="button button-secondary small" type="button" data-action="join-group" data-group-id="${group.id}" data-student-id="${student.id}">
            Add ${student.name}
          </button>
        `)
        .join("");

      return `
        <article class="group-card" data-stage="${group.stage}">
          <div class="directory-top">
            <div>
              <h4>${group.name}</h4>
              <p>${group.goal}</p>
            </div>
            <span class="stage-chip">${group.stage}</span>
          </div>
          <p>Intent: <strong>${group.intent}</strong></p>
          <p>Timeline: <strong>${group.timeline}</strong></p>
          <p>Owner: <strong>${owner ? owner.name : "Unknown"}</strong></p>
          <div class="member-list">${members || "<span>No members yet</span>"}</div>
          <div class="group-actions">
            <button class="button button-secondary small" type="button" data-action="advance-stage" data-group-id="${group.id}" ${group.stage === "Archive" ? "disabled" : ""}>${group.stage === "Complete" ? "Move To Archive" : group.stage === "Archive" ? "Archived" : "Advance Stage"}</button>
            <button class="button button-secondary small" type="button" data-action="archive-group" data-group-id="${group.id}">Archive</button>
          </div>
          <div class="group-actions">
            ${suggestedMembers || '<span class="hint-text">No suggested members left for this intent.</span>'}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTasks() {
  if (!taskBoard || !taskGroupSelect || !taskAssigneeSelect || !taskForm) {
    return;
  }

  const selectedGroupId = Number(taskGroupSelect.value);
  const tasks = state.tasks.filter((task) => task.groupId === selectedGroupId);
  const selectedGroup = getGroupById(selectedGroupId);
  const submitButton = taskForm.querySelector("button[type='submit']");

  if (submitButton) {
    submitButton.disabled = !selectedGroup || !taskAssigneeSelect.value;
  }

  taskBoard.innerHTML = !selectedGroup
    ? '<div class="empty-state">Create or reactivate a group to assign tasks here.</div>'
    : tasks.length
    ? tasks
        .map((task) => {
          const assignee = getStudentById(task.assigneeId);
          return `
            <article class="task-card ${task.done ? "done" : ""}">
              <div>
                <strong>${task.title}</strong>
                <p>${assignee ? assignee.name : "Unknown assignee"}</p>
              </div>
              <button class="button button-secondary small" type="button" data-action="toggle-task" data-task-id="${task.id}">
                ${task.done ? "Mark Pending" : "Mark Done"}
              </button>
            </article>
          `;
        })
        .join("")
    : '<div class="empty-state">No tasks yet for this group. Add one to start execution.</div>';
}

function renderMetrics() {
  if (!platformMetrics) {
    return;
  }

  const activeGroups = state.groups.filter((group) => group.stage !== "Archive").length;
  const completedGroups = state.groups.filter((group) => group.stage === "Complete").length;
  const archivedGroups = state.groups.filter((group) => group.stage === "Archive").length;
  const completedTasks = state.tasks.filter((task) => task.done).length;

  platformMetrics.innerHTML = `
    <div><strong>${state.students.length}</strong><span>verified students</span></div>
    <div><strong>${activeGroups}</strong><span>active communities</span></div>
    <div><strong>${completedGroups}</strong><span>completed communities</span></div>
    <div><strong>${archivedGroups}</strong><span>archived groups</span></div>
    <div><strong>${completedTasks}</strong><span>tasks completed</span></div>
    <div><strong>${state.activity.length}</strong><span>recent governance events</span></div>
  `;
}

function renderActivity() {
  if (!activityFeed) {
    return;
  }

  activityFeed.innerHTML = state.activity
    .map((entry) => `<article class="activity-item">${entry}</article>`)
    .join("");
}

function renderWorkspaceApp() {
  if (!studentForm && !groupForm && !studentDirectory && !groupBoard && !taskBoard && !platformMetrics) {
    return;
  }

  renderOwnerOptions();
  renderTaskGroupOptions();
  renderTaskAssigneeOptions();
  renderStudents();
  renderGroups();
  renderTasks();
  renderMetrics();
  renderActivity();
}

function nextIntent(currentIntent) {
  const index = intentOrder.indexOf(currentIntent);
  return intentOrder[(index + 1) % intentOrder.length];
}

function setupWorkspaceEvents() {
  if (studentForm) {
    studentForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = document.querySelector("#new-student-name")?.value.trim() || "";
      const email = document.querySelector("#new-student-email")?.value.trim() || "";
      const intent = document.querySelector("#new-student-intent")?.value || "";
      const skill = document.querySelector("#new-student-skill")?.value || "";
      const availability = Number(document.querySelector("#new-student-availability")?.value);

      if (!name || !email) {
        setMessage(studentFormMessage, "Enter both name and college email before adding a student.", "error");
        return;
      }

      if (!isInstitutionalEmail(email)) {
        setMessage(studentFormMessage, "Use a valid college email ending like .edu, .ac.in, or .edu.in.", "error");
        return;
      }

      if (state.students.some((student) => student.email.toLowerCase() === email.toLowerCase())) {
        setMessage(studentFormMessage, "That student email is already part of the campus network.", "error");
        return;
      }

      state.students.push({
        id: state.counters.student++,
        name,
        email,
        intent,
        skill,
        availability,
        verified: true,
        lastActiveDays: 0
      });

      studentForm.reset();
      setMessage(studentFormMessage, `${name} joined the campus network with ${intent} intent.`, "success");
      addActivity(`${name} completed onboarding and joined the verified student network.`);
      saveState();
      renderWorkspaceApp();
    });
  }

  if (groupForm) {
    groupForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = document.querySelector("#group-title")?.value.trim() || "";
      const goal = document.querySelector("#group-goal")?.value.trim() || "";
      const intent = document.querySelector("#group-intent")?.value || "";
      const timeline = document.querySelector("#group-timeline")?.value || "";
      const ownerId = Number(groupOwnerSelect?.value);

      if (!name || !goal || !ownerId) {
        setMessage(groupFormMessage, "Complete all group details before creating a micro-community.", "error");
        return;
      }

      state.groups.unshift({
        id: state.counters.group++,
        name,
        goal,
        intent,
        timeline,
        ownerId,
        memberIds: [ownerId],
        stage: "Create",
        lastActiveDays: 0
      });

      selectedTaskGroupId = state.groups[0].id;
      groupForm.reset();
      setMessage(groupFormMessage, `${name} was created and is ready for members to join.`, "success");
      addActivity(`${name} was created for ${intent} collaboration.`);
      saveState();
      renderWorkspaceApp();
    });
  }

  if (directoryIntentFilter) {
    directoryIntentFilter.addEventListener("change", renderStudents);
  }

  if (studentDirectory) {
    studentDirectory.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action='cycle-intent']");
      if (!button) {
        return;
      }

      const student = getStudentById(Number(button.dataset.studentId));
      if (!student) {
        return;
      }

      student.intent = nextIntent(student.intent);
      student.lastActiveDays = 0;
      addActivity(`${student.name} switched intent to ${student.intent}.`);
      saveState();
      renderWorkspaceApp();
    });
  }

  if (groupBoard) {
    groupBoard.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      const action = button.dataset.action;
      const group = getGroupById(Number(button.dataset.groupId));
      if (!group) {
        return;
      }

      if (action === "join-group") {
        const studentId = Number(button.dataset.studentId);
        if (!group.memberIds.includes(studentId) && group.memberIds.length < 6) {
          group.memberIds.push(studentId);
          group.lastActiveDays = 0;
          const student = getStudentById(studentId);
          addActivity(`${student?.name || "A student"} joined ${group.name}.`);
        }
      }

      if (action === "advance-stage") {
        const order = ["Create", "Execute", "Complete", "Archive"];
        const nextStage = order[Math.min(order.indexOf(group.stage) + 1, order.length - 1)];
        group.stage = nextStage;
        group.lastActiveDays = 0;
        if (nextStage === "Archive" && selectedTaskGroupId === group.id) {
          selectedTaskGroupId = null;
        }
        addActivity(`${group.name} moved to ${nextStage} stage.`);
      }

      if (action === "archive-group") {
        group.stage = "Archive";
        if (selectedTaskGroupId === group.id) {
          selectedTaskGroupId = null;
        }
        addActivity(`${group.name} was archived to prevent inactive clutter.`);
      }

      saveState();
      renderWorkspaceApp();
    });
  }

  if (taskGroupSelect) {
    taskGroupSelect.addEventListener("change", () => {
      selectedTaskGroupId = Number(taskGroupSelect.value) || null;
      renderTaskAssigneeOptions();
      renderTasks();
    });
  }

  if (taskForm) {
    taskForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const title = document.querySelector("#task-title")?.value.trim() || "";
      const groupId = Number(taskGroupSelect?.value);
      const assigneeId = Number(taskAssigneeSelect?.value);

      if (!title || !groupId || !assigneeId) {
        setMessage(taskFormMessage, "Choose an active group, an assignee, and a task title before assigning work.", "error");
        return;
      }

      state.tasks.unshift({
        id: state.counters.task++,
        groupId,
        title,
        assigneeId,
        done: false
      });

      const group = getGroupById(groupId);
      if (group) {
        group.lastActiveDays = 0;
      }

      addActivity(`Task added to ${group?.name || "selected group"} for execution tracking.`);
      taskForm.reset();
      setMessage(taskFormMessage, `Task assigned inside ${group?.name || "the selected group"}.`, "success");
      saveState();
      renderWorkspaceApp();
    });
  }

  if (taskBoard) {
    taskBoard.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action='toggle-task']");
      if (!button) {
        return;
      }

      const task = state.tasks.find((item) => item.id === Number(button.dataset.taskId));
      if (!task) {
        return;
      }

      task.done = !task.done;
      const group = getGroupById(task.groupId);
      addActivity(`${task.title} in ${group?.name || "group"} was marked ${task.done ? "done" : "pending"}.`);
      saveState();
      renderWorkspaceApp();
    });
  }

  if (archiveInactiveButton) {
    archiveInactiveButton.addEventListener("click", () => {
      let archivedCount = 0;

      state.groups.forEach((group) => {
        group.lastActiveDays += 3;
        if (group.lastActiveDays >= 7 && group.stage !== "Archive") {
          group.stage = "Archive";
          if (selectedTaskGroupId === group.id) {
            selectedTaskGroupId = null;
          }
          archivedCount += 1;
        }
      });

      addActivity(
        archivedCount
          ? `${archivedCount} inactive groups were archived automatically by governance rules.`
          : "Governance check completed. No additional groups needed archiving."
      );
      saveState();
      renderWorkspaceApp();
    });
  }

  if (addSuggestedTaskButton) {
    addSuggestedTaskButton.addEventListener("click", () => {
      const group = getGroupById(Number(taskGroupSelect?.value));
      if (!group || !group.memberIds.length) {
        setMessage(taskFormMessage, "Create an active group with at least one member before adding suggested work.", "error");
        return;
      }

      const suggestedTask = suggestedTaskLibrary[group.intent];
      const duplicateExists = state.tasks.some(
        (task) => task.groupId === group.id && task.title.toLowerCase() === suggestedTask.toLowerCase()
      );

      if (duplicateExists) {
        setMessage(taskFormMessage, "That suggested task already exists for this group.", "error");
        return;
      }

      state.tasks.unshift({
        id: state.counters.task++,
        groupId: group.id,
        title: suggestedTask,
        assigneeId: group.memberIds[0],
        done: false
      });

      group.lastActiveDays = 0;
      addActivity(`Suggested execution task added to ${group.name}.`);
      setMessage(taskFormMessage, `Suggested task added to ${group.name}.`, "success");
      saveState();
      renderWorkspaceApp();
    });
  }
}

function setupMatchEvents() {
  if (!matcherForm || !availabilityRange || !availabilityValue || !intentSelect || !skillSelect || !studentNameInput) {
    return;
  }

  availabilityRange.addEventListener("input", () => {
    availabilityValue.textContent = `${availabilityRange.value} hrs/week`;
    updateMatches();
  });

  matcherForm.addEventListener("submit", updateMatches);
  intentSelect.addEventListener("change", updateMatches);
  skillSelect.addEventListener("change", updateMatches);
  studentNameInput.addEventListener("input", updateMatches);

  updateMatches();
}

function setupWaitlistEvents() {
  if (!waitlistForm) {
    return;
  }

  waitlistForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.querySelector("#waitlist-name")?.value.trim() || "";
    const email = document.querySelector("#waitlist-email")?.value.trim() || "";
    const intent = document.querySelector("#waitlist-intent")?.value || "";

    if (!name || !email) {
      setMessage(waitlistMessage, "Enter your name and college email to join the network.", "error");
      return;
    }

    if (!isInstitutionalEmail(email)) {
      setMessage(waitlistMessage, "Use a college email ending like .edu, .ac.in, or .edu.in.", "error");
      return;
    }

    const record = {
      name,
      email,
      intent,
      timestamp: new Date().toISOString()
    };

    const existing = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]");
    if (existing.some((entry) => entry.email.toLowerCase() === email.toLowerCase())) {
      setMessage(waitlistMessage, "This email is already saved in the browser join flow.", "error");
      return;
    }

    existing.push(record);
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(existing));

    setMessage(waitlistMessage, `${name}, your network entry for "${intent}" has been saved in this browser.`, "success");
    waitlistForm.reset();
  });
}

function setupSharedNav() {
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      updateNavState(!topbar.classList.contains("nav-open"));
    });
  }

  document.querySelectorAll(".nav a, .nav-cta").forEach((link) => {
    link.addEventListener("click", () => updateNavState(false));
  });
}

setupSharedNav();
setupMatchEvents();
setupWorkspaceEvents();
setupWaitlistEvents();
renderWorkspaceApp();
