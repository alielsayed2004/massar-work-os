# MASSAR WORK OS — Product & Architecture Brief

## Purpose

This document captures the complete product discussion for Massar's internal operations and client portal.

The goal is to build a single system that connects:

**Management → Departments → Teams → Employees → Clients → Projects → Tasks → Files → Reviews → Approvals**

The system should reduce operational chaos, missed deadlines, unclear ownership, and dependency on WhatsApp or verbal handoffs.

The system will be built using **Vibe Coding / AI Coding**, so simplicity, predictable architecture, clear permissions, and incremental development are critical.

---

# 1. Product Vision

## Working Name

**Massar Work OS**

Alternative:

**Massar Operations OS**

## Core Promise

> One system for every project, task, handover, and client approval.

The system should become the **single source of truth** for Massar's work.

The main operational problems it must solve are:

- Who owns a task right now?
- What is the deadline?
- Is the task at risk?
- Who is available?
- What happens if a part-time employee cannot finish?
- Who takes over?
- Did the handover actually happen?
- What files were uploaded?
- What did the client approve?
- What is waiting for the client?
- What is overdue?
- What happened throughout the lifecycle of a task?

---

# 2. Product Structure

The system has two main sides:

## Internal Workspace

For:

- Management
- Managers
- Team Leads
- Employees
- Designers
- Developers
- Marketers
- Copywriters
- Other internal teams

## Client Portal

For clients.

Clients should see only information related to their own projects and deliverables.

---

# 3. Critical Privacy Rule

Clients must NOT see:

- Internal notes
- Employee performance
- Internal hours
- Internal comments
- Internal handovers
- Internal problems
- Internal team structure
- Internal management information
- Internal activity that is not client-facing

Clients should see:

- Their projects
- Project status
- Deliverables
- Files intended for them
- Comments/feedback
- Approval requests
- Revision requests
- Downloads
- Relevant milestones

---

# 4. Massar Brand Context

The product UI should follow the Massar Brand Guidelines instead of looking like a generic SaaS dashboard.

Important brand principles:

- Strong mark
- Disciplined typography
- Controlled color
- Consistent information architecture
- 12-column modular grid
- Restrained motion
- Clear information hierarchy
- One dominant message per surface
- Green as an anchor, not wallpaper
- Calm, premium, structured interface

Core colors:

- Massar Green: `#0D3B34`
- Bone: `#F1ECE2`
- Ink: `#101815`
- Clay: `#B85333`
- Stone: `#9A9791`

Desired UI character:

**Premium + Operational + Editorial + Calm + Structured**

Avoid:

- Generic SaaS look
- Excessive cards
- Purple gradients
- Visual clutter
- Too many charts
- Too many competing CTAs

The product should embody the Massar principle:

> Make complex work feel navigable.

---

# 5. Organizational Hierarchy

The company provides multiple services, so the system needs a clear hierarchy.

Initial concept:

```text
MASSAR
│
├── MANAGEMENT
│
├── CREATIVE
│   ├── Graphic Design
│   ├── Motion
│   ├── Video
│   └── AI / Visual Production
│
├── MARKETING
│   ├── Content
│   ├── Copywriting
│   ├── Social Media
│   └── Performance
│
└── DEVELOPMENT
    ├── Web
    ├── Automation
    └── Technical
```

This is only a starting concept.

The final architecture should be reviewed and simplified before implementation.

---

# 6. Employee Hierarchy

Preferred simple model:

```text
Company
  ↓
Department
  ↓
Team
  ↓
User
```

Example:

```text
Creative
└── Graphic Design
    ├── Ali
    ├── Medhat
    └── Omar
```

Avoid over-engineering.

Do NOT start with:

- Matrix management
- Multiple reporting structures
- Complex organizational trees
- Custom permission inheritance
- Advanced HR structures

A simple structure should be enough for V1.

---

# 7. Suggested Roles

Initial roles:

