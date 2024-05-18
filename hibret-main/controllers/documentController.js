import Document from '../models/document.model.js'
import upload from '../config/multerConfig.js'
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import DocumentTemplate from '../models/documentTemplate.model.js';
import PDFMerger from 'pdf-merger-js';
import mongoose from 'mongoose';
import {v2 as cloudinary} from 'cloudinary';
// import streamBuffers from 'stream-buffers'

cloudinary.config({
  cloud_name: 'dyq4ebuhd',
  api_key: '942999454788951',
  api_secret: 'zg5q1wQm0EccYjhm-87oszajIkw'
});

const convertFormDataToPDFWithLinks = async (formData, fileUrls = []) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  // Add form data to the PDF
  const formDataText = JSON.stringify(formData, null, 2);
  page.drawText(formDataText, {
    x: 50,
    y: height - 50,
    size: 12,
    color: rgb(0, 0, 0)
  });

  // Add file URLs to the PDF as clickable links
  let linkYPosition = height - 100;
  fileUrls.forEach((url, index) => {
    page.drawText(`File ${index + 1}:`, {
      x: 50,
      y: linkYPosition,
      size: 12,
      color: rgb(0, 0, 0)
    });

    page.drawText(url, {
      x: 100,
      y: linkYPosition,
      size: 12,
      color: rgb(0, 0, 1),
      link: url
    });

    linkYPosition -= 20;
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

const uploadFilesToCloudinary = async (files) => {
  console.log("Preparing to upload files to Cloudinary");
  console.log(files);

  const uploadPromises = files.map(file => {
    return new Promise((resolve, reject) => {
      if (!file || !file.buffer) {
        console.log(`File buffer is empty or undefined for: ${file.originalname}`);
        return reject(new Error('Empty file buffer'));
      }

      if (file.buffer.length === 0) {
        console.log(`Skipping empty file: ${file.originalname}`);
        return reject(new Error('Empty file'));
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) {
            console.error("Error during upload:", error);
            return reject(error);
          }
          if (!result) {
            console.error("Upload failed with undefined result");
            return reject(new Error("Upload failed with undefined result"));
          }
          console.log(`Successfully uploaded file: ${file.originalname}`);
          resolve(result.secure_url);
        }
      );

      uploadStream.end(file.buffer);
    });
  });

  return Promise.all(uploadPromises);
};


const uploadPDFToCloudinary = async (pdfBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { resource_type: 'raw', format: 'pdf' },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(pdfBuffer);
  });
};


