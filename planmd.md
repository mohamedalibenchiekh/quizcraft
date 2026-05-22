# QUIZCRAFT — Implementation Plan

This document tracks how we deliver the QuizCraft platform described in `PFA_4Projects_2025.pdf`. It is the source of truth for scope, sequencing, and acceptance criteria for every development phase. 

Any ambiguity between this plan, the specification document, and the codebase must be resolved by strict reference to the primary evaluation criteria — never by silent assumption.

---

## Product summary

QuizCraft is an AI-powered assessment and engagement platform that automates the generation of quizzes from unstructured course documents and orchestrates real-time live competition sessions. The platform operates across two distinct personas:
* **Professors** can ingest slides/documents, audit and tweak AI-generated question banks, spin up live interactive rooms, and analyze conceptual failure points across class cohorts.
* **Students** can participate via dynamic room codes, interact with real-time streaming scoreboards, and review personalized conceptual gap metrics that trigger adaptive remediation paths.

The domain model is `User → Quiz → Question → Session → Attempt` (where Questions live globally inside a reusable Bank but are encapsulated cleanly within Quizzes).

---

## Stack

* **Frontend**: React 19 + Vite + Tailwind CSS (Initialized in `/client`)
* **Backend**: Node.js v20 + Express + Socket.io (Configured in `/server`)
* **Database**: MongoDB Atlas (Cloud deployment required; zero local instances accepted)
* **AI Layer**: OpenAI GPT-4o-mini API / Google Gemini 1.5 Flash API via official SDKs
* **File Parser**: Multer (multi-part processing) + `pdf-parse` (PDF) + `mammoth` (DOCX)
* **Auth**: JSON Web Tokens (JWT) with secure access/refresh token pairs and role route gates

---

## Architectural conventions

1. **Strict AI Schema Validation**: Every payload returning from the OpenAI/Gemini SDK must adhere to a strict structured JSON array layout. The API router must drop unparsable blocks using a fallback schema interceptor before committing questions to the database.
2. **Duplex Session State**: Live rooms track active state purely via a Socket.io adapter layer in memory before writing session records out to MongoDB upon session completion. 
3. **Role-Based Middlewares (`professor` vs `student`)**: All database modifications on quizzes or question objects must route through an Express boundary checking token signatures for the `professor` role.
4. **Adaptive Branching (Immutability)**: Adaptive mutations do not change a baseline quiz. If a student falls below 50% or goes above 85%, a mutation handler acts as a factory pattern, instantiating a localized `QuizVariant` record mapped exclusively to that student's user object.

---

## Phase plan

### Phase 0 — Foundation & Authentication
*Goal: Setup repository boilerplate, project workspaces, and secure access boundaries.*

* **Deliverables**:
  * [x] Scaffold client application utilizing Vite with React template.
  * [x] Initialize backend Express platform with modular router allocation (`/api/auth`, `/api/quizzes`, `/api/sessions`).
  * [x] Add MongoDB Atlas connectivity layer via Mongoose; verify connection states inside server startup lifecycles.
  * [x] Implement JWT signature generation and custom protection middleware (`requireRole('professor')` and `requireRole('student')`).
  * [x] Establish an upstream `.env.example` file pinning all required environment targets (`MONGO_URI`, `JWT_SECRET`, `OPENAI_API_KEY`, `VITE_API_URL`).

* **Exit criteria**:
  * Client and server run concurrently with zero initialization collisions.
  * Accessing protected resource routes returns `401 Unauthorized` unless a valid bearer token matching the targeted role claims is attached.

---

### Phase 1 — Core Question Bank & Editing Engine
*Satisfies: TAG: BANK — Question Bank & Versioning*

* **Deliverables**:
  * [ ] Execute database models for `quizzes` and `questions` containing explicit attributes: `type` (MCQ / True-False / Short-Answer), `options`, `correctAnswer`, and `tags`.
  * [ ] Design Professor-facing UI to manually build static questions and associate them with a clean parent Quiz schema wrapper.
  * [ ] Build full API CRUD endpoints under `/api/quizzes` to query, modify, or drop explicit questions.
  * [ ] **QC-BR-01**: A question cannot exist without a default difficulty label (`easy`, `medium`, `hard`) assigned during manual initialization or editing screens.
  * [ ] Implement an explicit `isApproved` flag on the schema layer so professors can filter out unverified drafts from visible quiz lists.

* **Exit criteria**:
  * A Professor can create a blank quiz layout, manually patch questions inside the card UI, change option targets, and successfully persist structural modifications into MongoDB.

