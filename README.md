# QuizCraft — AI Exam Generator
## Overview
Upload a course document. Get a quiz. It's that simple.
## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, Multer
- **Database**: MongoDB Atlas (Mongoose ODM)
- **AI**: OpenAI GPT-4o-mini via `/api/ai/generate`
## Getting Started
```bash
# Clone and install
git clone https://github.com/mohamedalibenchiekh/quizcraft
cd quizcraft && npm install
# Set environment variables
cp .env.example .env
# Fill in: MONGO_URI, JWT_SECRET, OPENAI_API_KEY, VITE_API_URL, VITE_SOCKET_URL
# Run dev servers
npm run dev:server
npm run dev:client
```
# Node on :5000
# React on :3000
## Key API Endpoints
| Method | Route | Description
|--------|------------------------|--------------------------------|
| POST | /api/upload | Upload PDF/DOCX, extract text |
| POST | /api/ai/generate | Generate questions from text
| GET | /api/quizzes/:id | Fetch quiz with questions
| POST | /api/sessions/start | Launch a live quiz session
| POST | /api/sessions/answer | Submit a student answer

## Deployment
> Frontend: Vercel — connect GitHub repo, set VITE_API_URL and VITE_SOCKET_URL
> Backend: Render — set all .env vars in the dashboard
> Database: MongoDB Atlas — whitelist 0.0.0.0/0 for Render IPs