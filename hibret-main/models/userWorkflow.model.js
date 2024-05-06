import { Schema, model } from 'mongoose';

const userWorkflowSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workflows: [{
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    }
  }]
});

const UserWorkflow = model('UserWorkflow', userWorkflowSchema);

export default UserWorkflow;
