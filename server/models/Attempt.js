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
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        selectedAnswer: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
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
