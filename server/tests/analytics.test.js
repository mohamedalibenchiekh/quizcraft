import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import app from "../app.js";
import User from "../models/User.js";
import Attempt from "../models/Attempt.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

process.env.JWT_SECRET = "supersecretfortesting";

describe("Professor Metrics & Analytics Pipeline Integration Tests", () => {
    let mongoServer;
    let professorToken;
    let professorId;
    let studentId1;
    let studentId2;
    let quizId;
    let questionIds;

    beforeAll(async () => {
        mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash("password123", salt);

        // Create Professor
        const professor = await User.create({
            name: "Test Professor",
            email: "prof@test.com",
            password: hashedPassword,
            role: "professor",
        });
        professorId = professor._id;

        professorToken = jwt.sign(
            { id: professor._id.toString(), email: professor.email, role: professor.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Create Students
        const student1 = await User.create({
            name: "Student One",
            email: "student1@test.com",
            password: hashedPassword,
            role: "student",
        });
        studentId1 = student1._id;

        const student2 = await User.create({
            name: "Student Two",
            email: "student2@test.com",
            password: hashedPassword,
            role: "student",
        });
        studentId2 = student2._id;

        // Create Questions
        const q1 = await Question.create({
            text: "What is 2+2?",
            type: "MCQ",
            options: ["3", "4", "5"],
            correctAnswer: "4",
            difficulty: "easy",
            tags: ["math", "arithmetic"],
        });

        const q2 = await Question.create({
            text: "Is JavaScript single-threaded?",
            type: "True-False",
            options: ["True", "False"],
            correctAnswer: "True",
            difficulty: "medium",
            tags: ["javascript", "concurrency"],
        });

        questionIds = [q1._id, q2._id];

        // Create Quiz owned by the professor
        const quiz = await Quiz.create({
            title: "Test Analytics Quiz",
            description: "Quiz for metrics aggregation testing",
            professorId: professorId,
            questions: questionIds,
            isApproved: true,
        });
        quizId = quiz._id;
    });

    describe("GET /api/analytics/professor/:quizId", () => {
        it("should aggregate attempts correctly and calculate 75% average score", async () => {
            // Seed attempt 1: 100% score (2/2 correct), adaptiveType: enrichment
            await Attempt.create({
                userId: studentId1,
                quizId: quizId,
                answers: [
                    { questionId: questionIds[0], selectedAnswer: "4", isCorrect: true },
                    { questionId: questionIds[1], selectedAnswer: "True", isCorrect: true },
                ],
                score: 2,
                totalQuestions: 2,
                scoreRatio: 1.0,
                adaptiveTriggered: true,
                adaptiveType: "enrichment",
            });

            // Seed attempt 2: 50% score (1/2 correct), adaptiveType: remediation
            await Attempt.create({
                userId: studentId2,
                quizId: quizId,
                answers: [
                    { questionId: questionIds[0], selectedAnswer: "4", isCorrect: true },
                    { questionId: questionIds[1], selectedAnswer: "False", isCorrect: false },
                ],
                score: 1,
                totalQuestions: 2,
                scoreRatio: 0.5,
                adaptiveTriggered: true,
                adaptiveType: "remediation",
            });

            // Execute request with professor token
            const res = await request(app)
                .get(`/api/analytics/professor/${quizId}`)
                .set("Authorization", `Bearer ${professorToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const data = res.body.data;
            expect(data.totalAttempts).toBe(2);
            expect(data.averageScore).toBe(75); // Exactly 75%
            expect(data.highestScore).toBe(100);
            expect(data.lowestScore).toBe(50);

            // Verify adaptive distribution
            expect(data.adaptiveDistribution).toEqual({
                remediation: 1,
                enrichment: 1,
                none: 0,
            });

            // Verify question breakdown
            expect(data.questionBreakdown).toHaveLength(2);

            const q1Breakdown = data.questionBreakdown.find(
                (q) => q.questionId.toString() === questionIds[0].toString()
            );
            expect(q1Breakdown).toBeDefined();
            expect(q1Breakdown.text).toBe("What is 2+2?");
            expect(q1Breakdown.correctCount).toBe(2);
            expect(q1Breakdown.incorrectCount).toBe(0);
            expect(q1Breakdown.correctPercentage).toBe(100);
            expect(q1Breakdown.incorrectPercentage).toBe(0);

            const q2Breakdown = data.questionBreakdown.find(
                (q) => q.questionId.toString() === questionIds[1].toString()
            );
            expect(q2Breakdown).toBeDefined();
            expect(q2Breakdown.text).toBe("Is JavaScript single-threaded?");
            expect(q2Breakdown.correctCount).toBe(1);
            expect(q2Breakdown.incorrectCount).toBe(1);
            expect(q2Breakdown.correctPercentage).toBe(50);
            expect(q2Breakdown.incorrectPercentage).toBe(50);
        });

        it("should return 403 Forbidden if a different professor requests the analytics", async () => {
            const otherProfSalt = await bcrypt.genSalt(12);
            const otherProfHashedPassword = await bcrypt.hash("password123", otherProfSalt);
            const otherProf = await User.create({
                name: "Other Professor",
                email: "otherprof@test.com",
                password: otherProfHashedPassword,
                role: "professor",
            });

            const otherProfToken = jwt.sign(
                { id: otherProf._id.toString(), email: otherProf.email, role: otherProf.role },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            const res = await request(app)
                .get(`/api/analytics/professor/${quizId}`)
                .set("Authorization", `Bearer ${otherProfToken}`);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("Forbidden");
        });

        it("should return 401 Unauthorized if no token is provided", async () => {
            const res = await request(app).get(`/api/analytics/professor/${quizId}`);
            expect(res.status).toBe(401);
        });

        it("should return 404 if the quiz does not exist", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/analytics/professor/${fakeId}`)
                .set("Authorization", `Bearer ${professorToken}`);

            expect(res.status).toBe(404);
        });
    });
});
