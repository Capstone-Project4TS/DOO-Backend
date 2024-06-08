import DocumentTemplate from "../models/documentTemplate.model.js";
import mongoose from "mongoose";
import Document from "../models/document.model.js"; // Adjust the import as per your project structure
import { getDeps } from "./roleController.js";
// Create a new document template
// error handled
export async function createDocumentTemplate(req, res) {
  try {
    const { title, subCategoryId, categoryId, sections, depId } = req.body;

    // Input validation (required fields)
    if (
      !title ||
      !subCategoryId ||
      !categoryId ||
      !sections ||
      !sections.length ||
      !depId
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate IDs (assuming they are ObjectIds)
    if (
      !mongoose.Types.ObjectId.isValid(subCategoryId) ||
      !mongoose.Types.ObjectId.isValid(depId) ||
      !mongoose.Types.ObjectId.isValid(categoryId)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid subcategory, category, or department ID" });
    }

    // Check if a document template with the same title already exists
    const existingTemplate = await DocumentTemplate.findOne({ title });
    if (existingTemplate) {
      return res.status(400).json({
        error: "A document template with the same title already exists",
      });
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
    return res
      .status(201)
      .json({ message: "Document template created successfully" });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        error: "A document template with the same title already exists",
      });
    }
    console.error("Error in createDocumentTemplate:", err);
    return res
      .status(500)
      .json({ error: "Failed to create document template" });
  }
}
// Get all document templates
export async function getAllDocumentTemplates(req, res) {
  try {
    // Find document templates that are not deprecated
    const templates = await DocumentTemplate.find({ isDeprecated: false }).populate({
      path: "subCategoryId",
      populate: {
        path: "categoryId",
        select: "name",
      },
      select: "name categoryId",
    });

    // If no templates are found, return a 404 Not Found status
    if (!templates || templates.length === 0) {
      return res.status(404).json({ message: "No document templates found" });
    }

    // Simplify the template data for the response
    const simplifiedTemplates = templates.map((template) => ({
      _id: template._id,
      documentTitle: template.title,
      subCategoryName: template.subCategoryId ? template.subCategoryId.name : null,
      categoryName:
        template.subCategoryId && template.subCategoryId.categoryId
          ? template.subCategoryId.categoryId.name
          : null,
    }));

    // Return the simplified template data
    return res.status(200).json(simplifiedTemplates);
  } catch (error) {
    console.error("Error retrieving document templates:", error);
    return res.status(500).json({ error: "Failed to retrieve document templates" });
  }
}

// Get a single document template by ID with detailed information
export async function getDocumentTemplateById(req, res) {
  try {
    const { id } = req.params;

    // Validate the provided ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document template ID" });
    }

    // Find the document template by ID and populate references
    const template = await DocumentTemplate.findById(id)
      .populate({ path: "categoryId", select: "name" })
      .populate({ path: "subCategoryId", select: "name" });

    if (!template) {
      return res.status(404).json({ message: "Document template not found" });
    }

    // Fetch the list of departments
    const deps = await getDeps();

    // Find the department name by comparing IDs
    const department = deps.find(
      (dep) => dep._id.toString() === template.depId.toString()
    );

    // Sanitize the document template to include necessary details only
    const documentTemplateDetail = {
      _id: template._id,
      title: template.title,
      department: department ? department.name : null,
      category: template.categoryId ? template.categoryId.name : null,
      subCategory: template.subCategoryId ? template.subCategoryId.name : null,
      sections: template.sections.map((section) => ({
        title: section.title,
        content: section.content.map((content) => ({
          title: content.title,
          type: content.type,
          options: content.options,
          isRequired: content.isRequired,
          conditionalLogic: content.conditionalLogic,
        })),
        multiple: section.multiple,
      })),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };

    // Return the document template details
    return res.status(200).json(documentTemplateDetail);
  } catch (error) {
    console.error("Error retrieving document template by ID:", error);
    return res
      .status(500)
      .json({ error: "Failed to retrieve document template" });
  }
}

// Update a document template
export async function updateDocumentTemplate(req, res) {
  try {
    const { sections } = req.body;

    // Input validation for required fields
    if (!sections) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the existing document template
    const existingTemplate = await DocumentTemplate.findById(req.params.id);
    if (!existingTemplate) {
      return res.status(404).json({ message: "Document template not found" });
    }

    // Find the latest version of the template
    const latestTemplate = await DocumentTemplate.findOne({
      title: existingTemplate.title,
      categoryId: existingTemplate.categoryId,
      subCategoryId: existingTemplate.subCategoryId,
      depId: existingTemplate.depId,
    }).sort({ version: -1 });

    // Create a new version of the template
    const newVersion = latestTemplate.version + 1;
    const newTemplate = new DocumentTemplate({
      title: latestTemplate.title,
      sections,
      version: newVersion,
      categoryId: latestTemplate.categoryId,
      subCategoryId: latestTemplate.subCategoryId,
      depId: latestTemplate.depId,
    });

    await newTemplate.save();

    // Mark the old template as deprecated
    latestTemplate.isDeprecated = true;
    await latestTemplate.save();

    res.json({
      message: "Document template updated successfully",
      template: newTemplate,
    });
  } catch (error) {
    console.error("Error updating document template:", error);
    res.status(500).json({ error: "Failed to update document template" });
  }
}

