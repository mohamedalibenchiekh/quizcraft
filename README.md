# 🧠 QuizCraft

**An enterprise-grade, adaptive AI-powered learning management and assessment platform that leverages advanced LLM intelligence to build personalized, mathematically accurate adaptive assessment workflows.**

![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20MongoDB%20%7C%20Gemini%20AI-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)

---

## 📊 Core Value Pillars & Features

### Advanced Question Matrix
Granular parameter control allowing professors to select explicit counts per question type (**MCQ**, **True-False**, **Short-Answer**) mapped against target difficulty levels (**Easy**, **Medium**, **Hard**). The AI generates questions that precisely match the specified distribution.

### ⚡ Phase 4 Adaptive Difficulty Engine
Automated evaluation loops that detect struggling or excelling student performance in real-time. Leverages an immutable **QuizVariant** factory model to instantly serve personalized remediation decks (for struggling students) or enrichment decks (for excelling students). The system tracks attempt depth and enforces maximum remediation limits to prevent infinite loops.

### 🎯 Hybrid Semantic Short-Answer Grading
Eliminates rigid string-matching limitations through a two-tier grading approach:
1. **Fast-pass sanitization** — exact match detection after normalization
2. **AI fallback** — contextual evaluation using `gemini-2.5-flash` to grade open-ended answers fairly and accurately, with structured JSON output and injection protection

### 🛡️ Enterprise Authentication Lifecycle
Unified security system supporting:
- **Google OAuth** — One-click registration/login via `@react-oauth/google`
- **Email verification** — Cryptographically secure token-based verification with expiration
- **Password recovery** — Expiring token reset workflows delivered via transactional email
- **Role-based access** — Distinct professor and student experiences

### 🎨 High-Fidelity UI/UX Layouts
Interactive, high-performance dark-theme workspace featuring:
- Sticky control panels for persistent navigation
- Quick-scrolling anchor navigation rails
- Global view accordion expansion grids
- Responsive design with Tailwind CSS
- Real-time collaboration via Socket.io

---

## 🏗️ System Architecture & Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI component framework |
| **Vite** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **React Router DOM 7** | Client-side routing |
| **Axios** | HTTP client |
| **@react-oauth/google** | Google OAuth integration |
| **Lucide React** | Icon library |
| **Socket.io-client** | Real-time communication |
| **Vitest** | Unit testing framework |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express** | Web application framework |
| **MongoDB / Mongoose** | Database & ODM |
| **Socket.io** | Real-time bidirectional communication |
| **JWT** | Authentication tokens |
| **Bcrypt** | Password hashing |

### AI & External Services
| Technology | Purpose |
|------------|---------|
| **Google Gen AI SDK** | LLM integration (`gemini-2.5-flash`) |
| **Nodemailer** | Transactional email delivery |
| **Google Auth Library** | OAuth2 credential verification |
| **Multer** | File upload handling |
| **PDF-parse / Mammoth** | Document text extraction |

---

## 📁 Project Workspace Directory Structure

```
quizcraft/
├── client/                          # React frontend application
│   ├── src/
│   │   ├── pages/                   # Route-based page components
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── ProfessorDashboard.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── QuizGenerator.jsx
│   │   │   ├── QuizEdit.jsx
│   │   │   ├── TakeQuiz.jsx
│   │   │   ├── StudentSession.jsx
│   │   │   ├── HostSession.jsx
│   │   │   ├── QuizAnalytics.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── VerifyEmail.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── AIParameterForm.jsx
│   │   │   ├── FileDropzone.jsx
│   │   │   ├── ActiveQuizEngine.jsx
│   │   │   ├── AdaptiveReadinessPanel.jsx
│   │   │   ├── QuestionPreviewCard.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── context/                 # React context providers
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useLocalStorage.js
│   │   │   └── useQuizForm.js
│   │   ├── services/                # API & socket clients
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── utils/                   # Utility functions
│   │   │   ├── adaptiveQuiz.js
│   │   │   └── quizConstants.js
│   │   ├── tests/                   # Component tests
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── server/                          # Node.js backend API
│   ├── models/                      # MongoDB schemas
│   │   ├── User.js
│   │   ├── Quiz.js
│   │   ├── Question.js
│   │   ├── QuizVariant.js
│   │   ├── Attempt.js
│   │   └── Session.js
│   ├── controllers/                 # Request handlers
│   │   ├── authController.js
│   │   ├── quizController.js
│   │   ├── attemptController.js
│   │   ├── sessionController.js
│   │   ├── studentController.js
│   │   ├── userController.js
│   │   └── analyticsController.js
│   ├── routes/                      # API endpoint definitions
│   │   ├── auth.js
│   │   ├── quizzes.js
│   │   ├── attempts.js
│   │   ├── sessions.js
│   │   ├── users.js
│   │   ├── analytics.js
│   │   ├── ai.js
│   │   └── upload.js
│   ├── services/                    # Business logic layer
│   │   ├── aiService.js
│   │   ├── geminiService.js
│   │   ├── adaptiveEngine.js
│   │   └── shortAnswerEvaluator.js
│   ├── middleware/                  # Express middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── upload.js
│   ├── utils/                       # Helper utilities
│   │   ├── sendEmail.js
│   │   ├── textExtractor.js
│   │   ├── gradingUtils.js
│   │   └── scoreboardManager.js
│   ├── config/                      # Configuration modules
│   │   ├── db.js
│   │   ├── env.js
│   │   └── socket.js
│   ├── tests/                       # API & integration tests
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── .gitignore
├── README.md
└── package-lock.json
```

