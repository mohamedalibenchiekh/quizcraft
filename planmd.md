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
  * [x] Execute database models for `quizzes` and `questions` containing explicit attributes: `type` (MCQ / True-False / Short-Answer), `options`, `correctAnswer`, and `tags`.
  * [x] Design Professor-facing UI to manually build static questions and associate them with a clean parent Quiz schema wrapper.
  * [x] Build full API CRUD endpoints under `/api/quizzes` to query, modify, or drop explicit questions.
  * [x] **QC-BR-01**: A question cannot exist without a default difficulty label (`easy`, `medium`, `hard`) assigned during manual initialization or editing screens.
  * [x] Implement an explicit `isApproved` flag on the schema layer so professors can filter out unverified drafts from visible quiz lists.

* **Exit criteria**:
  * A Professor can create a blank quiz layout, manually patch questions inside the card UI, change option targets, and successfully persist structural modifications into MongoDB.

---

### Phase 2 — Document Parsing & AI Prompt Layer
*Satisfies: TAG: AI — Auto-Question Generation*

* **Deliverables**:
  * [x] Configure `Multer` middleware to handle multi-part file payloads specifically restricted to `.pdf` and `.docx` extensions.
  * [x] Wire up `pdf-parse` and `mammoth` string extractors to cleanly pipe raw text inputs out of uploaded course arrays.
  * [x] Engineer a strict system prompt instruction layer to pass text extracts directly into the LLM SDK endpoint (`/api/ai/generate`).
  * [x] **QC-BR-02**: The AI system prompt must explicitly restrict output format structures to a native JSON string matching this signature blueprint: 
    `{ questions: Array<{ type: string, question: string, options: string[], answer: string, difficulty: string }> }`.
  * [x] Implement defensive try-catch error handling to elegantly recover when an LLM returns a broken string block, dropping into an atomic schema parsing fallback.

* **Exit criteria**:
  * Uploading a 5-page PDF successfully resolves into a clean JSON layout mapping several highly accurate, automatically compiled assessment cards inside the React DOM tree.

---

### Phase 3 — Real-Time Live Quiz Engine (Socket.io)
*Satisfies: TAG: LIVE — Real-Time Quiz Sessions*

* **Deliverables**:
  * [x] Create real-time state listeners inside the backend application using an explicit `Socket.io` server instantiator.
  * [x] Build the room session generator router (`POST /api/sessions/start`) returning a random, 6-character room access passcode.
  * [x] Implement structural socket events to orchestrate live actions: `joinRoom`, `nextQuestion`, `submitAnswer`, and `roomClosed`.
  * [x] **QC-BR-03**: Answer submissions submitted past an active question countdown window must be dropped server-side and recorded as a point value score of zero.
  * [x] Create the live real-time point tracking map, calculating scoreboard differentials and piping streaming update event blocks back out to connected clients immediately.

* **Exit criteria**:
  * [x] Opening a student viewpoint tab and submitting test answers updates a professor's presentation monitor view instantly, shifting leaderboard items dynamically without a browser refresh.

#### Phase 3 Implementation Metrics

* **Socket.io Server Instantiator**: Fully integrated backend WebSocket architecture in `server/config/socket.js`, running on the standard Express server instance and utilizing rooms for isolated game sessions.
* **6-Character PIN Generation**: Employs secure cryptographic selection (`crypto.randomInt`) to construct exactly 6-character uppercase alphanumeric room passcodes, complete with up to 5 automatic collision retries backed by a unique index on MongoDB.
* **Speed-Weighted Scoring Formula**: Correct answers are awarded points using the dynamic response time ratio:
  $$\text{Points} = \text{round}(1000 - (\frac{\text{Response Time}}{\text{Question Duration}} \times 500)) + \text{Streak Bonus}$$
  * An additional streak bonus of $+100$ points is automatically awarded for players on a correct answer streak of 2 or more.
* **Client-Side Input Freeze (QC-BR-03)**: The student component (`StudentSession.jsx`) instantly freezes all visual controls (setting all option buttons to `disabled`) as soon as the user selects an option OR when the circular SVG countdown timer reaches zero, preventing duplicate submissions or late submissions.
* **Integration Test Coverage**: Automated suite written in Vitest and React Testing Library (`LiveSession.test.jsx`) verifying key game loops including connection event listeners, real-time roster updates, and complete button freeze constraints.

---

### Phase 4 — Adaptive Difficulty Engine
*Satisfies: TAG: DIFF — Adaptive Difficulty Engine*

* **Deliverables**:
  * [x] Create an assessment evaluation process block firing immediately on an evaluation attempt termination endpoint (`POST /api/attempts/submit`).
  * [x] **QC-BR-04**: If a student's finalized performance ratio falls strictly underneath `50%`, the platform generates a lower-tier retry block using simplified questions retrieved from the question bank.
  * [x] **QC-BR-05**: If a student's score ratio surfaces higher than `85%`, the platform triggers an advanced variant block using higher difficulty questions to test concept depth.
  * [x] Build dynamic React notification alerts mapping remediation opportunities cleanly to target student tracking interfaces.

* **Exit criteria**:
  * Completing a sample assessment card array with poor scores changes the layout flow to a prompt providing a simplified revision retry deck.

#### Phase 4 Implementation Metrics

* **Integration of `POST /api/attempts/submit`**: Evaluates correct answers directly through `attemptController.js` and securely evaluates business conditions based on an exact finalized correct answer score ratio.
* **Mathematical Compliance Boundaries**:
  * **QC-BR-04 (< 50% easy fallback routing)**: Triggers `adaptiveStatus: 'remediation'` and surfaces simplified questions filtering by `difficulty: 'easy'` matching the current quiz topic category.
  * **QC-BR-05 (> 85% advanced enrichment routing)**: Triggers `adaptiveStatus: 'enrichment'` generating a challenge matrix filtering by `difficulty: 'hard'`.
