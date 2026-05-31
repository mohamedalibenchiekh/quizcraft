import Quiz from "../models/Quiz.js";
import Attempt from "../models/Attempt.js";

/**
 * @desc    Get role-specific profile statistics for the authenticated user
 * @route   GET /api/users/profile/stats
 */
export const getProfileStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (req.user.role === "professor") {
      const quizzes = await Quiz.find({ professorId: userId })
        .select("title isApproved questions createdAt")
        .sort({ createdAt: -1 })
        .lean();

      const totalQuizzes = quizzes.length;
      const quizIds = quizzes.map((q) => q._id);

      let avgStudentScore = 0;
      if (quizIds.length > 0) {
        const pipeline = [
          { $match: { quizId: { $in: quizIds } } },
          { $group: { _id: null, avg: { $avg: "$scoreRatio" } } },
        ];
        const result = await Attempt.aggregate(pipeline);
        if (result.length > 0) {
          avgStudentScore = Math.round(result[0].avg * 100);
        }
      }

      const recentQuizzes = quizzes.slice(0, 5).map((q) => ({
        _id: q._id,
        title: q.title,
        isApproved: q.isApproved,
        questionCount: q.questions ? q.questions.length : 0,
        createdAt: q.createdAt,
      }));

      return res.status(200).json({
        success: true,
        data: { totalQuizzes, avgStudentScore, recentItems: recentQuizzes },
      });
    }

    // Student role — count all, fetch only latest 5
    const [totalCount, maxResult, recentAttempts] = await Promise.all([
      Attempt.countDocuments({ userId }),
      Attempt.findOne({ userId }).sort({ scoreRatio: -1 }).select("scoreRatio").lean(),
      Attempt.find({ userId })
        .select("scoreRatio quizId createdAt")
        .populate({ path: "quizId", select: "title" })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const quizzesTaken = totalCount;
    const highestScore =
      maxResult
        ? Math.round(maxResult.scoreRatio * 100)
        : 0;

    const recentItems = recentAttempts.map((a) => ({
      _id: a._id,
      quizTitle: a.quizId ? a.quizId.title : "Unknown",
      scoreRatio: a.scoreRatio,
      createdAt: a.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: { quizzesTaken, highestScore, recentItems },
    });
  } catch (error) {
    next(error);
  }
};
