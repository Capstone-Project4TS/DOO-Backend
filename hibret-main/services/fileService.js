import cloudinary from "../config/cloudinary.js";
import path from "path";
import PDFDocument from "pdfkit";
import fs from "fs";
import Media from "../models/media.model.js"


export const uploadPDFToCloudinary = async (pdfBuffer, pdfName) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "raw", format: "pdf", public_id: pdfName.split(".")[0] },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return reject(new Error("Error uploading PDF to Cloudinary"));
          }
          resolve(result.secure_url);
        }
      );

      uploadStream.end(pdfBuffer);
    });
  } catch (error) {
    console.error("Error during Cloudinary PDF upload:", error);
    throw new Error("Failed to upload PDF to Cloudinary");
  }
};

// export const uploadFilesToCloudinary = async (files) => {
//   const uploadPromises = files.map(async (file) => {
//     const filePath =
//       "C:/Users/AA/Desktop/CapstoneProject/DOO-Backend/hibret-main/uploads/" +
//       file.filename;
//     try {
//       const fileBuffer = await fs.promises.readFile(filePath);

//       // Return a new Promise to handle the upload process
//       return new Promise((resolve, reject) => {
//         const uploadStream = cloudinary.uploader.upload_stream(
//           { resource_type: "auto", public_id: file.originalname.split(".")[0] },
//           (error, result) => {
//             if (error) {
//               reject(error);
//             } else {
//               resolve(result.secure_url);
//             }
//           }
//         );

//         // Write the file buffer to the upload stream
//         uploadStream.end(fileBuffer);
//       });
//     } catch (error) {
//       console.error("Error uploading file to Cloudinary:", error);
//       throw error; // Rethrow the error to handle it in the caller function
//     }
//   });

//   try {
//     return await Promise.all(uploadPromises);
//   } catch (error) {
//     console.error("Error uploading files:", error);
//     throw error; // Rethrow the error to handle it in the caller function
//   }
// };

export const uploadFilesToCloudinary = async (file) => {
  const __dirname = path.resolve();
  const filePath = path.join(__dirname, 'uploads', file.filename);
    try {
    const fileBuffer = await fs.promises.readFile(filePath);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", public_id: file.originalname.split(".")[0] },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(new Error("Error uploading file to Cloudinary"));
          } else {
            resolve(result.secure_url);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error("File read error:", error);
    throw new Error("Error reading file for upload");
  } finally {
    // Clean up the local file after upload attempt
    try {
      await fs.promises.unlink(filePath);
    } catch (cleanupError) {
      console.error("Error removing local file:", cleanupError);
      // Handle or log the cleanup error but don't throw it as it shouldn't override the main error
    }
  }
};


export const generatePDF = async (formData, urls, pdfName) => {
  const doc = new PDFDocument();
  const pdfPath = path.join("uploads", `${pdfName}.pdf`);
  console.log(formData);
  console.log(urls);

  // Replace upload fields with URLs in formData
  formData.sections.forEach((section) => {
    section.content.forEach((content) => {
      if (content.type === "upload" && Array.isArray(content.value)) {
        content.value = content.value.map((value) => urls[value] || value);
      }
    });
  });

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(pdfPath);

    writeStream.on("finish", () => {
      resolve(pdfPath);
    });

    writeStream.on("error", (error) => {
      console.error("Error writing to PDF file:", error);
      reject(error);
    });

    doc.pipe(writeStream);

    doc.fontSize(18).text(formData.title, { underline: true }).moveDown();

    (async () => {
      for (const section of formData.sections) {
        doc.fontSize(16).text(section.title, { underline: true }).moveDown();

        for (const content of section.content) {
          doc.fontSize(14).fillColor("black").text(content.title, { bold: true });

          if (content.type === "upload" && content.value) {
            for (const value of content.value) {
              const url = value;
              console.log(`Processing upload: ${value}`); // Debug statement
              console.log(`Found URL: ${url}`); // Debug statement

              if (url) {
                doc.fontSize(12).fillColor("blue").text(url, {
                  link: url,
                  underline: true,
                });
              } else {
                console.log(`No URL found for: ${value}`);
              }
            }
          } else {
            doc.fontSize(12).fillColor("black").text(content.value || "");
          }
          doc.moveDown();
        }
        doc.addPage();
      }

      doc.end();
    })().catch(error => {
      console.error("Error generating PDF content:", error);
      reject(error);
    });
  });
};

export async function uploadDoc(req, res) {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }

    // Validate file type and size if necessary
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return res.status(400).json({ error: "File size exceeds the limit of 5MB" });
    }

    const url = await uploadFilesToCloudinary(file);

    const mediaDoc = { url };
    const savedMedia = await new Media(mediaDoc).save();

    res.status(201).json({ id: savedMedia._id });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
}


export default {
    uploadDoc,
    generatePDF,
    uploadFilesToCloudinary,
    uploadPDFToCloudinary
}