import { Schema, model } from "mongoose";

const WorkflowSchema = new Schema(
  {
    name: {
      type: String,
      // required: true
    },

    workflowTemplate: {
      type: Schema.Types.ObjectId,
      ref: "WorkflowTemplate",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    currentStageIndex: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    assignedUsers: [
      {
        stageIndex: Number,
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        committee: {
          type: Schema.Types.ObjectId,
          ref: "Committee",
        },
      },
    ],
    comments: [
      {
        stageIndex: Number,
        fromUser: { type: Schema.Types.ObjectId, ref: "User" },
        toUser: { type: Schema.Types.ObjectId, ref: "User" },
        comment: String,
        createdAt: { type: Date, default: Date.now },
        visibleTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
    requiredDocuments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Document",
        required: true,
      },
    ],
    additionalDocuments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Workflow = model("Workflow", WorkflowSchema);

export default Workflow;
