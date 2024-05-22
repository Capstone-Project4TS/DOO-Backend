import { Schema, model } from "mongoose";
import mongoose from "mongoose";

const userWorkflowSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  workflows: [
    {
      workflowId: {
        type: Schema.Types.ObjectId,
        ref: "Workflow",
        required: true,
      },
      isActive: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

const UserWorkflow = model("UserWorkflow", userWorkflowSchema);

export default UserWorkflow;
