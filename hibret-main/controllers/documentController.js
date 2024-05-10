import multer from 'multer';
import Document from '../models/document.model.js'
import upload from '../config/multerConfig.js'
import { PDFDocument, rgb } from 'pdf-lib';
import mongoose from 'mongoose';


const createDocument = async (req, res) => {
  try {
    upload.array('files[]')(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Extract common document data
      const { title, creationMethod, ownerId, workflowId, repositoryId, folderId } = req.body;

      // Extract uploaded files
      const files = req.files || [];

      // Save each file as a separate document instance
      const savedDocuments = await Promise.all(files.map(async file => {
        const newDocument = new Document({

          title,
          creationMethod,
          ownerId,
          workflowId,
          repositoryId,
          folderId,
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
    const { title, ownerId, workflowId, repositoryId, folderId, content } = req.body;

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText(content || '', { x: 50, y: 500 });

    // Convert the PDF document to base64
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    // Create a new document with the provided data
    const newDocument = new Document({
      title,
      ownerId,
      workflowId,
      repositoryId,
      folderId,
      pdfBase64, // Store the PDF content as base64
      creationMethod: 'blankPage',
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


export async function getPdfDocument(req, res) {
  try {
    // Retrieve document id from request parameters
    const { id } = req.params;

    // Check if the provided ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Fetch the document from the database based on the documentId
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

  
    const  pdfBytes = Buffer.from(document.pdfBase64, 'base64');

    // Send the decoded content as a response
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(pdfBytes);
    // Send the PDF Base64 string to the frontend
    // return res.status(200).json({ pdfBase64: document.pdfBase64 });
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


export async function generatePdfFromDocumentData(documentsData) {
  try {
    const generatedDocuments = []; // Array to store generated documents

    // Iterate over each document data object
    for (const documentData of documentsData) {
      const { title, ownerId, workflowId, repositoryId, folderId, templateId, sections } = documentData;

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();

      // Add a page to the document
      const page = pdfDoc.addPage();

      // Set document title as heading
      page.drawText(title, { x: 50, y: 750, size: 24, color: rgb(0, 0, 0) });

      let yOffset = 700;

      // Iterate over each section in the document
      for (const section of sections) {
        // Add section title
        yOffset -= 20;
        page.drawText(section.title, { x: 50, y: yOffset, size: 18, color: rgb(0, 0, 0) });
        yOffset -= 30;

        // Iterate over content in the section
        for (const contentItem of section.content) {
          // Add content based on type
          yOffset -= 15;
          const fieldText = `${contentItem.title}: ${contentItem.value}`;
          page.drawText(fieldText, { x: 50, y: yOffset, size: 12, color: rgb(0, 0, 0) });
          yOffset -= 20;
        }
      }

      // Serialize PDF document to bytes
      const pdfBytes = await pdfDoc.save();

      // Convert PDF buffer to Base64 string
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

      // Save PDF in the database along with document data
      const newDocument = new Document({
        title,
        ownerId,
        workflowId,
        repositoryId,
        folderId,
        templateId,
        pdfBase64,
        sections, // Store the sections data along with the document
        creationMethod: 'template',
      });

      await newDocument.save();

      // Add document to the array of generated documents
      generatedDocuments.push(newDocument);
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
    generatePdfFromDocumentData,
    getPdfDocument,
  };
