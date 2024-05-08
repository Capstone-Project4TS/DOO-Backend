// documentController.js
import multer from 'multer';
import Document from '../models/document.model.js'
import upload from '../config/multerConfig.js'
import { createWriteStream } from 'fs';
import { createPdf } from 'pdfmake/build/pdfmake.js';
import pkg from 'pdfmake/build/vfs_fonts.js';
const { vfs } = pkg;



const createDocument = async (req, res) => {
  try {
    upload.array('files[]')(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Extract common document data
      const {  eId, title, creationMethod, ownerId, workflowId, repositoryId, folderId, templateId } = req.body;

      // Extract uploaded files
      const files = req.files || [];

      // Save each file as a separate document instance
      const savedDocuments = await Promise.all(files.map(async file => {
        const newDocument = new Document({
          documentTypeId,
          title,
          creationMethod,
          ownerId,
          workflowId,
          repositoryId,
          folderId,
          templateId,
          filename: file.originalname,
          filePath: file.path
        });
        return await newDocument.save();
      }));

      // Respond with success message and saved document details
      return res.status(200).json({ message: 'Documents created successfully', documents: savedDocuments });
    });
  } catch (error) {
    console.error('Error creating documents:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



// Controller function to get all documents
const getAllDocuments = async (req, res) => {
  try {
    // Query all documents from the database
    const documents = await Document.find();

    // Respond with the retrieved documents
    return res.status(200).json({ documents });
  } catch (error) {
    console.error('Error retrieving documents:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Document not found' });
    }

    // Respond with the retrieved document
    return res.status(200).json({ document });
  } catch (error) {
    console.error('Error retrieving document:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



// Controller function to get documents based on filters
const getDocumentsByFilter = async (req, res) => {
  try {
    // Extract filter parameters from the query string
    const { title, owner, creationDate } = req.query;

    // Build the filter object based on the provided parameters
    const filter = {};

    if (title) {
      filter.title = title;
    }

    if (owner) {
      filter.ownerId = owner;
    }

    if (creationDate) {
      filter.creationDate = creationDate; // You might need to parse the date format
    }

    // Query the database with the filter object
    const documents = await Document.find(filter);

    // Respond with the retrieved documents
    return res.status(200).json({ documents });
  } catch (error) {
    console.error('Error retrieving documents by filter:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Document not found' });
    }

    // Respond with a success message
    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// Controller function to create a new document from a blank page
export const createDocumentFromBlank = async (req, res) => {
  try {
    const { documentTypeId, title, ownerId, workflowId, repositoryId, folderId, templateId, content } = req.body;

    // Create a new document with the provided data
    const newDocument = new Document({
      documentTypeId,
      title,
      ownerId,
      workflowId,
      repositoryId,
      folderId,
      templateId,
      content, // Assuming content is a field in your Document model to store the document content
      creationMethod: 'blankPage', // Set the creation method to indicate it's from a blank page
    });

    // Save the new document to the database
    const savedDocument = await newDocument.save();

    // Respond with success message and saved document details
    return res.status(200).json({ message: 'Document created successfully', document: savedDocument });
  } catch (error) {
    console.error('Error creating document from blank:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


export async function generatePdfFromDocumentData(documentsData) {
  try {
      const generatedDocuments = []; // Array to store generated documents
      
      // Iterate over each document data object
      for (const documentData of documentsData) {
          const { title, name, sections, documentTemplate } = documentData;

          // Define a PDF document definition
          const documentDefinition = {
              content: []
          };

          // Add document name and description as title
          documentDefinition.content.push({ text: title, style: 'title' });
          documentDefinition.content.push({ text: name, style: 'name' });

          // Iterate over each section in the document
          sections.forEach(section => {
              // Add section header
              documentDefinition.content.push({ text: section.title, style: 'header' });

              // Add section content based on section data type
              switch (section.type) {
                  case 'text':
                      // Add text input field
                      documentDefinition.content.push({ text: content.value }); // Replace with actual input value
                      break;
                  case 'number':
                      // Add number input field
                      documentDefinition.content.push({ text: content.value }); // Replace with actual input value
                      break;
                  // Add cases for other data types as needed
              }
          });

          // Create PDF
          const pdf = createPdf(documentDefinition, null, vfs);

          // Convert PDF buffer to Base64 string
          const pdfBase64 = pdf.toString('base64');

          // Save PDF in the database
          const newDocument = new Document({
              title,
              name,
              pdfBase64,
              sections,
              templateId: documentTemplate // Pair document with document template
          });
          await newDocument.save();

          // Add document to the array of generated documents
          generatedDocuments.push({
            documentTemplate: documentTemplate,
            data: newDocument
            
        });
         
      }

      return generatedDocuments;
  } catch (error) {
      console.error('Error generating PDFs:', error);
      throw new Error('Failed to generate PDFs');
  }
}


export default 
{
     createDocument, 
     getAllDocuments, 
     getDocumentById, 
     getDocumentsByFilter, 
     deleteDocumentById,
     createDocumentFromBlank,
     generatePdfFromDocumentData
 };
