import mongoose from "mongoose";
import Attempt from "../models/Attempt.js";
import Quiz from "../models/Quiz.js";

/**
 * @desc    Fetch analytics for a specific quiz (professor owner only)
 * @route   GET /api/analytics/professor/:quizId
 */
export const getProfessorAnalytics = async (req, res, next) => {
    try {
        const { quizId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(quizId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid quiz ID format.",
            });
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found.",
            });
        }

        // Verify that the requesting professor is the original owner of the target :quizId before executing data collection sequences.
        if (quiz.professorId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Forbidden — You do not own this quiz.",
            });
        }

        // MONGODB AGGREGATION ENGINE
        const results = await Attempt.aggregate([
            { $match: { quizId: new mongoose.Types.ObjectId(quizId) } },
            {
                $facet: {
                    stats: [
                        {
                            $group: {
                                _id: null,
                                totalAttempts: { $sum: 1 },
                                averageScore: { $avg: { $multiply: ["$scoreRatio", 100] } },
                                highestScore: { $max: { $multiply: ["$scoreRatio", 100] } },
                                lowestScore: { $min: { $multiply: ["$scoreRatio", 100] } },
                                remediation: { $sum: { $cond: [{ $eq: ["$adaptiveType", "remediation"] }, 1, 0] } },
                                enrichment: { $sum: { $cond: [{ $eq: ["$adaptiveType", "enrichment"] }, 1, 0] } },
                                none: { $sum: { $cond: [{ $eq: ["$adaptiveType", "none"] }, 1, 0] } }
                            }
                        }
                    ],
                    questionBreakdown: [
                        { $unwind: "$answers" },
                        {
                            $group: {
                                _id: "$answers.questionId",
                                totalAnswers: { $sum: 1 },
                                correctAnswersCount: { $sum: { $cond: ["$answers.isCorrect", 1, 0] } }
                            }
                        },
                        {
                            $lookup: {
                                from: "questions",
                                localField: "_id",
                                foreignField: "_id",
                                as: "questionDetails"
                            }
                        },
                        { $unwind: "$questionDetails" },
                        {
                            $project: {
                                _id: 0,
                                questionId: "$_id",
                                text: "$questionDetails.text",
                                tags: "$questionDetails.tags",
                                correctCount: "$correctAnswersCount",
                                incorrectCount: { $subtract: ["$totalAnswers", "$correctAnswersCount"] },
                                correctPercentage: {
                                    $cond: [
                                        { $gt: ["$totalAnswers", 0] },
                                        { $multiply: [{ $divide: ["$correctAnswersCount", "$totalAnswers"] }, 100] },
                                        0
                                    ]
                                },
                                incorrectPercentage: {
                                    $cond: [
                                        { $gt: ["$totalAnswers", 0] },
                                        { $multiply: [{ $divide: [{ $subtract: ["$totalAnswers", "$correctAnswersCount"] }, "$totalAnswers"] }, 100] },
                                        0
                                    ]
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        const stats = results[0]?.stats?.[0] || {
            totalAttempts: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            remediation: 0,
            enrichment: 0,
            none: 0
        };

        const questionBreakdown = results[0]?.questionBreakdown || [];

        return res.status(200).json({
            success: true,
            data: {
                totalAttempts: stats.totalAttempts,
                averageScore: Math.round(stats.averageScore * 100) / 100,
                highestScore: Math.round(stats.highestScore * 100) / 100,
                lowestScore: Math.round(stats.lowestScore * 100) / 100,
                adaptiveDistribution: {
                    remediation: stats.remediation,
                    enrichment: stats.enrichment,
                    none: stats.none
                },
                questionBreakdown
            }
        });
    } catch (error) {
        next(error);
    }
};
