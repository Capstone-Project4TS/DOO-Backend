import { Schema, model } from 'mongoose';
const DocumentSchema = new Schema({
    type: {
      type: String,
      enum: ['formdata', 'upload', 'both', 'texteditor'],
      required: true
    },
    formData: {
      type: Object, // Store form data as an object
      default: null
    },
    fileUrl: {
      type: String, // URL for the combined PDF (for formdata + upload)
      default: null
    },
    files: {
      type: [String], // Array of file URLs
      default: []
    }
  });
  
  const WorkflowSchema = new Schema({
    requiredDocuments: [DocumentSchema],
    additionalDocuments: {
      uploads: [String], // File URLs for uploaded files
      textEditorDocs: [String] // File paths or content for text editor documents
    },
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
        // templateId: {
        //     type: Schema.Types.ObjectId,
        //     ref: 'DocumentTemplate',
        //     required: true
        // },
        documentId: {
            type: Schema.Types.ObjectId,
            ref: 'Document'
        }
    },
    // {
    //     required: true
    // }
    ],
    additionalDocuments: [{
        // name: {
        //     type: String,
        //     required: true
        // },
        documentId: {
            type: Schema.Types.ObjectId,
            ref: 'Document'
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
