import WorkflowTemplate from "../models/workflowTemplate.model.js";
import DocumentTemplate from "../models/documentTemplate.model.js";
import mongoose from "mongoose";

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
      return res.status(400).json({ error: "Invalid category, subcategory, or repository ID" });
    }

    // Validate stages
    for (const stage of stages) {
      if (!stage.stageTitle || typeof stage.stageTitle !== "string") {
        return res.status(400).json({ error: "Invalid stage data: Missing or invalid stage title" });
      }

      // Validate condition
      if (stage.hasCondition) {
        if (!stage.condition) {
          return res.status(400).json({ error: "Condition required when hasCondition is true" });
        }

        // Validate condition variants (if present)
        if (stage.conditionVariants && stage.conditionVariants.length) {
          if (!stage.hasCondition) {
            return res.status(400).json({ error: "conditionVariants require hasCondition to be true" });
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
              return res.status(400).json({ error: "Invalid condition variant: Missing required properties or invalid value format" });
            }

            // Validate approverType within conditionVariants
            if (
              !variant.approverType ||
              !["Single Person", "Committee"].includes(variant.approverType)
            ) {
              return res.status(400).json({ error: "Invalid condition variant: Missing or invalid approver type" });
            }
          }
        }

      } else {
        if (stage.condition || stage.conditionVariants?.length) {
          return res.status(400).json({ error: "Condition and conditionVariants should be empty when hasCondition is false" });
        }
        if (!["Single Person", "Committee"].includes(stage.approverType)) {
          return res.status(400).json({ error: "Invalid stage data: Missing required properties or invalid approver type" });
        }
      }
    }

    // Check if an additional document is required and find the additional document template
    let additionalDocumentTemplate = null;
    if (additionalDoc) {
      const additionalDocTemplate = await DocumentTemplate.findOne({ title: "Additional Document" });
      if (!additionalDocTemplate) {
        return res.status(404).json({ error: "Additional document template not found" });
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

    res.status(201).json({ message: "Workflow template created successfully", savedTemplate });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ error: "A workflow template with the same name already exists" });
    }
    console.error("Error creating workflow template:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all workflow templates
export async function getAllWorkflowTemplates(req, res) {
  try {
    const templates = await WorkflowTemplate.find()
      .populate({ path: "categoryId", select: "name" })
      .populate({ path: "subCategoryId", select: "name" });

    const simplifiedTemplates = templates.map((template) => ({
      _id: template._id,
      workflowName: template.name,
      categoryName: template.categoryId ? template.categoryId.name : null,
      subCategoryName: template.subCategoryId
        ? template.subCategoryId.name
        : null,
    }));

    return res.status(200).json(simplifiedTemplates);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// Get all workflow templates
export async function getAllRequiredDocumentTemplates(req, res) {
  try {
    const template = await WorkflowTemplate.findById(req.params.id).populate(
      "requiredDocumentTemplates"
    ).populate("additionalDocumentTemplate");
    if (!template) {
      return res.status(404).json({ message: "Workflow template not found" });
    }

    console.log("Template:", template);

    const documents = template.requiredDocumentTemplates;
    const additional = template.additionalDoc;
    const additionalDoc=template.additionalDocumentTemplate;

    // Send document contents array as response
    res.status(200).json({ documents, additionalDoc,additional });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get a single workflow template by ID
export async function getWorkflowTemplateById(req, res) {
  try {
    const template = await WorkflowTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Workflow template not found" });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Update a workflow template
// export async function updateWorkflowTemplate(req, res) {
//   try {
//     const { id } = req.params;
//     const { name, stages, requiredDocumentTemplates } = req.body;

//     // Find the existing workflow template by its ID
//     const existingWorkflowTemplate = await WorkflowTemplate.findById(id);

//     if (!existingWorkflowTemplate) {
//         return res.status(404).json({ error: 'Workflow template not found' });
//     }

//     // Check if there are any changes in the parameters
//     const isModified = (
//       existingWorkflowTemplate.name !== name ||
//       JSON.stringify(existingWorkflowTemplate.stages) !== JSON.stringify(stages) ||
//       JSON.stringify(existingWorkflowTemplate.requiredDocumentTemplates) !== JSON.stringify(requiredDocumentTemplates)
//   );

//   // If there are no changes, return without saving
//   if (!isModified) {
//       return ;
//   }
//     // Update the properties of the existing workflow template
//     existingWorkflowTemplate.name = name;
//     existingWorkflowTemplate.stages = stages;
//     existingWorkflowTemplate.requiredDocumentTemplates = requiredDocumentTemplates;

//     // Save the updated workflow template
// await existingWorkflowTemplate.save();

//     res.status(200).json(existingWorkflowTemplate);
// } catch (error) {
//     console.error('Error updating workflow template:', error);
//     res.status(500).json({ error: 'Internal server error' });
// }
// }

// Delete a workflow template
export async function deleteWorkflowTemplate(req, res) {
  try {
    await WorkflowTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: "Workflow template deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export default {
  createWorkflowTemplate,
  getAllWorkflowTemplates,
  getWorkflowTemplateById,
  // updateWorkflowTemplate,
  deleteWorkflowTemplate,
};