---

### Phase 2 — Document Parsing & AI Prompt Layer
*Satisfies: TAG: AI — Auto-Question Generation*

* **Deliverables**:
  * [ ] Configure `Multer` middleware to handle multi-part file payloads specifically restricted to `.pdf` and `.docx` extensions.
  * [ ] Wire up `pdf-parse` and `mammoth` string extractors to cleanly pipe raw text inputs out of uploaded course arrays.
  * [ ] Engineer a strict system prompt instruction layer to pass text extracts directly into the LLM SDK endpoint (`/api/ai/generate`).
  * [ ] **QC-BR-02**: The AI system prompt must explicitly restrict output format structures to a native JSON string matching this signature blueprint: 
    `{ questions: Array<{ type: string, question: string, options: string[], answer: string, difficulty: string }> }`.
  * [ ] Implement defensive try-catch error handling to elegantly recover when an LLM returns a broken string block, dropping into an atomic schema parsing fallback.

* **Exit criteria**:
  * Uploading a 5-page PDF successfully resolves into a clean JSON layout mapping several highly accurate, automatically compiled assessment cards inside the React DOM tree.

---

### Phase 3 — Real-Time Live Quiz Engine (Socket.io)
*Satisfies: TAG: LIVE — Real-Time Quiz Sessions*

* **Deliverables**:
  * [ ] Create real-time state listeners inside the backend application using an explicit `Socket.io` server instantiator.
  * [ ] Build the room session generator router (`POST /api/sessions/start`) returning a random, 6-character room access passcode.
  * [ ] Implement structural socket events to orchestrate live actions: `joinRoom`, `nextQuestion`, `submitAnswer`, and `roomClosed`.
  * [ ] **QC-BR-03**: Answer submissions submitted past an active question countdown window must be dropped server-side and recorded as a point value score of zero.
  * [ ] Create the live real-time point tracking map, calculating scoreboard differentials and piping streaming update event blocks back out to connected clients immediately.

* **Exit criteria**:
  * Opening a student viewpoint tab and submitting test answers updates a professor's presentation monitor view instantly, shifting leaderboard items dynamically without a browser refresh.

---

### Phase 4 — Adaptive Difficulty Engine
*Satisfies: TAG: DIFF — Adaptive Difficulty Engine*

* **Deliverables**:
  * [ ] Create an assessment evaluation process block firing immediately on an evaluation attempt termination endpoint (`POST /api/attempts/submit`).
  * [ ] **QC-BR-04**: If a student's finalized performance ratio falls strictly underneath `50%`, the platform generates a lower-tier retry block using simplified questions retrieved from the question bank.
  * [ ] **QC-BR-05**: If a student's score ratio surfaces higher than `85%`, the platform triggers an advanced variant block using higher difficulty questions to test concept depth.
  * [ ] Build dynamic React notification alerts mapping remediation opportunities cleanly to target student tracking interfaces.

* **Exit criteria**:
  * Completing a sample assessment card array with poor scores changes the layout flow to a prompt providing a simplified revision retry deck.

---

### Phase 5 — Metrics Reporting & Dashboards
*Satisfies: TAG: STAT — Analytics Dashboard*

* **Deliverables**:
  * [ ] Implement an aggregated data pipeline processing database entities under the path `/api/analytics/professor/:quizId`.
  * [ ] Construct question-level error metrics (heatmaps) to isolate topics showing heavy failure occurrences across whole cohorts.
  * [ ] Create individual student dashboards presenting personalized knowledge gap summary metrics.

* **Exit criteria**:
  * Professors can open an automated session summary showing a breakdown of performance data, calling out exactly which questions caused the highest failure rates.

---

### Phase 6 — Live Cloud Deployment
*Satisfies: Deployment Constraints*

* **Deliverables**:
  * [ ] Link the React UI directory to **Vercel** with strict matching production target variable lines (`VITE_API_URL`).
  * [ ] Push the Node engine repo out into a public **Render** production service, linking internal environmental references directly.
  * [ ] **QC-BR-06**: Configure CORS parameters on the server app to explicitly reject inbound access calls dropping from locations outside the registered Vercel site layout domain.
  * [ ] Setup an open network access rule boundary (`0.0.0.0/0`) within the security access configuration block of the MongoDB Atlas web layout panel.

* **Exit criteria**:
  * The production platform executes client interactions perfectly on the live web environment using secure MongoDB connection strings.