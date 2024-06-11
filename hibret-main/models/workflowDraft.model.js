import { Schema, model } from "mongoose";

const DraftWorkflowSchema = new Schema(
 { userId:{
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    // required: true
  },

  workflowTemplate: {
    type: Schema.Types.ObjectId,
    ref: "WorkflowTemplate",
    required: true,
  },
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
});

const DraftWorkflow = model("DraftWorkflow", DraftWorkflowSchema);

export default DraftWorkflow;