const createDocument = async (req, res) => {
  try {
    upload.array('files[]')(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Extract common document data
      // const { title, ownerId, workflowId, repositoryId, folderId } = req.body;
      const { title, ownerId, workflowId, repositoryId, folderId } = req.body;


      // Extract uploaded files
      const files = req.files || [];

      // Save each file as a separate document instance
      const savedDocuments = await Promise.all(files.map(async file => {
        const newDocument = new Document({

          title,
          creationMethod: 'fileUpload',
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
// const getDocumentById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Query the database for the document with the specified ID
//     const document = await Document.findById(id);

//     // Check if the document exists
//     if (!document) {
//       return res.status(404).json({ error: 'Document not found' });
//     }

//     // Respond with the retrieved document
//     return res.status(200).json({ document });
//   } catch (error) {
//     console.error('Error retrieving document:', error);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// };


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
    const { id } = req.params;
    // Retrieve the PDF from the database
    // Retrieve the document by ID
    const document = await Document.findById(id);

    if (!document || !document.mergedPdf) {
      return res.status(404).send('PDF not found');
    }

    // Check if mergedPdf is already a Buffer
    let pdfBuffer = document.mergedPdf;

    // If mergedPdf is a base64 string, convert it to a Buffer
    if (typeof pdfBuffer === 'string') {
      pdfBuffer = Buffer.from(pdfBuffer, 'base64');
    }
    // Send the PDF content as a response
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error retrieving PDF from database:', error);
    res.status(500).send('Internal Server Error');
  }
}

export async function getDocumentById(req, res) {
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

    const pdfBytes = Buffer.from(document.pdfBase64, 'base64');

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

export async function getUploadedDoc(req, res) {
  try {
    const { id } = req.params;

    // Find the file by ID in the database
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // For simplicity, assuming the file is stored in the file system
    fs.readFile(document.filePath, (err, data) => {
      if (err) {
        console.error('Error reading file:', err);
        return res.status(500).json({ error: 'Failed to read file' });
      }
      // Send the file data to the frontend
      res.status(200).json({ fileData: data });
    });
  } catch (error) {
    console.error('Error retrieving file:', error);
    return res.status(500).json({ error: 'Failed to retrieve file' });
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

export async function handleData(req, res) {
  const { reqDoc } = req.body;
  const files = req.files;
  console.log("files sent")
  console.log(reqDoc)
 const reqDocs = JSON.parse(reqDoc);
  const addition = []
  try {

    const processedDocuments = [];
    for (const doc of reqDocs) {
      console.log("iterating through files")
      console.log(doc)
      let fileUrls = [];
      if (doc.file && doc.file.length > 0) {
        console.log("it has uploaded files")
        console.log(doc.file)
        // Filter related files from the uploaded files
        const relatedFiles = files.filter(file => doc.file.includes(file.originalname));
        console.log(relatedFiles)
        // Upload files to Cloudinary and get URLs
        fileUrls = await uploadFilesToCloudinary(relatedFiles);
        console.log("i am here")
        console.log(fileUrls)
      }
      
      if (doc.documentdata) {
        // Convert form data to PDF with file links (if any)
        const pdfBuffer = await convertFormDataToPDFWithLinks(doc.documentdata, fileUrls);
        const cloudinaryUrl = await uploadPDFToCloudinary(pdfBuffer);

        processedDocuments.push({
          type: fileUrls.length > 0 ? 'both' : 'formdata',
          formData: doc.documentdata,
          fileUrl: cloudinaryUrl,
          files: fileUrls
        });
      } else if (fileUrls.length > 0) {
        // Handle files only scenario
        processedDocuments.push({
          type: 'upload',
          files: fileUrls
        });
      }
    }


  //   let additionalDocuments =[]
  //   if(addition)
  //  {  additionalDocuments = {
  //     uploads: await Promise.all(
  //       addition.uploads.map(async file => {
  //         const relatedFiles = files.filter(f => f.originalname === file.originalname);
  //         const urls = await uploadFilesToCloudinary(relatedFiles);
  //         return urls;
  //       })
  //     ),
  //     textEditorDocs: addition.textEditorDocs
  //   };}


    //return {additionalDocuments,processedDocuments};
    return res.status(200).json({ message: 'Documents created successfully', reqdocs: processedDocuments  });

  }catch (error) {
    console.error('Error handling document uploads:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const generatePDF = async (data) => {
  try {
    // Sanitize the input data to remove unsupported characters
    const sanitizedData = data.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const pageSize = [595.28, 841.89]; // A4 size in points
    let page = pdfDoc.addPage(pageSize); // Adding the first page

    const text = sanitizedData.split('\n');
    let y = pageSize[1] - 50; // Initial y position from top
    const lineHeight = 24; // Line height for the text

    for (const line of text) {
      if (y - lineHeight < 50) { // Check if there's enough space for the next line
        page = pdfDoc.addPage(pageSize); // Add a new page
        y = pageSize[1] - 50; // Reset y position for new page
      }
      page.drawText(line, {
        x: 50,
        y,
        size: 12,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }

    // Save the PDF and return its buffer
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};


const createDocuments = async (req, res) => {
  try {
    const { templateId, documentData } = JSON.parse(req.body.documentData); // Parse the JSON data from the request body

    const template = await DocumentTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    let pdfContent = '';
    const merger = new PDFMerger();

    // Iterate through sections and content to build PDF content
    documentData.sections.forEach((section) => {
      section.content.forEach((content) => {
        switch (content.type) {
          case 'upload':
            for (const file of req.files) {
              content.upload = req.files.map(file => ({ path: file }));
            }
            break;

          case 'select':
          case 'text':
          case 'textarea':
          case 'number':
          case 'date':
          case 'boolean':
            const textContent = `${content.title}: ${content.value}\n`;
            pdfContent += textContent;
            break;
          default:
            console.warn(`Unsupported content type: ${content.type}`);
        }
      });
    });

    // // Determine the maximum width of all uploaded files
    // let maxWidth = 0;
    // if (req.files && req.files.length > 0) {
    //   for (const file of req.files) {
    //     const fileDoc = await PDFDocument.load(fs.readFileSync(file.path));
    //     const firstPage = fileDoc.getPage(0);
    //     const { width } = firstPage.getSize();

    //     if (width > maxWidth) maxWidth = width;
    //   }
    // }

    // Generate PDF from the accumulated content with the maximum width
    const generatedPdfBuffer = await generatePDF(pdfContent);
    const generatedPdfPath = 'generatedPdf.pdf';
    fs.writeFileSync(generatedPdfPath, generatedPdfBuffer);

    // Add the generated PDF to the merger
    await merger.add(generatedPdfPath);


    // Add uploaded files to the merger
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await merger.add(file.path);
      }
    }

    // Merge all PDFs into one
    const mergedPdfBuffer = await merger.saveAsBuffer();

    // Create the document object with the merged PDF
    const document = new Document({
      templateId,
      title: template.title,
      sections: documentData.sections,
      mergedPdf: mergedPdfBuffer
    });

    // Save the new document to MongoDB
    await document.save();

    res.json({ message: 'Document created successfully', document });
  } catch (err) {
    console.error('Error creating document:', err);
    res.status(500).send('Internal Server Error');
  }
};


export default
  {
    getUploadedDoc,
    createDocument,
    getAllDocuments,
    getDocumentById,
    getDocumentsByFilter,
    deleteDocumentById,
    createDocumentFromBlank,
    generatePdfFromDocumentData,
    getPdfDocument,
    createDocuments
  };