import mongoose from 'mongoose';

const AttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    baselineQuizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      index: true,
    },
    quizVariantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizVariant',
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        // Snapshot of the question at submit time, so historical reviews
        // survive later quiz edits that delete/recreate Question documents.
        questionText: {
          type: String,
        },
        questionType: {
          type: String,
        },
        options: {
          type: [String],
          default: [],
        },
        difficulty: {
          type: String,
        },
        selectedAnswer: {
          type: String,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
        feedback: {
          type: String,
        },
      },
    ],
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    scoreRatio: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    adaptiveTriggered: {
      type: Boolean,
      default: false,
    },
    adaptiveType: {
      type: String,
      enum: ['remediation', 'enrichment', 'none'],
      default: 'none',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Attempt', AttemptSchema);