export async function deleteDocumentTemplate(req, res) {
  try {
    const { id } = req.params;

    // Check if any documents are created using this template
    const documentsUsingTemplate = await Document.findOne({ templateId: id });
    if (documentsUsingTemplate) {
      return res.status(403).json({
        message:
          "Cannot delete document template. Documents are created using this template.",
      });
    }

    // Delete the document template if no documents are created using it
    const deletedTemplate = await DocumentTemplate.findByIdAndDelete(id);
    if (!deletedTemplate) {
      return res.status(404).json({ message: "Document template not found" });
    }

    res.status(200).json({ message: "Document template deleted successfully" });
  } catch (error) {
    console.error("Error deleting document template:", error);
    res.status(500).json({ error: "Failed to delete document template" });
  }
}

export async function getDocumentBySub(req, res) {
  try {
    const subcategoryId = req.params.id; // Extract subcategoryId from request parameters

    // Find document templates that belong to the given subcategory and are not deprecated
    const templates = await DocumentTemplate.find({
      subCategoryId: subcategoryId,
      isDeprecated: false,
    }).populate({
      path: "subCategoryId",
      select: "name",
      populate: {
        path: "categoryId",
        select: "name",
      },
    });

    // If no templates are found, return a 404 Not Found status
    if (!templates || templates.length === 0) {
      return res.status(404).json({ message: "No templates found for the given subcategory" });
    }
    console.log(templates)
     // Fetch the list of departments
     const deps = await getDeps();
 
    // Simplify the template data for the response
    const simplifiedTemplates = templates.map((template) => {
      // Find the department name by comparing IDs
      const department = deps.find(
        (dep) => dep._id.toString() === template.depId.toString()
      );

      return {
        _id: template._id,
        documentTitle: `${template.title} ${template.version}`,
        subCategoryName: template.subCategoryId ? template.subCategoryId.name : null,
        categoryName: template.subCategoryId && template.subCategoryId.categoryId ? template.subCategoryId.categoryId.name : null,
        department: department ? department.name : null,
      };
    });

    // Return the simplified template data
    return res.status(200).json({ templates: simplifiedTemplates });
  } catch (err) {
    console.error("Error retrieving documents by subcategory:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getConditionsByTemp(req, res) {
  try {
    const { templateIds } = req.body;
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid template IDs provided." });
    }

    const documentTemplates = await DocumentTemplate.find({
      _id: { $in: templateIds },
    }).populate("eligibleConditions");

    if (!documentTemplates || documentTemplates.length === 0) {
      return res
        .status(404)
        .json({ message: "No templates found for the provided IDs" });
    }

    const formattedTemplates = documentTemplates.map((template) => ({
      _id: template._id,
      name: template.name,
      eligibleConditions: template.eligibleConditions.map((condition) => ({
        fieldName: condition.fieldName,
        dataType: condition.dataType,
      })),
    }));

    return res.status(200).json({ formattedTemplates });
  } catch (error) {
    console.error("Error retrieving conditions by template:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Controller function to search document templates by title
export const searchDocumentTemplatesByTitle = async (req, res) => {
  const { title } = req.query;

  try {
    if (!title) {
      return res.status(400).json({ message: "Title parameter is required" });
    }

    // Search by title
    const templates = await DocumentTemplate.find({
      title: { $regex: new RegExp(title, "i") },
    }).populate({
      path: "subCategoryId",
      populate: { path: "categoryId", select: "name" },
      select: "name categoryId",
    });

    if (templates.length === 0) {
      return res
        .status(404)
        .json({ message: "No document templates found matching the title" });
    }

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
  } catch (error) {
    console.error("Error searching document templates by title:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Controller function to filter document templates
export const filterDocumentTemplates = async (req, res) => {
  const { categoryId, subCategoryId, depId } = req.query;

  try {
    // Construct query object
    let query = {};

    // Add category filter if provided
    if (categoryId) {
      query.categoryId = categoryId;
    }

    // Add subcategory filter if provided
    if (subCategoryId) {
      query.subCategoryId = subCategoryId;
    }

    // Add department filter if provided
    if (depId) {
      query.depId = depId;
    }

    // Execute the query
    const templates = await DocumentTemplate.find(query).populate({
      path: "subCategoryId",
      populate: { path: "categoryId", select: "name" },
      select: "name categoryId",
    });

    if (templates.length === 0) {
      return res
        .status(404)
        .json({ message: "No document templates found matching the criteria" });
    }

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
  } catch (error) {
    console.error("Error filtering document templates:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

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
  searchDocumentTemplatesByTitle,
  filterDocumentTemplates,
};
