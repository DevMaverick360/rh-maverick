# Project: Maverick 360 - AI HR Automation SaaS

## Overview

Build a SaaS platform for HR automation using AI, focused on:
- CV ingestion
- AI-based candidate qualification (cultural + technical)
- Automated communication
- Interview scheduling

The platform must follow a **minimalist, bold, high-contrast design system inspired by Maverick360 branding**.

---

## Tech Stack

- Frontend: Next.js (App Router) + TypeScript
- UI: shadcn/ui + TailwindCSS
- Backend: Supabase (PostgreSQL + Auth + Storage)
- AI: OpenAI API
- Email: Resend or SMTP
- Scheduling: Google Calendar API (or similar)
- File handling: Supabase Storage
- API layer: Next.js Route Handlers

---

## Core Features

### 1. External CV Submission API

Create a public API endpoint:

POST /api/cv/submit

Responsibilities:
- Accept multipart/form-data or JSON:
  - name
  - email
  - phone
  - job_id
  - CV file (PDF/DOC)
- Store file in Supabase Storage
- Save candidate in database
- Trigger AI processing (async)

---

### 2. Database Schema (Supabase)

Tables:

#### candidates
- id
- name
- email
- phone
- cv_url
- job_id
- status (pending, approved, rejected)
- cultural_score (0-100)
- technical_score (0-100)
- ai_summary
- created_at

#### jobs
- id
- title
- description
- cultural_criteria (text)
- technical_criteria (text)

#### interviews
- id
- candidate_id
- scheduled_at
- status (scheduled, confirmed, missed)

---

### 3. AI CV Analysis (OpenAI)

When a CV is submitted:

#### Step 1 — Extract text from CV
- Use PDF parser

#### Step 2 — Send to OpenAI

Prompt structure:

- Analyze candidate based on:
  - Cultural fit (based on job criteria)
  - Technical fit
- Return:
  - Score (0–100)
  - Summary
  - Strengths
  - Weaknesses
  - Recommendation (approve/reject)

#### Step 3 — Save results in DB

#### Step 4 — Auto decision:
- If score > threshold → APPROVED
- Else → REJECTED

---

### 4. Candidate Communication Automation

#### Approved Candidates

1. Send email:
   - Invite to interview
   - Include scheduling link

2. Allow candidate to pick time

3. Save interview in DB

4. Send confirmation email

5. Send reminder 1 hour before

---

#### Rejected Candidates

- Send email:
  - Thank them
  - Keep tone human and respectful

---

### 5. Scheduling System

- Integrate Google Calendar API
- Available slots:
  - Configurable per job
- Auto-create event on booking

---

### 6. Dashboard (SaaS)

#### Pages

##### /dashboard
- Metrics:
  - Total candidates
  - Approved
  - Rejected
  - Interviews scheduled

##### /candidates
- List with filters:
  - Status
  - Score
- Table:
  - Name
  - Score
  - Status
  - Actions

##### /candidates/[id]
- Candidate details:
  - CV preview
  - AI analysis
  - Scores
  - Actions:
    - Approve / Reject manually
    - Schedule interview

##### /jobs
- Create/edit job
- Define criteria

---

### 7. UI/UX Rules

- Minimalist
- High contrast (black/white)
- Accent color for actions
- Clean spacing
- Fast interactions

Use:
- Cards for metrics
- Tables for data
- Modals for actions

---

### 8. Security

- Auth via Supabase
- Protect dashboard routes
- Validate API inputs
- Rate limit public CV endpoint

---

### 9. Background Jobs

Use:
- Queue system or cron

For:
- AI processing
- Email sending
- Reminder scheduling

---

### 10. Code Structure

/app
  /dashboard
  /api
    /cv
    /ai
    /email

/components
/lib
  /supabase
  /openai
  /email

---

### 11. Future Enhancements

- WhatsApp integration
- Candidate scoring dashboard
- Multi-tenant (multiple companies)
- Custom AI prompts per job

---

## Goal

Deliver a scalable MVP that:
- Automates recruitment pipeline
- Reduces manual screening
- Improves candidate experience
- Reflects Maverick360 brand (premium + bold)

---

## Important

- Prioritize performance and UX
- Keep UI clean and fast
- Avoid overengineering
- Use server actions when possible