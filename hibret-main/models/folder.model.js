const mongoose = require('mongoose');

// Define the folder schema
const folderSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  },
  folderPath: {
    type: String
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create the Folder model
const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;
