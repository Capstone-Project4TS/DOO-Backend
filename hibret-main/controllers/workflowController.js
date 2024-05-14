import Workflow from '../models/workflow.model.js';
import WorkflowTemplate from '../models/workflowTemplate.model.js'
import User from '../models/users.model.js'
import UserWorkflow from '../models/userWorkflow.model.js';
import { generatePdfFromDocumentData } from '../controllers/documentController.js'
import Committee from '../models/committee.model.js';

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

        // Assign users to stages based on conditions or without conditions
        const assignedUsers = [];
        for (const [index, stage] of stages.entries()) {
            let assignedUser;
            if (stage.hasCondition) {
                console.log(data)
                // Evaluate condition and select appropriate user(s)
                assignedUser = await assignUserWithCondition(stage,data);
                console.log(assignedUser)
            } else {
                // Select user with least workload for the role
                assignedUser = await assignUserWithoutCondition(stage);
                console.log('without condition, single')
                console.log(assignedUser)
            }
            assignedUsers.push({ user: assignedUser, stageIndex: index });
        }

        console.log(assignedUsers)
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
        const userWorkflows = [];
        for (const user of assignedUsers) {
            const { user: userId, stageIndex } = user;
            
            // Update or create user workflow entry
            let userWorkflow = await UserWorkflow.findOneAndUpdate(
                { userId },
                { $addToSet: { workflows: { workflowId: savedWorkflow._id, isActive: stageIndex === newWorkflow.currentStageIndex } } },
                { upsert: true, new: true }
            );

            // Check if userWorkflow is not null before pushing it into the array
            if (userWorkflow) {
                userWorkflows.push(userWorkflow);
            }
        }


        return res.status(201).json({ workflow: savedWorkflow, userWorkflows });
    } catch (error) {
        console.error('Error creating workflow:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Helper function to assign user to a stage with condition
async function assignUserWithCondition(stage, documentData) {
    // Extract the condition field and its value from the stage
    console.log(documentData)
    const conditionFieldName = stage.condition;
    console.log(conditionFieldName)
    const conditionValue = extractConditionValue(conditionFieldName, documentData);
    console.log(conditionValue)
    
    // Initialize an array to store potential users for approval
    let potentialApprovers = [];

    // Check if the stage has condition variants
    if (stage.conditionVariants && stage.conditionVariants.length > 0) {
        // Iterate over each condition variant
        for (const variant of stage.conditionVariants) {
            // Evaluate the condition variant
            const conditionMatched = evaluateCondition(variant, conditionValue);
            console.log(conditionMatched)
            // If the condition variant is matched
            if (conditionMatched) {
                // Select approver(s) based on the condition variant
                if (variant.approverType === 'Single Person') {
                    console.log('SingleWithCondition')
                    console.log(variant.single_permissions.role_id);
                    // Select single user based on role and workload
                    potentialApprovers = await selectSingleUser(variant.single_permissions.role_id);
                    

                } else if (variant.approverType === 'Committee') {
                    console.log('ComitteeWithCondition')
                    // Select committee members based on roles and workload
                   potentialApprovers = variant.committee_permissions.role_ids;
                    
                }
                // Break the loop after finding the matched condition variant
                break;
            }
        }
    }

    // Return the selected user(s)
    return potentialApprovers;
}

// Function to extract condition value from document data
function extractConditionValue(fieldName, documentData) {
    // Iterate through documentData to find the field matching fieldName and return its value
    for (const data of documentData) {
        for (const section of data.sections) {
            // Find the content with the given fieldName
            const content = section.content.find(field => field.title === fieldName);
            if (content && content.value !== undefined) {
                // If content is found, return its value
                return content.value;
            }
        }
    }

    // If fieldName is not found, return null
    return null;
}


// Function to evaluate condition variant
function evaluateCondition(variant, conditionValue) {
    // Logic to evaluate condition based on condition value and variant value
    // For example, you might compare the condition value with the variant value using the operator
    switch (variant.operator) {
        case '>':
            return conditionValue > variant.value;
        case '<':
            return conditionValue < variant.value;
        case '>=':
            return conditionValue >= variant.value;
        case '<=':
            return conditionValue <= variant.value;
        default:
            return false;
    }
}

// Function to select single user based on role and workload
export async function selectSingleUser(role_id) {
    try {
        // Find users with the given role_id
        const users = await User.find({ role_id });

        // Array to store workload details of each user
        const workloadDetails = [];

        // Iterate through users
        for (const user of users) {
            // Find the user's entry in the UserWorkflow collection
            const userWorkflow = await UserWorkflow.findOne({ userId: user._id });

            // If userWorkflow is found, count the number of workflows
            let workflowCount = 0;
            if (userWorkflow) {
                workflowCount = userWorkflow.workflows.length;
            }

            // Push workload details to array
            workloadDetails.push({ userId: user._id, workflowCount });
        }

        // Sort users based on workload (ascending order)
        workloadDetails.sort((a, b) => a.workflowCount - b.workflowCount);

        // Return the user ID with the least workload
        console.log('the user with least workload');
        console.log(workloadDetails[0].userId)
        return workloadDetails[0].userId;
    } catch (error) {
        console.error("Error finding user with least workload:", error);
        throw error; // Throw error for handling at higher level
    }
}


// Helper function to assign user to a stage without condition
async function assignUserWithoutCondition(stage) {
    let potentialApprovers = [];
    if (stage.approverType === 'Single Person') {
        console.log('signlewithoutcondition')
        console.log(stage.single_permissions.role_id);
        // Select single user based on role and workload
        potentialApprovers = await selectSingleUser(stage.single_permissions.role_id);
        
      
    } else if (stage.approverType === 'Committee') {
        console.log('committeeWithoutConditon')
        // Select committee members based on roles and workload
       // potentialApprovers = await selectCommitteeMembers(stage.committee_permissions.role_ids);
       potentialApprovers = stage.committee_permissions.role_ids;

    }
    return potentialApprovers;
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

// Controller function to fetch all workflow instances
export const getWorkflowsById = async (req, res) => {
    const {workflowId}= req.params;
    try {
        // Fetch  workflow instances from the database
        const workflow = await Workflow.findById(workflowId);

        console.log(workflow);
        return res.status(200).json(workflow);
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


export async function approveWorkflow(req, res) {
    const { workflowId } = req.params; // Assuming workflowId is passed in the URL parameters

    try {
        // Find the workflow by workflowId
        const workflow = await Workflow.findById(workflowId);
        if (!workflow) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        // Check if the workflow status is already "Approved"
        if (workflow.status === 'Approved') {
            return res.status(400).json({ message: 'Workflow status is already approved' });
        }

        // Update the workflow status to "Approved"
        workflow.status = 'Approved';
        await workflow.save();

        return res.status(200).json({ message: 'Workflow status updated to approved', workflow });
    } catch (error) {
        console.error('Error approving workflow:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default {
    createWorkflow,
    getAllWorkflows,
};
