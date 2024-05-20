import WorkflowTemplate from '../models/workflowTemplate.model.js';
import DocumentTemplate from '../models/documentTemplate.model.js'
import mongoose from 'mongoose';

// Create new workflow template
export const createWorkflowTemplate = async (req, res) => {
  try {
    const { name, categoryId, subCategoryId, stages, requiredDocumentTemplates,additionalDoc } = req.body;

    // Input validation (required fields)
    if (!name || !categoryId || !subCategoryId || !stages.length || !requiredDocumentTemplates.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate category and subcategory IDs (assuming they are ObjectIds)
    if (!mongoose.Types.ObjectId.isValid(categoryId) || !mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return res.status(400).json({ error: 'Invalid category or subcategory ID' });
    }

    // Validate stages
    stages.forEach(stage => {

      if (!stage.stageTitle || typeof stage.stageTitle !== 'string') {
        throw new Error('Invalid stage data: Missing or invalid stage title');
      }


      // Validate condition
      if (stage.hasCondition) {
        if (!stage.condition) {
          throw new Error('Condition required when hasCondition is true');
        } else {
          // Validate condition variants (if present)
          if (stage.conditionVariants && stage.conditionVariants.length) {
            if (!stage.hasCondition) {
              throw new Error('conditionVariants require hasCondition to be true');
            }
            stage.conditionVariants.forEach(variant => {
              if (!variant.condition_name || !variant.operator || !variant.value || !(typeof variant.value === 'number' || typeof variant.value === 'string')) {
                throw new Error('Invalid condition variant: Missing required properties or invalid value format');
              }
              // Validate approverType within conditionVariants
              if (!variant.approverType || !['Single Person', 'Committee'].includes(variant.approverType)) {
                throw new Error('Invalid condition variant: Missing or invalid approver type');
              }
            });
          }
        }

        // Add validation for condition structure (if needed)
      } else {
        if (stage.condition || stage.conditionVariants?.length) {
          throw new Error('Condition and conditionVariants should be empty when hasCondition is false');
        }
        if (!['Single Person', 'Committee'].includes(stage.approverType)) {
          throw new Error('Invalid stage data: Missing required properties or invalid approver type');
        }
      }


      // Add validation for roles in permissions and specific condition types (if needed)
      // ... (your additional validation logic here)
    });


    const newTemplate = new WorkflowTemplate({
      name,
      categoryId,
      subCategoryId,
      stages,
      requiredDocumentTemplates,
      additionalDoc
    });

    const savedTemplate = await newTemplate.save();
    res.status(201).json(savedTemplate);
  } catch (err) {
    console.error('Error creating workflow template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all workflow templates
export async function getAllWorkflowTemplates(req, res) {
  try {
    const templates = await WorkflowTemplate.find();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get all workflow templates
export async function getAllRequiredDocumentTemplates(req, res) {

  try {
    const template = await WorkflowTemplate.findById(req.params.id).populate('requiredDocumentTemplates');
    if (!template) {
      return res.status(404).json({ message: 'Workflow template not found' });
    }

    console.log('Template:', template);

    const documents = template.requiredDocumentTemplates;
    const additional = template.additionalDoc;


    // Send document contents array as response
    res.status(200).json({ documents, additional });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get a single workflow template by ID
export async function getWorkflowTemplateById(req, res) {
  try {
    const template = await WorkflowTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Workflow template not found' });
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
    res.json({ message: 'Workflow template deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export default {
  createWorkflowTemplate,
  getAllWorkflowTemplates,
  getWorkflowTemplateById,
  updateWorkflowTemplate,
  deleteWorkflowTemplate,
};
