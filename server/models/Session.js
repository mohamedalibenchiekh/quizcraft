import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz ID is required"],
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Host (professor) ID is required"],
    },
    pin: {
      type: String,
      required: [true, "Room PIN is required"],
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{6}$/, "PIN must be exactly 6 alphanumeric characters"],
    },
    status: {
      type: String,
      enum: ["waiting", "active", "completed"],
      default: "waiting",
    },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