### Admin
Full system access.

### Manager
Manages relevant projects and teams.

### Team Lead
Manages team work, reviews work, and handles handovers.

### Team Member
Works on assigned tasks.

### Client
Accesses only the client's own projects and client-facing information.

The final role model should be audited before implementation.

---

# 8. Project Structure

Basic relationship:

```text
Client
  ↓
Project
  ↓
Tasks
  ↓
Files
```

Example:

```text
Client ABC
   ↓
October Campaign
   ↓
Instagram Post #01
Instagram Post #02
Banner
Story
Video
```

---

# 9. Task as the Core Work Unit

A Task is the main operational unit.

A task should initially contain:

- Task ID
- Title
- Project
- Client
- Current Owner
- Original Owner
- Reviewer
- Status
- Priority
- Deadline
- Description
- Files
- Activity

Avoid adding unnecessary fields in V1.

---

# 10. Example Task

```text
Task:
Instagram Post #14

Client:
ABC

Project:
October Campaign

Department:
Graphic Design

Team:
Graphic Design

Original Owner:
Medhat

Current Owner:
Medhat

Reviewer:
Ali

Deadline:
Today — 8:00 PM

Status:
In Progress
```

---

# 11. Task Statuses

Initial simple lifecycle:

```text
To Do
↓
In Progress
↓
Review
↓
Changes
↓
Approved
↓
Done
```

Additional status:

```text
Blocked
```

The final status model should be kept small and fixed in V1.

Do not build a workflow engine.

---

# 12. THE KEY FEATURE — HANDOVER

The most important operational feature is **Task Handover**.

Problem:

A part-time employee receives a task but realizes they cannot finish it before the deadline.

Instead of:

- Delaying
- Ignoring the task
- Sending files through WhatsApp
- Explaining verbally
- Losing track of ownership

The employee should use:

## Request Handover

Alternative button wording:

## I Can't Deliver

The final UX label should be evaluated.

---

# 13. Handover Flow

Example:

Medhat has:

> Instagram Post #14

Deadline:

> Today — 8:00 PM

Medhat cannot finish.

He clicks:

**Request Handover**

The system asks:

### Why can't you complete this task?

Options:

- Not enough time
- Schedule conflict
- Task complexity
- Higher priority task
- Need assistance
- Other

Then:

### Current Work

Optional upload:

- PSD
- AI
- Figma
- Video
- Assets
- Notes

Then:

### Transfer To

Select a suitable team member.

Example:

**Ali**

Then:

**Request Handover**

---

# 14. Handover Approval

Initial proposed flow:

```text
Medhat
 ↓
Handover Requested
 ↓
Ali
 ↓
Accept
 ↓
Task Owner = Ali
```

If rejected:

```text
Ali
 ↓
Reject
 ↓
Task Owner = Medhat
```

The final system should determine whether:

- Recipient accepts
- Team Lead approves
- Manager approves
- Or another simplified mechanism is better

The goal is clear accountability with minimum complexity.

---

# 15. Original Owner vs Current Owner

These must be separate concepts.

### Original Owner

The person who originally received the task.

### Current Owner

The person currently responsible for delivery.

Example:

```text
Original Owner:
Medhat

Current Owner:
Ali
```

After a successful handover:

**Ali becomes responsible for delivery.**

The system must retain the history showing that Medhat originally owned the task.

---

# 16. Handover Must Preserve History

The task must never disappear from history.

Activity example:

```text
Medhat created task
Medhat started task
Medhat uploaded V1
Medhat requested handover
Ali accepted handover
Task ownership transferred to Ali
Ali uploaded V2
Ali submitted for review
Ali completed task
```

Each event should have:

- User
- Action
- Object
- Timestamp

---

# 17. Early Handover / At-Risk Logic

The system should not wait until 10 minutes before the deadline.

Simple rule-based alerts can be used.

Example:

If the task has not started and the deadline is approaching:

