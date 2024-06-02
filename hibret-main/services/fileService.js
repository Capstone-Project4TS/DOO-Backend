import cloudinary from "../config/cloudinary.js";
import path from "path";
import PDFDocument from "pdfkit";
import fs from "fs";
import Media from "../models/media.model.js"
export const uploadPDFToCloudinary = async (pdfBuffer, pdfName) => {
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
  const filePath = "C:/Users/AA/Desktop/CapstoneProject/DOO-Backend/hibret-main/uploads/" + file.filename;
  try {
    const fileBuffer = await fs.promises.readFile(filePath);

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

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    throw error;
  }
};


export const generatePDF = async (formData, urls, pdfName) => {
  const doc = new PDFDocument();
  const pdfPath = path.join("uploads", `${pdfName}.pdf`);
  console.log(formData);
  console.log(urls);
  doc.pipe(fs.createWriteStream(pdfPath));

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
      reject(error);
    });

    doc.pipe(writeStream);
    doc.fontSize(18).text(formData.title, { underline: true }).moveDown();

    formData.sections.forEach((section) => {
      doc.fontSize(16).text(section.title, { underline: true }).moveDown();

      section.content.forEach(async (content) => {
        doc.fontSize(14).fillColor("black").text(content.title, { bold: true });

        if (content.type === "upload" && content.value) {
          content.value.forEach((value) => {
            const url = value;
            console.log(`Processing upload: ${value}`); // Debug statement
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

export  async function uploadDoc (req, res){
  try {
    const file = req.file;
    const tempId = req.body.tempId;

    if (!file || !tempId) {
      return res.status(400).json({ error: "File and tempId are required" });
    }

    const url = await uploadFilesToCloudinary(file);

    const mediaDoc = { url, tempId };
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