---

## 🚀 Quick-Start Guide & Environment Setup

### Prerequisites
- **Node.js** v18+ (LTS recommended)
- **MongoDB** (local instance or MongoDB Atlas)
- **npm** or **yarn** package manager

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/mohamedalibenchiekh/quizcraft.git
cd quizcraft
```

#### 2. Install Backend Dependencies
```bash
cd server
npm install
```

#### 3. Configure Backend Environment
Create a `.env` file in the `server/` directory with the following configuration:

```text
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_signing_key
JWT_EXPIRES_IN=7d

# Google AI (Gemini)
GEMINI_API_KEY=your_google_ai_studio_token

# Google OAuth
GOOGLE_CLIENT_ID=your_oauth_client_id

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_transactional_email
SMTP_PASS=your_app_specific_password
SMTP_FROM=QuizCraft <noreply@quizcraft.com>

# Frontend URL (for CORS & email links)
CLIENT_URL=http://localhost:5173
```

#### 4. Install Frontend Dependencies
```bash
cd ../client
npm install
```

#### 5. Configure Frontend Environment
Create a `.env` file in the `client/` directory:

```text
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Running the Development Servers

#### Option A: Run Separately (Two Terminals)

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Server running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Client running on http://localhost:5173
```

#### Option B: Concurrent Execution (Single Terminal)
From the root directory, if you have a concurrent runner configured:
```bash
npm run dev
```

### Running Tests

**Backend Tests:**
```bash
cd server
npm test
```

**Frontend Tests:**
```bash
cd client
npm test
```

---

## 📚 Key API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate user |
| `POST` | `/api/auth/google` | Google OAuth authentication |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password/:token` | Reset password with token |
| `GET` | `/api/auth/verify/:token` | Verify email address |
| `POST` | `/api/upload` | Upload course document (PDF/DOCX) |
| `POST` | `/api/ai/generate` | Generate quiz questions from text |
| `GET` | `/api/quizzes` | Fetch all quizzes (professor) |
| `GET` | `/api/quizzes/:id` | Fetch single quiz details |
| `PUT` | `/api/quizzes/:id` | Update quiz configuration |
| `POST` | `/api/sessions/start` | Launch a live quiz session |
| `POST` | `/api/sessions/:id/answer` | Submit student answer |
| `GET` | `/api/sessions/:id/results` | Get session results |
| `GET` | `/api/analytics/quiz/:id` | Fetch quiz analytics |

---

## 🌐 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables:
   - `VITE_API_URL` — Your production API endpoint
   - `VITE_SOCKET_URL` — Your production Socket.io URL
3. Deploy

### Backend (Render / Railway / AWS)
1. Set all `.env` variables in your hosting platform's dashboard
2. Ensure MongoDB Atlas whitelist includes `0.0.0.0/0` for platform IPs
3. Configure CORS to allow your frontend domain
4. Deploy

### Database (MongoDB Atlas)
1. Create a cluster on [MongoDB Atlas](https://cloud.mongodb.com)
2. Obtain the connection string
3. Whitelist application IP addresses
4. Create database user with read/write permissions

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For issues, questions, or contributions, please open an issue on the [GitHub repository](https://github.com/mohamedalibenchiekh/quizcraft/issues).

---

**Built with ❤️ by Mohamed Ali Ben Cheikh**