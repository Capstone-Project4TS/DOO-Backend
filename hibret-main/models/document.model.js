import mongoose from "mongoose";

// Define the document schema
const documentSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentTemplate",
    },
    title: {
      type: String,
      // required: true
    },

    sections: [
      {
        title: {
          type: String,
          required: true,
        },
        // Object to store key-value pairs for content within a section
        content: {
          type: Object,
          required: true,
        },
      },
    ],

    filePath: 
      {
        type: String,
        required: false, 
      }
    
  },
  {
    timestamps: true,
  }
);

// Create the Document model
const Document = mongoose.model("Document", documentSchema);

export default Document;
