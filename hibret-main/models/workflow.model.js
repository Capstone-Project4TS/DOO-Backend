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
    templateVersion: {
      type: Number,
      // required: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
    },
    deleteAfter: {
      type: Date,
  
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
    enum: ["Pending", "Approved", "Rejected", "Cancelled","Draft"],
    default: "Pending",
  },
  cancellationReason: {
    type: String,
  },
  assignedUsers: [
    {
      stageIndex: Number,
      userType: {
        type: String,
        enum: ["User", "Committee"],
      },
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
      toCommittee: { type: Schema.Types.ObjectId, ref: "Committee" },
      memberOf: { type: Schema.Types.ObjectId, ref: "Committee" },
      comment: String,
      createdAt: { type: Date, default: Date.now },
      decision: {
        type: String,
        enum: ["Approved", "Revert", "Rejected", "Forward"]
      },
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
  votes: [
    {
      stageIndex: Number,
      committeId: {
        type: Schema.Types.ObjectId,
        ref: 'Committee'
      },
      memberId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      decision: {
        type: String,
        enum: ['approve', 'reject', 'forward', 'backward']
      },
      
    },
  ],
},
  {
    timestamps: true,
  }
);

const Workflow = model("Workflow", WorkflowSchema);

export default Workflow;