* **Polymorphic UI Component Pivots**: Handled dynamically inside `client/src/pages/TakeQuiz.jsx` mapping `status === 'remediation'` to override the screen container presenting an encouraging React alert panel ("Let's reinforce the basics!") and `status === 'enrichment'` triggering a high-impact celebration badge.
* **Test Integration Coverage**: Full integration suite within `server/tests/adaptiveEngine.test.js` validating exactly 20% score remediation extraction alongside 90% score advanced enrichment items.

---

### Phase 5 — Metrics Reporting & Dashboards
*Satisfies: TAG: STAT — Analytics Dashboard*

* **Deliverables**:
  * [x] Implement an aggregated data pipeline processing database entities under the path `/api/analytics/professor/:quizId`.
  * [x] Construct question-level error metrics (heatmaps) to isolate topics showing heavy failure occurrences across whole cohorts.
  * [x] Create individual student dashboards presenting personalized knowledge gap summary metrics.

* **Exit criteria**:
  * [x] Professors can open an automated session summary showing a breakdown of performance data, calling out exactly which questions caused the highest failure rates.

#### Phase 5 Implementation Metrics

* **Aggregation Pipeline Structure**:
  * **$match Stage**: Filters attempts matching the target `quizId`.
  * **$facet Stage**: Executes two parallel pipelines for high-performance server-side data extraction:
    * **stats Pipeline**: Groups all matched attempts to compute `totalAttempts`, `averageScore` (average of `scoreRatio * 100`), `highestScore`, `lowestScore`, and count of adaptive triggers (`remediation`, `enrichment`, `none`).
    * **questionBreakdown Pipeline**: Unwinds individual question responses from the `answers` array, groups by `questionId` to sum correct/incorrect counts, performs a `$lookup` on the `questions` collection to pull metadata (text, difficulty, tags), and projects final percentage statistics.
* **UI Layout Composition (QuizAnalytics.jsx)**:
  * **KPI Cards Row**: Highlights Total Submissions, Class Average Score, and the dynamically calculated "Most Missed Concept" tag.
  * **Adaptive Triggers Panel**: Employs a stunning, proportional pure-Tailwind stacked bar chart representing student adaptive paths (Remediation vs Baseline vs Enrichment).
  * **Item Analysis Matrix**: Displays every question text snippet along with its correct/incorrect counts, color-coded dynamically based on class mastery levels (Green for &gt; 80% mastery, Yellow for 50%-80% baseline, and Red for &lt; 50% critical focus areas). Features a search bar and interactive tabs to filter items instantly.
* **Regression Test Coverage**: Complete integration suite at `server/tests/analytics.test.js` validating exactly 75% average class score computation across mock student attempts alongside adaptive counts and question-level breakdowns.

---

### Phase 6 — Live Cloud Deployment
*Satisfies: Deployment Constraints*

* **Deliverables**:
  * [x] Link the React UI directory to **Vercel** with strict matching production target variable lines (`VITE_API_URL`).
  * [x] Push the Node engine repo out into a public **Render** production service, linking internal environmental references directly.
  * [x] **QC-BR-06**: Configure CORS parameters on the server app to explicitly reject inbound access calls dropping from locations outside the registered Vercel site layout domain.
  * [x] Setup an open network access rule boundary (`0.0.0.0/0`) within the security access configuration block of the MongoDB Atlas web layout panel.

* **Exit criteria**:
  * [x] The production platform executes client interactions perfectly on the live web environment using secure MongoDB connection strings.

#### Phase 6 Implementation & Deployment Notes

##### 1. Cloud Infrastructure Architecture
* **Frontend Hosting (Vercel)**:
  * Deployed from the static `client/` subdirectory.
  * Environment configuration binds `VITE_API_URL` to point dynamically to the backend API endpoint hosted on Render.
  * Static build is highly optimized: `vite build` executes with `build.sourcemap: false` configured explicitly inside `vite.config.js` to eliminate source map overhead and protect intellectual property.
* **Backend Engine (Render Web Service)**:
  * Deployed from the `server/` directory using an optimized Node.js runtime environment.
  * Dynamically binds to the cloud-allocated port `process.env.PORT` and listens on `0.0.0.0` to permit external traffic routing.
* **Database Layer (MongoDB Atlas)**:
  * Managed cloud-hosted Mongo instance with a secure IP Access List configuration. For seamless cloud-to-cloud communications across dynamic server IPs, the security group is configured to allow connection bounds from `0.0.0.0/0`.

##### 2. CORS & Networking Policy (QC-BR-06 Compliance)
* Both the Express HTTP application and the Socket.io real-time engine are configured to validate incoming requests dynamically.
* Instead of hardcoded local hosts, the dynamic CORS whitelist relies on:
  ```javascript
  const allowedOrigins = [
    process.env.CLIENT_URL, // Your live React production URL (Vercel)
    'http://localhost:5173' // Retain for fallback local development testing
  ].filter(Boolean);
  ```
* Any inbound cross-origin requests originating from unauthorized domains are blocked at the application boundary, protecting session sockets and core endpoints.

##### 3. Production Environment Payload Structure
The following keys are isolated and securely configured inside the production environments of the hosting providers:
* `MONGO_URI`: Production-grade connection string pointing to the MongoDB Atlas cluster.
* `JWT_SECRET`: High-entropy secure cryptographic key for web token generation and signature verification.
* `CLIENT_URL`: The fully-qualified production domain of the deployed frontend on Vercel.
* `PORT`: Dynamically assigned by the cloud platform (defaults to `5000` in fallback mode).
* `OPENAI_API_KEY`: Production API key utilized by the AI generation service.