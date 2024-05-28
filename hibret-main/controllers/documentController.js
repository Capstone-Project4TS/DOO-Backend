import Document from "../models/document.model.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary.js";

const uploadPDFToCloudinary = async (pdfBuffer, pdfName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", format: "pdf", public_id: pdfName.split(".")[0] },
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

const uploadFilesToCloudinary = async (files) => {
  const uploadPromises = files.map(async (file) => {
    const filePath =
      "C:/Users/AA/Desktop/CapstoneProject/DOO-Backend/hibret-main/uploads/" +
      file.filename;
    try {
      const fileBuffer = await fs.promises.readFile(filePath);

      // Return a new Promise to handle the upload process
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "auto", public_id: file.originalname.split(".")[0] },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result.secure_url);
            }
          }
        );

        // Write the file buffer to the upload stream
        uploadStream.end(fileBuffer);
      });
    } catch (error) {
      console.error("Error uploading file to Cloudinary:", error);
      throw error; // Rethrow the error to handle it in the caller function
    }
  });

  try {
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Error uploading files:", error);
    throw error; // Rethrow the error to handle it in the caller function
  }
};

const generatePDF = async (formData, urls, pdfName) => {
  const doc = new PDFDocument();
  const pdfPath = path.join("uploads", `${pdfName}.pdf`);
  console.log(formData);
  console.log(urls);
  doc.pipe(fs.createWriteStream(pdfPath));

  // Replace upload fields with URLs in formData
  formData.sections.forEach((section) => {
    section.content.forEach((content) => {
      if (content.type === "upload" && Array.isArray(content.upload)) {
        content.upload = content.upload.map((upload) => urls[upload] || upload);
      }
    });
  });

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(pdfPath);

    writeStream.on("finish", () => {
      resolve(pdfPath);
    });

    writeStream.on("error", (error) => {
      reject(error);
    });

    doc.pipe(writeStream);
    doc.fontSize(18).text(formData.title, { underline: true }).moveDown();

    formData.sections.forEach((section) => {
      doc.fontSize(16).text(section.title, { underline: true }).moveDown();

      section.content.forEach(async (content) => {
        doc.fontSize(14).fillColor("black").text(content.title, { bold: true });

        if (content.type === "upload" && content.upload) {
          content.upload.forEach((upload) => {
            const url = upload;
            console.log(`Processing upload: ${upload}`); // Debug statement
            console.log(`Found URL: ${url}`); // Debug statement

            if (url) {
              doc.fontSize(12).fillColor("blue").text(url, {
                link: url,
                underline: true,
              });
            } else {
              console.log(`No URL found for: ${upload}`);
            }
          });
        } else {
          doc
            .fontSize(12)
            .fillColor("black")
            .text(content.value || "");
        }
        doc.moveDown();
      });

      doc.addPage();
    });

    doc.end();
  });
};

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
export async function handleData(reqDoc, addDoc, files) {
  try {
    console.log("reqDoc:", reqDoc);
    console.log("addDoc:", addDoc);
    console.log("Files:", files);

    if (!reqDoc || reqDoc.length === 0) {
      return { status: 400, body: { message: "No data provided" } };
    }

    let reqDocs = [],
        addDocs = [];

    try {
      reqDocs = reqDoc ? JSON.parse(reqDoc) : [];
      addDocs = addDoc ? JSON.parse(addDoc) : [];
    } catch (error) {
      console.error("Invalid JSON format in reqDoc or addDoc:", error);
      return { status: 400, body: { message: "Invalid JSON format" } };
    }

    const fileUrls = {};
    const processDocs = async (docs) => {
      for (const doc of docs) {
        for (const section of doc.sections) {
          for (const content of section.content) {
            if (content.type === "upload" && content.upload) {
              for (const upload of content.upload) {
                const file = files.find((file) =>
                  upload.includes(file.originalname)
                );

                if (file) {
                  try {
                    const url = await uploadFilesToCloudinary([file]);
                    if (url.length > 0) {
                      fileUrls[upload] = url[0];
                      console.log(fileUrls);
                      console.log(`Mapped URL: ${upload} -> ${url[0]}`);
                    }
                  } catch (error) {
                    console.error("Error uploading file to Cloudinary:", error);
                    throw new Error("File upload failed");
                  }
                } else {
                  console.log(`File not found for upload: ${upload}`);
                }
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
