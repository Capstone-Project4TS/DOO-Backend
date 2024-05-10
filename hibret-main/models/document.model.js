import mongoose from 'mongoose';

// Define the document schema
const documentSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  title: {
    type: String,
    // required: true
  },

  filePath: {
    type: String,
    required: false // This field is required for documents created through uploading
  },
  pdfBase64: {
    type: String, // Stores Base64-encoded PDF data
    required: false // Adjust based on your workflow
  },
  creationDate: {
    type: Date,
    default: Date.now
  },
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow'
  },
  repositoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repository',
    required: false
  },
  versions: [{
    versionNumber: String,
    filePath: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentTemplate'
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  },
  creationMethod: {
    type: String,
    enum: ['template', 'fileUpload', 'blankPage'],
    // required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true
  },
  acl: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    permissions: [String]
  }]
});

// Create the Document model
const Document = mongoose.model('Document', documentSchema);

export default  Document;
