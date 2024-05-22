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
    ref: "SubCategory",
  },

  workflows: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the Folder model
const Folder = mongoose.model("Folder", folderSchema);

export default Folder;
