import Workflow from '../models/workflow.model.js';
import WorkflowTemplate from '../models/workflowTemplate.model.js'
import User from '../models/users.model.js'
import UserWorkflow from '../models/userWorkflow.model.js';
import { generatePdfFromDocumentData } from '../controllers/documentController.js'

// Controller function to create a new workflow instance
export async function createWorkflow(req, res) {
    const { workflowTemplateId, userId, data } = req.body;

    try {
        // Retrieve workflow template
        const workflowTemplate = await WorkflowTemplate.findById(workflowTemplateId);
        if (!workflowTemplate) {
            return res.status(404).json({ message: 'Workflow template not found' });
        }

        // Extract stage information
        const stages = workflowTemplate.stages;

        // Find users for each role and assign to stages
        const assignedUsers = [];
        for (const [index, stage] of stages.entries()) {
            const roleId = stage.single_permissions.role_id;
            const user = await User.findOne({ roles: roleId });
            if (user) {
                assignedUsers.push({ user: user._id, stageIndex: index });
            }
        }
        // Create workflow instance
        const newWorkflow = new Workflow({
            workflowTemplate: workflowTemplateId,
            user: userId,
            assignedUsers
        });

        // Generate PDF from document data
        const generatedDocuments = await generatePdfFromDocumentData(data);

        // Update documents field of the workflow
        newWorkflow.documents = generatedDocuments;

        // Save workflow instance
        const savedWorkflow = await newWorkflow.save();

        // Update or create user workflow entry
        const userWorkflow = await UserWorkflow.findOneAndUpdate(
            { userId: { $in: assignedUsers.map(user => user.user) } },
            { $set: { workflows: assignedUsers.map(user => ({ workflowId: savedWorkflow._id, isActive: user.stageIndex === newWorkflow.currentStageIndex })) } },
            { upsert: true, new: true }
        );

        return res.status(201).json({ workflow: savedWorkflow, userWorkflow });
    } catch (error) {
        console.error('Error creating workflow:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Controller function to fetch all workflow instances
export const getAllWorkflows = async (req, res) => {
    try {
        // Fetch all workflow instances from the database
        const workflows = await Workflow.find();

        res.status(200).json(workflows);
    } catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export async function updateWorkflow(req, res) {
    const { id } = req.params;
    const updates = req.body;

    try {
        // Check if the workflow exists
        const existingWorkflow = await Workflow.findById(id);
        if (!existingWorkflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        // Update the existing workflow with the provided data
        Object.assign(existingWorkflow, updates);

        // Save the updated workflow
        const updatedWorkflow = await existingWorkflow.save();

        return res.status(200).json(updatedWorkflow);
    } catch (error) {
        console.error('Error updating workflow:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


export async function deleteWorkflow(req, res) {
    const { id } = req.params;

    try {
        // Check if the workflow exists
        const existingWorkflow = await Workflow.findById(id);
        if (!existingWorkflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        // Delete the workflow from the database
        await Workflow.deleteOne({ _id: id });

        return res.status(200).json({ message: 'Workflow deleted successfully' });
    } catch (error) {
        console.error('Error deleting workflow:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


export default {
    createWorkflow,
    getAllWorkflows,
};
