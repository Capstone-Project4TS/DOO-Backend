import UserWorkflow from "../models/userWorkflow.model.js";
import User from '../models/users.model.js';
import Workflow from '../models/workflow.model.js'
// Create a new user workflow
export async function createUserWorkflow(req, res) {
   const {userId,workflowId}= req.body;
  try {
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if the workflow exists
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Create a new entry in UserWorkflow collection
    const userWorkflow = new UserWorkflow({
      userId,
      workflows: [{ workflowId, isActive: true }]
    });

    await userWorkflow.save();
    return  res.status(201).json(userWorkflow);
  } catch (error) {
    throw new Error(`Error assigning workflow to user: ${error.message}`);
  }
}


// Function to deactivate a workflow for a user
export async function deactivateWorkflowForUser (userId, workflowId){
  try {
      // Update isActive to false for the specified workflowId
      await UserWorkflow.findOneAndUpdate(
          { userId, 'workflows.workflowId': workflowId },
          { $set: { 'workflows.$.isActive': false } }
      );
      return 'Workflow deactivated for user';
  } catch (error) {
      throw new Error(`Error deactivating workflow for user: ${error.message}`);
  }
};

// Function to activate a workflow for a user
export async function activateWorkflowForUser (userId, workflowId){
  try {
      // Update isActive to true for the specified workflowId
      await UserWorkflow.findOneAndUpdate(
          { userId, 'workflows.workflowId': workflowId },
          { $set: { 'workflows.$.isActive': true } }
      );
      return 'Workflow activated for user';
  } catch (error) {
      throw new Error(`Error activating workflow for user: ${error.message}`);
  }
};

export async function getUserWorkflows(req, res) {
  try {
    const { userId } = req.params;
    const userWorkflows = await UserWorkflow.find({ userId }).populate('workflows.workflowId');
    res.json(userWorkflows);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateUserWorkflowStatus(res, req) {
  try {
    const { userId, workflowId } = req.params;
    const { isActive } = req.body;
    await UserWorkflow.findOneAndUpdate(
      { userId, 'workflows.workflowId': workflowId },
      { 'workflows.$.isActive': isActive }
    );
    res.status(200).json({ message: 'User workflow status updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}