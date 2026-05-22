import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["MCQ", "True-False", "Short-Answer"],
      required: [true, "Question type is required"],
    },
    text: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    options: {
      type: [String],
      default: [],
    },
    correctAnswer: {
      type: String,
      required: [true, "Correct answer is required"],
      validate: {
        validator: function (value) {
          // Determine the question type and options based on context (doc save vs query update)
          let type = this.type;
          let options = this.options;

          if (!(this instanceof mongoose.Document) && this && typeof this.getUpdate === "function") {
            const update = this.getUpdate();
            const setObj = update.$set || {};
            type = update.type !== undefined ? update.type : setObj.type;
            options = update.options !== undefined ? update.options : setObj.options;
          }

          // If type is not set, allow validation to pass (let schema required check fire if needed)
          if (!type) return false;

          if (type === "True-False") {
            return value === "True" || value === "False";
          }
          if (type === "MCQ") {
            return Array.isArray(options) && options.includes(value);
          }
          if (type === "Short-Answer") {
            return typeof value === "string" && value.trim().length > 0;
          }
          return true;
        },
        message: "Correct answer must match the question type rules (True/False, or be one of the MCQ options).",
      },
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const Question = mongoose.model("Question", questionSchema);
export default Question;
