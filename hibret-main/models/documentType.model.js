import mongoose from 'mongoose';

// Define the document type schema
const documentTypeSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  }
});

// Create the DocumentType model
const DocumentType = mongoose.model('DocumentType', documentTypeSchema);

export default DocumentType;
