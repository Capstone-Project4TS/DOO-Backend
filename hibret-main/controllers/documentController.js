import Document from "../models/document.model.js";
import fs from "fs";
import {generatePDF,uploadFilesToCloudinary,uploadPDFToCloudinary} from '../services/fileService.js'
import Media from "../models/media.model.js"


// Controller function to get all documents
const getAllDocuments = async (req, res) => {
  try {
    // Query all documents from the database
    const documents = await Document.find();

    // Respond with the retrieved documents
    return res.status(200).json({ documents });
  } catch (error) {
    console.error("Error retrieving documents:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to get a document by ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Query the database for the document with the specified ID
    const document = await Document.findById(id);

    // Check if the document exists
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Respond with the retrieved document
    return res.status(200).json({ document });
  } catch (error) {
    console.error("Error retrieving document:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to get documents based on filters

const getDocumentsByFilter = async (req, res) => {
  try {
    // Extract filter parameters from the query string
    const { title, createdAt } = req.query;

    // Build the filter object based on the provided parameters
    const filter = {};

    if (title) {
      filter.title = title;
    }

    if (createdAt) {
      filter.createdAt = new Date(createdAt); // Ensure the date is properly formatted
    }

    // Query the database with the filter object
    const documents = await Document.find(filter);

    // Respond with the retrieved documents
    return res.status(200).json({ documents });
  } catch (error) {
    console.error("Error retrieving documents by filter:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

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
                const mediaDocs = await Media.find({ _id: { $in: fileIds }, tempId: doc.templateId });
                mediaDocs.forEach((mediaDoc, index) => {
                  fileUrls[content.value[index]] = mediaDoc.url;
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
          const id=savedDocument._id
          if (docs === reqDocs) {
           
            savedReqDocIds.push( id );
          } else {
            savedAddDocIds.push(id );
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
        message: "PDFs created, uploaded, and saved to the database successfully",
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
  getAllDocuments,
  getDocumentById,
  getDocumentsByFilter,
  deleteDocumentById,
};
