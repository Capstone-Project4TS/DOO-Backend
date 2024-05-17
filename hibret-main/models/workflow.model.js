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
        templateId: {
            type: Schema.Types.ObjectId,
            ref: 'DocumentTemplate',
            required: true
        },
        type: Schema.Types.ObjectId,
        ref: 'Document'
        // documentId: {
        //     type: Schema.Types.ObjectId,
        //     ref: 'Document',
        //     required: true
        // }
        
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
        type: Schema.Types.ObjectId,
        ref: 'Document',
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
    comments: [{
        stageIndex: Number,
        fromUser: { type: Schema.Types.ObjectId, ref: 'User' },
        toUser: { type: Schema.Types.ObjectId, ref: 'User' },
        comment: String,
        createdAt: { type: Date, default: Date.now },
        visibleTo: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    }]
});

const Workflow = model('Workflow', WorkflowSchema);

export default Workflow;
