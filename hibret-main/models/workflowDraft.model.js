import { Schema, model } from "mongoose";

const DraftWorkflowSchema = new Schema(
 { userId:{
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  workflowId:{
    type: Schema.Types.ObjectId,
    ref: "Workflow",
    required: true,
  },
});

const DraftWorkflow = model("DraftWorkflow", DraftWorkflowSchema);

export default DraftWorkflow;