import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: [true, "Room code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz ID is required"],
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
