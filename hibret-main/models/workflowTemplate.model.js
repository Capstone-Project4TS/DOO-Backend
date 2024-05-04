import { Schema, model } from 'mongoose';

const workflowTemplateSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    stages: [{
        name: String,
        approvers: [String],
        conditions: [String], // Optional conditions for transitioning to the next stage
    }],
});

const WorkflowTemplate = model('WorkflowTemplate', workflowTemplateSchema);

export default WorkflowTemplate;
