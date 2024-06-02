import mongoose from "mongoose";

// Define the folder schema
const folderSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  name: {
    type: String,
    required: true,
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder"
  },
  folders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Folder' }],
  workflows: [
    {
      workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow'  },
      documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document'  }],
     
    }
    
  ]},{
  timestamps: true
});

// Create the Folder model
const Folder = mongoose.model("Folder", folderSchema);

export default Folder;
