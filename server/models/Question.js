import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['MCQ', 'True-False', 'Short-Answer'],
    },
    options: {
      type: [String],
      // For 'MCQ' it must contain choices.
      // For 'True-False' it defaults to ['True', 'False'].
      // For 'Short-Answer' it remains an empty array.
      validate: {
        validator: function(v) {
          if (this.type === 'MCQ') {
            return v && v.length > 0;
          } else if (this.type === 'True-False') {
            return v && v.length === 2; // Usually ['True', 'False']
          } else if (this.type === 'Short-Answer') {
            return true; // Empty array or any is fine for short answer based on spec
          }
          return true;
        },
        message: 'Invalid options array based on question type.',
      },
      default: function() {
        if (this.type === 'True-False') {
          return ['True', 'False'];
        }
        return [];
      }
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard'],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Question', QuestionSchema);
