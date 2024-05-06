import UserWorkflow from "../models/userWorkflow.model.js";

// Create a new user workflow
export async function createUserWorkflow(req, res) {
    try {
        const { userId, workflowId } = req.body;
        const userWorkflow = await UserWorkflow.create({ userId, workflows: [{ workflowId }] });
        res.status(201).json(userWorkflow);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
}

export async function getUserWorkflows(req,tes){
    try {
        const { userId } = req.params;
        const userWorkflows = await UserWorkflow.find({ userId }).populate('workflows.workflowId');
        res.json(userWorkflows);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
}

export async function updateUserWorkflowStatus(res, req){
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