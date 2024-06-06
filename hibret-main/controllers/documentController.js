import Document from "../models/document.model.js";
import fs from "fs";
import { generatePDF, uploadPDFToCloudinary } from "../services/fileService.js";
import Media from "../models/media.model.js";
import mongoose from "mongoose";

const getDocumentDetail= async(req,res)=>{
  
  const {id}  = req.params;

  // Validate the provided ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid document ID' });
  }

  try {
    // Find the document by ID
    const document = await Document.findById(id).populate('templateId', 'title');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Sanitize the document to include necessary details only
    const documentDetail = {
      id: document._id,
      templateId: document.templateId._id,
      title: document.title,
      sections: document.sections,
      filePath: document.filePath,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    // Return the document details
    return res.status(200).json({ document: documentDetail });
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}


// Controller function to delete a document by ID
const deleteDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the document by ID and delete it
    const deletedDocument = await Document.findByIdAndDelete(id);

    // Check if the document was found and deleted
    if (!deletedDocument) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Respond with a success message
    return res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Function to handle data and generate PDFs
export async function handleData(reqDocs, addDocs) {
  try {
    console.log("reqDoc:", reqDocs);
    console.log("addDoc:", addDocs);

    const fileUrls = {};

    const processDocs = async (docs) => {
      for (const doc of docs) {
        for (const section of doc.sections) {
          for (const content of section.content) {
            if (content.type === "upload" && Array.isArray(content.value)) {
              const fileIds = content.value;
              try {
                const mediaDocs = await Media.find({ _id: { $in: fileIds } });
                const mediaDocMap = new Map(
                  mediaDocs.map((mediaDoc) => [
                    mediaDoc._id.toString(),
                    mediaDoc.url,
                  ])
                );

                content.value = content.value.map(
                  (id) => mediaDocMap.get(id) || id
                );

                mediaDocs.forEach((mediaDoc) => {
                  fileUrls[mediaDoc._id.toString()] = mediaDoc.url;
                  console.log(`Mapped URL: ${mediaDoc._id} -> ${mediaDoc.url}`);
                });
              } catch (error) {
                console.error("Error fetching media documents:", error);
                throw new Error("Failed to fetch media documents");
              }
            }
          }
        }
      }
    };

    await processDocs(reqDocs);
    if (addDocs.length > 0) {
      await processDocs(addDocs);
    }

    const savedReqDocIds = [];
    const savedAddDocIds = [];

    const generatePDFs = async (docs) => {
      for (const doc of docs) {
        try {
          const pdfName = `document_${Date.now()}`;
          const pdfPath = await generatePDF(doc, fileUrls, pdfName);
          const pdfBuffer = fs.readFileSync(pdfPath);
          const pdfUrl = await uploadPDFToCloudinary(pdfBuffer, pdfName);
          console.log(pdfUrl);

          const newDocument = new Document({
            templateId: doc.templateId,
            title: doc.title,
            sections: doc.sections,
            filePath: pdfUrl,
          });

          const savedDocument = await newDocument.save();
          const id = savedDocument._id;
          if (docs === reqDocs) {
            savedReqDocIds.push(id);
          } else {
            savedAddDocIds.push(id);
          }
        } catch (error) {
          console.error("Error generating or uploading PDF:", error);
          throw new Error("PDF generation/upload failed");
        }
      }
    };

    await generatePDFs(reqDocs);
    if (addDocs.length > 0) {
      await generatePDFs(addDocs);
    }

    return {
      status: 200,
      body: {
        message:
          "PDFs created, uploaded, and saved to the database successfully",
        reqDocIds: savedReqDocIds,
        addDocIds: savedAddDocIds,
      },
    };
  } catch (error) {
    console.error("Error handling form data:", error);
    return { status: 500, body: { message: "Internal server error" } };
  }
}

export default {

  deleteDocumentById,
  getDocumentDetail
};