> Task is due soon.

Then show:

- Continue
- Request Handover

No AI is required for this in V1.

---

# 18. Deadline Rules

Initial concept:

### 24 hours before deadline

`Upcoming`

### 4 hours before deadline

`Due Soon`

### After deadline

`Overdue`

### Handover request

`Needs Attention`

These rules should be reviewed and simplified if necessary.

---

# 19. Part-Time Availability

Part-time employees are a major reason for the system.

Potential availability:

```text
Medhat

Monday    6PM–10PM
Tuesday   6PM–10PM
Wednesday OFF
Thursday  6PM–10PM
Friday    2PM–8PM
```

Potential goal:

The system should avoid assigning a deadline that conflicts with a user's known availability.

However, availability calculations can add complexity.

Decision needed:

- Include basic availability in V1
- Or postpone it until V1.1

Do not build an advanced scheduling engine initially.

---

# 20. Employee Dashboard

The employee dashboard should be extremely simple.

The employee should immediately understand:

1. What do I need to do?
2. What is due today?
3. What is at risk?
4. Is there a handover request?
5. What needs review?
6. What is waiting on me?

Suggested structure:

# MY WORK

### Needs Attention
2

### Due Today
3

### In Progress
4

### Upcoming
6

Then:

## TODAY

| Task | Client | Due | Status |
|---|---|---|---|
| Post 14 | ABC | 6 PM | At Risk |
| Banner | XYZ | 8 PM | Working |
| Story 06 | DEF | Tomorrow | On Track |

Avoid overwhelming employees with management analytics.

---

# 21. Team Lead Dashboard

Team Lead should see:

- My Tasks
- Team Tasks
- Handover Requests
- Overdue
- Waiting Review

Possible summary:

```text
GRAPHIC DESIGN

6 Members
18 Active Tasks
4 At Risk
2 Handover Requests
3 Waiting Review
```

Keep it simple.

---

# 22. Management Dashboard

Management needs a higher-level view.

Suggested information:

- Active Projects
- Active Tasks
- At Risk
- Overdue
- Waiting Client
- Handover Requests
- Team Capacity

Potential drill-down:

```text
Operations
 ↓
Creative
 ↓
Graphic Design
 ↓
Team
 ↓
Employee
 ↓
Task
```

The final product should determine whether a separate Command Center is necessary.

---

# 23. Command Center Concept

Possible management view:

```text
MASSAR / OPERATIONS

TODAY

12 Active
04 At Risk
02 Handover
03 Waiting Review
06 Waiting Client
01 Overdue
```

Then:

### TEAM

Creative — 82%

Marketing — 64%

Motion — 91%

Development — 58%

Then:

### CRITICAL

Post #14
Medhat → Ali
Due 2h 14m

Campaign Video
Omar
Due 4h

Brand Deck
Ahmed
Overdue
```

This should be evaluated for usefulness vs complexity.

---

# 24. Assist / Handover / Escalate

A previous concept introduced three actions:

### ASSIST

Employee needs help but remains owner.

### HANDOVER

Employee cannot finish and transfers responsibility.

### ESCALATE

Problem requires Lead/Manager intervention.

For V1, consider whether only **Handover** is necessary.

Avoid adding unnecessary workflows.

---

# 25. Delay Reasons

Potential reasons:

- Client
- Team availability
- Revision
- Internal bottleneck
- Handover
- Scope change
- Technical issue

Useful for future analytics, but likely not required in the first version.

---

# 26. Client Portal

Client enters with their account.

Client sees:

### Projects

Inside each project:

- Progress
- Deliverables
- Files
- Comments
- Status

Client actions:

### Approve

or

### Request Changes

---

# 27. Client Experience

The client should not see internal operational complexity.

Client should quickly understand:

1. What has been completed?
2. What needs my action?
3. What has been approved?
4. What is coming next?

The client portal should feel:

- Premium
- Calm
- Simple
- Trustworthy
- Branded

---

# 28. Feedback

Potential system:

Client can comment directly on an asset.

Example:

Instead of:

> "The second image needs changes."

The client can open the asset and comment.

However, visual annotations can be technically complex.

For V1, evaluate whether simple comments on the deliverable provide 80% of the value.

Prefer the simpler solution.

---

# 29. Approval System

Client approval should create a clear record.

Example:

```text
Approved
Approved by: Client
Date:
Time:
```

Revision:

```text
Changes Requested
Comment:
Date:
```

Both actions should be recorded in Activity.

---

# 30. Files and Versioning

Avoid complex file version control in V1.

Simpler rule:

> Never overwrite files.

Every upload becomes a new file.

Store:

- File name
- URL
- Task ID
- Uploaded by
- Timestamp

The system can identify which file is currently presented to the client.

Potential future UI:

```text
POST-04

