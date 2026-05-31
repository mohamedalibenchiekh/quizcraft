import mongoose from 'mongoose';

const QuizVariantSchema = new mongoose.Schema({
  baselineQuizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['remediation', 'enrichment'],
    required: true,
  },
  attemptDepth: {
    type: Number,
    default: 1,
  },
  questions: {
    type: Array,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

QuizVariantSchema.index({ baselineQuizId: 1, studentId: 1, type: 1, attemptDepth: -1 });

export default mongoose.model('QuizVariant', QuizVariantSchema);
