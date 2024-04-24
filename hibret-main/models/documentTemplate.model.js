const mongoose = require('mongoose');

// Define the document template schema
const documentTemplateSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  documentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentType',
    required: true
  },
  sections: [{
    sectionHeader: {
      type: String,
      required: true
    },
    sectionDataType: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean'],
      required: true
    }
  }]
});

// Create the DocumentTemplate model
const DocumentTemplate = mongoose.model('DocumentTemplate', documentTemplateSchema);

module.exports = DocumentTemplate;
