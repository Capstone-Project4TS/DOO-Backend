import { Schema, model } from 'mongoose';

const WorkflowSchema = new Schema({
    workflowTemplate: {
        type: Schema.Types.ObjectId,
        ref: 'WorkflowTemplate',
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    documents: [{
        documentTemplate: {
            type: Schema.Types.ObjectId,
            ref: 'DocumentTemplate',
            required: true
        },
        data: {
            type: Schema.Types.Mixed
        },
        
    },
    {
    required: true
    }
],
    additionalDocuments: [{
        name: {
            type: String,
            required: true
        },
        content: {
            type: String // or Buffer for file content
        },
        file: {
            type: String // Store file metadata or file paths
        }
    }],
    currentStageIndex: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    assignedUsers: [{
        stageIndex: Number,
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        committee: {
            type: Schema.Types.ObjectId,
            ref: 'Committee'
        }
    }],
    // Add any other fields as needed
});

const Workflow = model('Workflow', WorkflowSchema);

export default Workflow;
