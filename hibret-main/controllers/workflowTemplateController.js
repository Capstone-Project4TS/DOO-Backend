import WorkflowTemplate from "../models/workflowTemplate.model.js";
import Workflow from "../models/workflow.model.js"; // Adjust the import as per your project structure
import DocumentTemplate from "../models/documentTemplate.model.js";
import mongoose from "mongoose";
import { getDeps } from "./roleController.js";

// Create new workflow template
export const createWorkflowTemplate = async (req, res) => {
  try {
    const {
      name,
      categoryId,
      subCategoryId,
      stages,
      requiredDocumentTemplates,
      additionalDoc,
      depId,
    } = req.body;

    // Input validation (required fields)
    if (
      !name ||
      !categoryId ||
      !subCategoryId ||
      !stages.length ||
      !requiredDocumentTemplates.length ||
      !depId
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate IDs (assuming they are ObjectIds)
    if (
      !mongoose.Types.ObjectId.isValid(categoryId) ||
      !mongoose.Types.ObjectId.isValid(subCategoryId) ||
      !mongoose.Types.ObjectId.isValid(depId)
    ) {
      return res
        .status(400)
        .json({ error: "Invalid category, subcategory, or repository ID" });
    }

    // Validate stages
    for (const stage of stages) {
      if (!stage.stageTitle || typeof stage.stageTitle !== "string") {
        return res
          .status(400)
          .json({
            error: "Invalid stage data: Missing or invalid stage title",
          });
      }

      // Validate condition
      if (stage.hasCondition) {
        if (!stage.condition) {
          return res
            .status(400)
            .json({ error: "Condition required when hasCondition is true" });
        }

        // Validate condition variants (if present)
        if (stage.conditionVariants && stage.conditionVariants.length) {
          if (!stage.hasCondition) {
            return res
              .status(400)
              .json({
                error: "conditionVariants require hasCondition to be true",
              });
          }

          for (const variant of stage.conditionVariants) {
            if (
              !variant.condition_name ||
              !variant.operator ||
              !variant.value ||
              !(
                typeof variant.value === "number" ||
                typeof variant.value === "string"
              )
            ) {
              return res
                .status(400)
                .json({
                  error:
                    "Invalid condition variant: Missing required properties or invalid value format",
                });
            }

            // Validate approverType within conditionVariants
            if (
              !variant.approverType ||
              !["Single Person", "Committee"].includes(variant.approverType)
            ) {
              return res
                .status(400)
                .json({
                  error:
                    "Invalid condition variant: Missing or invalid approver type",
                });
            }
          }
        }
      } else {
        if (stage.condition || stage.conditionVariants?.length) {
          return res
            .status(400)
            .json({
              error:
                "Condition and conditionVariants should be empty when hasCondition is false",
            });
        }
        if (!["Single Person", "Committee"].includes(stage.approverType)) {
          return res
            .status(400)
            .json({
              error:
                "Invalid stage data: Missing required properties or invalid approver type",
            });
        }
      }
    }

    // Check if an additional document is required and find the additional document template
    let additionalDocumentTemplate = null;
    if (additionalDoc) {
      const additionalDocTemplate = await DocumentTemplate.findOne({
        title: "Additional Document",
      });
      if (!additionalDocTemplate) {
        return res
          .status(404)
          .json({ error: "Additional document template not found" });
      }
      additionalDocumentTemplate = additionalDocTemplate._id;
    }

    const newTemplate = new WorkflowTemplate({
      name,
      categoryId,
      subCategoryId,
      stages,
      requiredDocumentTemplates,
      additionalDoc,
      additionalDocumentTemplate,
      depId,
    });

    const savedTemplate = await newTemplate.save();

    res
      .status(201)
      .json({
        message: "Workflow template created successfully",
        savedTemplate,
      });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      return res
        .status(400)
        .json({
          error: "A workflow template with the same name already exists",
        });
    }
    console.error("Error creating workflow template:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all workflow templates
export async function getAllWorkflowTemplates(req, res) {
  try {
    // Fetch workflow templates that are not deprecated
    const templates = await WorkflowTemplate.find({
      isDeprecated: false,
    })
      .populate({ path: "categoryId", select: "name" })
      .populate({ path: "subCategoryId", select: "name" });

    if (templates.length === 0) {
      return res.status(404).json({ message: "No workflow templates found" });
    }

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
        workflowName: `${template.name} V${template.version}`,
        categoryName: template.categoryId ? template.categoryId.name : null,
        subCategoryName: template.subCategoryId
          ? template.subCategoryId.name
          : null,
        department: department ? department.name : null,
      };
    });

    // Return the simplified template data
    return res.status(200).json(simplifiedTemplates);
  } catch (err) {
    console.error("Error fetching workflow templates:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get all workflow templates
export async function getAllRequiredDocumentTemplates(req, res) {
  try {
    const template = await WorkflowTemplate.findById(req.params.id)
      .populate("requiredDocumentTemplates")
      .populate("additionalDocumentTemplate");

    if (!template) {
      return res.status(404).json({ message: "Workflow template not found" });
    }

    console.log("Template:", template);

    const documents = template.requiredDocumentTemplates;
    const additionalDoc = template.additionalDocumentTemplate;

    // Send document contents array as response
    res
      .status(200)
      .json({ documents, additionalDoc, additional: template.additionalDoc });
  } catch (err) {
    console.error("Error fetching document templates:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get a single workflow template by ID with detailed information
export async function getWorkflowTemplateDetailById(req, res) {
  try {
    const { id } = req.params;

    // Validate the provided ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid workflow template ID' });
    }

    // Find the workflow template by ID and populate references
    const template = await WorkflowTemplate.findById(id)
      .populate({ path: 'categoryId', select: 'name' })
      .populate({ path: 'subCategoryId', select: 'name' })
      .populate({ path: 'stages.committee_permissions.role_ids', select: 'name' })
      .populate({ path: 'stages.single_permissions.role_id', select: 'roleName' })
      .populate({ path: 'requiredDocumentTemplates', select: 'title' })
      .populate({ path: 'additionalDocumentTemplate', select: 'title' });

    if (!template) {
      return res.status(404).json({ message: 'Workflow template not found' });
    }

    // Fetch department names
    const deps = await getDeps();

    // Sanitize the workflow template to include necessary details only
    const workflowTemplateDetail = {
      _id: template._id,
      name: template.name,
      category: template.categoryId ? template.categoryId.name : null,
      subCategory: template.subCategoryId ? template.subCategoryId.name : null,
      department: deps.find(dep => dep._id.toString() === template.depId.toString())?.name || null,
      stages: template.stages.map(stage => ({
        title: stage.stageTitle,
        approverType: stage.approverType,
        committeePermissions: stage.committee_permissions ? {
          permission: stage.committee_permissions.permission,
          committee: stage.committee_permissions.role_ids ? stage.committee_permissions.role_ids.name : null,
          minApprovals: stage.committee_permissions.min_approvals,
        } : null,
        singlePermissions: stage.single_permissions ? {
          role: stage.single_permissions.role_id ? stage.single_permissions.role_id.roleName : null,
          permission: stage.single_permissions.permission,
        } : null,
      })),
      requiredDocuments: template.requiredDocumentTemplates ? template.requiredDocumentTemplates.map(doc => doc.title) : [],
      additionalDocument: template.additionalDocumentTemplate ? template.additionalDocumentTemplate.title : null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };

    // Return the workflow template details
    return res.status(200).json(workflowTemplateDetail);
  } catch (err) {
    console.error('Error fetching workflow template:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Update a workflow template
export async function updateWorkflowTemplate(req, res) {
  try {
    const { stages, requiredDocumentTemplates, additionalDoc } = req.body;

    // Input validation for required fields
    if (!stages || !requiredDocumentTemplates) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the existing workflow template by its ID
    const existingTemplate = await WorkflowTemplate.findById(req.params.id);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Workflow template not found" });
    }

    // Find the latest version of the template
    const latestTemplate = await WorkflowTemplate.findOne({
      name: existingTemplate.name,
      categoryId: existingTemplate.categoryId,
      subCategoryId: existingTemplate.subCategoryId,
      depId: existingTemplate.depId,
    }).sort({ version: -1 });

    // Create a new version of the workflow template
    const newVersion = latestTemplate.version + 1;
    const newTemplate = new WorkflowTemplate({
      name: latestTemplate.name,
      stages,
      requiredDocumentTemplates,
      version: newVersion,
      categoryId: latestTemplate.categoryId,
      subCategoryId: latestTemplate.subCategoryId,
      depId: latestTemplate.depId,
      additionalDoc: additionalDoc,
    });

    await newTemplate.save();

    // Mark the old template as deprecated
    latestTemplate.isDeprecated = true;
    await latestTemplate.save();

    res.status(200).json({
      message: "Workflow template updated successfully",
      template: newTemplate,
    });
  } catch (error) {
    console.error("Error updating workflow template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Delete a Workflow Template
export async function deleteWorkflowTemplate(req, res) {
  try {
    const { id } = req.params;

    // Check if the template exists before attempting to delete it
    const template = await WorkflowTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ message: "Workflow template not found" });
    }

    // Check if any workflows are created using this template
    const workflowsUsingTemplate = await Workflow.findOne({
      workflowTemplate: id,
    });
    if (workflowsUsingTemplate) {
      return res
        .status(403)
        .json({
          message:
            "Cannot delete workflow template. Workflows are created using this template.",
        });
    }

    // Delete the workflow template if no workflows are created using it
    await WorkflowTemplate.findByIdAndDelete(id);

    // Return a success message
    res.status(200).json({ message: "Workflow template deleted successfully" });
  } catch (err) {
    console.error("Error deleting workflow template:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Controller function to search workflow templates by name
export const searchWorkflowTemplatesByName = async (req, res) => {
  const { name } = req.query;

  try {
    if (!name) {
      return res.status(400).json({ message: "Name parameter is required" });
    }

    // Search by name
    const templates = await WorkflowTemplate.find({
      name: { $regex: new RegExp(name, "i") },
    })
      .populate({ path: "categoryId", select: "name" })
      .populate({ path: "subCategoryId", select: "name" });

    if (templates.length === 0) {
      return res
        .status(404)
        .json({ message: "No workflow templates found matching the name" });
    }

    const simplifiedTemplates = templates.map((template) => ({
      _id: template._id,
      workflowName: template.name,
      categoryName: template.categoryId ? template.categoryId.name : null,
      subCategoryName: template.subCategoryId
        ? template.subCategoryId.name
        : null,
    }));

    return res.status(200).json(simplifiedTemplates);
  } catch (error) {
    console.error("Error searching workflow templates by name:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Controller function to filter workflow templates
export const filterWorkflowTemplates = async (req, res) => {
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
    const templates = await WorkflowTemplate.find(query)
      .populate({ path: "categoryId", select: "name" })
      .populate({ path: "subCategoryId", select: "name" });

    if (templates.length === 0) {
      return res
        .status(404)
        .json({ message: "No workflow templates found matching the criteria" });
    }

    const simplifiedTemplates = templates.map((template) => ({
      _id: template._id,
      workflowName: template.name,
      categoryName: template.categoryId ? template.categoryId.name : null,
      subCategoryName: template.subCategoryId
        ? template.subCategoryId.name
        : null,
    }));

    return res.status(200).json(simplifiedTemplates);
  } catch (error) {
    console.error("Error filtering workflow templates:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  createWorkflowTemplate,
  getAllWorkflowTemplates,
  getWorkflowTemplateDetailById,
  // updateWorkflowTemplate,
  deleteWorkflowTemplate,
  searchWorkflowTemplatesByName,
  filterWorkflowTemplates,
};
