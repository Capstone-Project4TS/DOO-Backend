import DocumentTemplate from "../models/documentTemplate.model.js";
import mongoose from "mongoose";
import Document from '../models/document.model.js'; // Adjust the import as per your project structure

// Create a new document template
// error handled 
export async function createDocumentTemplate(req, res) {
  try {
    const { title, subCategoryId, categoryId, sections, depId } = req.body;

    // Input validation (required fields)
    if (!title || !subCategoryId || !categoryId || !sections || !sections.length || !depId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate IDs (assuming they are ObjectIds)
    if (!mongoose.Types.ObjectId.isValid(subCategoryId) ||
        !mongoose.Types.ObjectId.isValid(depId) ||
        !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: "Invalid subcategory, category, or department ID" });
    }

    // Check if a document template with the same title already exists
    const existingTemplate = await DocumentTemplate.findOne({ title });
    if (existingTemplate) {
      return res.status(400).json({ error: "A document template with the same title already exists" });
    }

    // Initialize an empty array to store eligible conditions
    let eligibleConditions = [];
    let conditionLogic = false;

    // Extract eligible conditions and check if any content has conditionLogic set to true
    sections.forEach((section) => {
      section.content.forEach((content) => {
        if (content.conditionLogic) {
          eligibleConditions.push({
            fieldName: content.title,
            dataType: content.type,
          });
          conditionLogic = true; // Set conditionalLogic to true if any content has conditionLogic
        }
      });
    });

    // Create a new document template
    const newTemplate = new DocumentTemplate({
      title,
      subCategoryId,
      categoryId,
      sections,
      conditionLogic,
      eligibleConditions,
      depId,
    });

    await newTemplate.save();
    return res.status(201).json({ message: "Document template created successfully", newTemplate });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ error: "A document template with the same title already exists" });
    }
    console.error("Error in createDocumentTemplate:", err);
    return res.status(500).json({ error: "Failed to create document template" });
  }
}
// Get all document templates
export async function getAllDocumentTemplates(req, res) {
  try {
    const templates = await DocumentTemplate.find().populate({
      path: "subCategoryId",
      populate: {
        path: "categoryId",
        select: "name",
      },
      select: "name categoryId",
    });

    const simplifiedTemplates = templates.map((template) => ({
      _id: template._id,
      documentTitle: template.title,
      subCategoryName: template.subCategoryId
        ? template.subCategoryId.name
        : null,
      categoryName:
        template.subCategoryId && template.subCategoryId.categoryId
          ? template.subCategoryId.categoryId.name
          : null,
    }));
 
    return res.status(200).json(simplifiedTemplates);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// Get a single document template by ID
export async function getDocumentTemplateById(req, res) {
  try {
    const template = await DocumentTemplate.findById(req.params.id).populate(
      "subCategoryId"
    ); // Populate subcategory details (optional)
    if (!template) {
      return res.status(404).json({ message: "Document template not found" });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Update a document template
export async function updateDocumentTemplate(req, res) {
  try {
    const { name, description, subCategoryId, sections } = req.body;

    const updatedTemplate = await DocumentTemplate.findByIdAndUpdate(
      req.params.id,
      { name, description, subCategoryId, sections, conditionalLogic },
      { new: true } // Return the updated document
    );

    if (!updatedTemplate) {
      return res.status(404).json({ message: "Document template not found" });
    }

    res.json(updatedTemplate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// Delete a document template
export async function deleteDocumentTemplate(req, res) {
  try {
    await DocumentTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: "Document template deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getDocumentBySub(req, res) {
  const subcategoryId = req.params;
  try {
    const templates = await DocumentTemplate.find({
      subCategoryId: subcategoryId.id,
    });
    return res.status(200).json({ templates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getConditionsByTemp(req, res) {
  try {
    const { templateIds } = req.body; // Assuming templateIds is an array of template IDs passed in the request body
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid template IDs provided." });
    }

    // Query database to fetch document templates based on provided template IDs
    const documentTemplates = await DocumentTemplate.find({
      _id: { $in: templateIds },
    }).populate("eligibleConditions");

    // Map over document templates to format the data
    const formattedTemplates = documentTemplates.map((template) => ({
      _id: template._id,
      name: template.name,
      eligibleConditions: template.eligibleConditions.map((condition) => ({
        fieldName: condition.fieldName,
        dataType: condition.dataType,
      })),
    }));

    // return formattedTemplates;
    return res.status(200).json({ formattedTemplates });
  } catch (error) {
    console.error(error);
    throw error; // Re-throw the error for handling
  }
}
//         // Query database to fetch document templates based on provided template IDs
//         const documentTemplates = await DocumentTemplate.find({ _id: { $in: templateIds } }).populate('eligibleConditions');

//         // Map over document templates to format the data
//         const formattedTemplates = documentTemplates.map(template => ({
//             _id: template._id,
//             name: template.name,
//             description: template.description,
//             eligibleConditions: template.eligibleConditions.map(condition => ({
//                 fieldName: condition.fieldName,
//                 dataType: condition.dataType
//             }))
//         }));

//         return formattedTemplates;
//     } catch (error) {
//         // Handle error
//         throw new Error('Failed to fetch eligible conditions for document templates');
//     }
// }

async function createIndexes() {
  try {
    await DocumentTemplate.collection.createIndex({ eligibleConditions: 1 }); // 1 for ascending index
    console.log("Index created for eligibleConditions field.");
    await DocumentTemplate.collection.createIndex({ _id: 1 }); // 1 for ascending index
    console.log("Index created for _id field.");
  } catch (error) {
    console.error(
      "Failed to create index for eligibleConditions field:",
      error
    );
  }
}

// Call the function to create indexes
createIndexes();

export default {
  createDocumentTemplate,
  getAllDocumentTemplates,
  getDocumentTemplateById,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentBySub,
  getConditionsByTemp,
};