V1
V2
V3
V4
```

But this should not become a complex versioning engine.

---

# 31. File Storage

Do not build file storage from scratch.

Use an external storage provider.

The application database stores metadata only:

```text
file_id
file_name
file_url
task_id
uploaded_by
created_at
```

Access permissions must be carefully enforced.

---

# 32. Activity Log

Every important action should create an activity record.

Examples:

```text
Ali assigned task
Medhat uploaded file
Medhat requested handover
Ali accepted handover
Client requested revision
Ali uploaded V2
Client approved
```

Basic activity structure:

```text
user
action
object
timestamp
```

---

# 33. Time Tracking

Goal:

> Know how much each person worked.

But real-time timers can create unnecessary complexity.

Initial proposal:

### Manual Time Log

Employee records:

> Worked: 2h 30m

The time is linked to the Task.

A real-time timer can be considered later.

---

# 34. Team Workload

Future concept:

```text
Ahmed     80%
Omar      100%
Mariam    60%
Youssef   40%
```

Potential inputs:

- Estimated Hours
- Actual Hours
- Assigned Tasks
- Availability

This should probably not be part of the first implementation unless there is a very simple way to derive it.

---

# 35. Analytics

Future analytics could include:

## Business

- Active Projects
- Active Clients
- Completed Projects
- Revenue
- Pending Approvals

## Team

- Hours
- Tasks Completed
- Average Task Time
- Overdue Tasks
- Workload

## Clients

- Approval Time
- Revision Rate
- Project Activity

## Operations

- Average Delivery Time
- Revision Count
- Bottlenecks
- On-time Delivery %

These should be prioritized and phased.

---

# 36. Search

Future Global Search:

Search:

> Campaign October

Find:

- Projects
- Tasks
- Clients
- Files
- Comments

Evaluate whether this is required in MVP.

---

# 37. Notifications

Potential notifications:

- New task assigned
- Client requested revision
- Deadline approaching
- Client approved
- Handover requested
- Handover accepted/rejected

Keep the implementation simple.

Do not build a full notification orchestration system in V1.

---

# 38. Automation

Initial automation should be rule-based only.

Examples:

- Deadline approaching
- Overdue
- Handover request
- Approval request

Do NOT build:

- Automation builder
- Workflow engine
- AI automation

in V1.

---

# 39. Proposed MVP Database

Initial proposal:

```text
users
departments
teams
clients
projects
tasks
files
activities
handover_requests
```

This is not final.

The architect must review:

- Which tables are necessary?
- Which tables can be merged?
- Which are missing?
- What are the foreign keys?
- What indexes are required?
- How can permission bugs be prevented?
- How can circular dependencies be avoided?

---

# 40. Core Relationships

Initial conceptual model:

```text
CLIENT
  ↓
PROJECT
  ↓
TASK
  ↓
FILE
```

Users:

```text
USER
  ↓
TASKS
```

Activity:

```text
EVERYTHING
  ↓
ACTIVITY
```

Handover:

```text
TASK
  ↓
HANDOVER REQUEST
```

---

# 41. Permissions

V1 should use Role-Based Access Control.

### Admin

Everything.

### Manager

Relevant projects and teams.

### Team Lead

Relevant team tasks, reviews, and handovers.

### Team Member

Assigned tasks and permitted team information.

### Client

Own projects only.

Avoid custom permission builders in V1.

---

# 42. Vibe Coding Constraints

The system will be built using AI/Vibe Coding.

Therefore architecture must be:

- Simple
- Modular
- Predictable
- Easy to debug
- Easy to extend
- Clear database relationships
- Clear permissions
- Minimal duplicated business logic

Avoid:

- Microservices
- Complex event systems
- Workflow engines
- Excessive abstractions
- AI everywhere
- Too many tables
- Too many roles
- Too many states

A simple monolithic architecture is likely preferable for the first version unless there is a strong reason otherwise.

---

# 43. Development Phases

## Phase 1 — Foundation

- Authentication
- Users
- Roles
- Departments
- Teams
- Permissions

## Phase 2 — Core Work

- Clients
- Projects
- Tasks
- Status
- Deadlines
- Assignments

## Phase 3 — Operations

- Files
- Activity Log
- Handover

## Phase 4 — Client Portal

- Deliverables
- Comments
- Approval
- Revision Request

## Phase 5 — Notifications

## Phase 6 — Time Tracking

- Manual time logs
- Basic analytics

## Phase 7 — Advanced Operations

- Workload
- Advanced analytics
- Automation
- AI

Each phase should be stable and tested before starting the next.

---

# 44. Explicitly Avoid in V1

Do NOT add unless there is a strong architectural reason:

- AI task assignment
- AI workload prediction
- Client health score
- Revenue analytics
- Profitability
- Advanced time tracking
- Capacity planning
- Complex approval chains
- Advanced calendar
- Chat system
- Internal messaging
- Gantt chart
- Automation builder
- Custom workflow builder
- Complex HR system
- Advanced CRM
- Complex file versioning
- Visual annotation system
- Real-time collaborative editor

---

# 45. Core UX Principle

Each user should see only the information appropriate to their responsibility.

## Employee

> My Work

## Team Lead

> My Team

## Manager

> Operations

## Client

> My Projects

Do not build one dashboard that exposes everything.

---

# 46. Employee UX Requirements

Within seconds, employee should know:

1. What should I do?
2. What is due today?
3. What is at risk?
4. Is a handover required?
5. What needs review?
6. What is waiting on me?

---

# 47. Manager UX Requirements

Manager should know:

1. Where is work delayed?
2. Who needs intervention?
3. Who is overloaded?
4. What handovers are pending?
5. What projects are at risk?

---

# 48. Client UX Requirements

Client should know:

1. What has been completed?
2. What needs my action?
3. What has been approved?
4. What is next?

---

# 49. Most Important Operational Flow

The core handover scenario:

```text
Part-time employee
      ↓
Cannot finish
      ↓
Request Handover
      ↓
Qualified team member
      ↓
Accepts
      ↓
Current Owner changes
      ↓
New owner sees priority + deadline
      ↓
Task completed
      ↓
Management retains full history
```

This is one of the strongest differentiators of Massar Work OS because it directly addresses the company's operational reality.

---

# 50. Architecture Review Requirement

Do NOT blindly implement the architecture above.

Act as a **Senior Product Architect reviewing another team's proposal**.

Perform a critical audit for:

## A — Architecture Errors

Is the architecture logically sound?

## B — Database Errors

Are the tables and relationships correct?

## C — Permission Errors

Can a client accidentally access internal information?

Can one team access another team's private data?

## D — UX Errors

Can users get lost?

Is there unnecessary complexity?

## E — Vibe Coding Risks

What is likely to break during AI-assisted implementation?

## F — Scope Problems

What should be removed from V1?

## G — Missing Features

What important operational requirements are missing?

## H — Contradictions

Are any requirements inconsistent with one another?

---

# 51. Simplification Rule

If a feature can provide 80% of its value with 20% of its complexity, choose the simpler implementation.

Examples:

Instead of:

> Advanced Workflow Engine

Use:

> Fixed Task Statuses

Instead of:

> AI Assignment

Use:

> Manual Assignment

Instead of:

> Advanced File Version Control

Use:

> Every Upload = New File

Instead of:

> Real-time Timer

Use:

> Manual Time Log

Instead of:

> Complex Permission Matrix

Use:

> Role-Based Permissions

---

# 52. Required Final Analysis

After reviewing this entire document, produce:

## 1. Executive Verdict

Is the concept good?

What are the 5 biggest problems?

---

## 2. Corrected Product Vision

Write the final Massar Work OS concept in one clear paragraph.

---

## 3. Final MVP Scope

Separate into:

### MUST HAVE

### SHOULD HAVE

### LATER

### REMOVE

---

## 4. Final User Roles

Give only the final roles.

---

## 5. Final Hierarchy

Give the simplest suitable organizational structure.

---

## 6. Final User Flows

Define:

### Employee receives task

### Employee completes task

### Employee requests handover

### Team Lead / recipient handles handover

### New owner accepts

### Client receives deliverable

### Client requests changes

### Client approves

---

## 7. Final Task Lifecycle

Define the final statuses.

---

## 8. Final Database Schema

Provide:

- Tables
- Fields
- Foreign Keys
- Relationships
- Important indexes
- Important constraints

Do not add unnecessary tables.

---

## 9. Permission Matrix

Create:

| Action | Admin | Manager | Team Lead | Member | Client |
|---|---|---|---|---|---|

---

## 10. Final Dashboard Structure

Define:

### Admin Dashboard

### Manager Dashboard

### Team Lead Dashboard

### Employee Dashboard

### Client Dashboard

Explain exactly what each should show.

---

## 11. Handover System

Design the full Handover feature:

- UI
- Database
- Status
- Permissions
- Notifications
- Edge cases
- Ownership rules

---

## 12. Vibe Coding Risk Audit

Identify likely failure points such as:

- Permission leaks
- Duplicate assignments
- Handover conflicts
- File access bugs
- Client seeing internal information
- Deadline timezone issues
- Duplicate notifications
- Deleted users
- Deleted projects
- Orphaned files
- Multiple simultaneous handovers
- Race conditions

Give the simplest solution for each.

---

## 13. Build Order

Give the exact recommended implementation order and why.

---

## 14. Test Plan

Provide test scenarios for:

- Login
- Roles
- Permissions
- Assignment
- Deadline
- Handover
- File upload
- Client approval
- Revision
- Activity Log
- Notifications

---

## 15. Final Corrected Architecture

End with a simple architecture diagram.

Example format:

```text
MASSAR
│
├── AUTH
│
├── USERS / TEAMS
│
├── CLIENTS
│
├── PROJECTS
│
├── TASKS
│
├── FILES
│
├── HANDOVER
│
├── ACTIVITY
│
└── CLIENT PORTAL
```

Do not assume this exact diagram is correct. Replace it if your audit finds a better structure.

---

# FINAL RULE

Do not try to impress with feature count.

The goal is:

> **Simple enough to build with Vibe Coding.**

and:

> **Strong enough to actually run Massar's operations.**

Success means:

- Less chaos
- Less WhatsApp dependency
- Fewer missed deadlines
- Clear ownership
- Clear handovers
- Clear client approvals
- One source of truth
- Easy debugging
- Easy future expansion

**Do not start with code.**

**Do not start with UI.**

**Start with the System Architecture and Critical Audit.**

Most importantly:

> **If any part of this specification is wrong, overcomplicated, contradictory, or technically risky, say so explicitly and fix it.**
