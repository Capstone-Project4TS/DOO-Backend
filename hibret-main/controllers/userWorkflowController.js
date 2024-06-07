import UserWorkflow from "../models/userWorkflow.model.js";
import User from "../models/users.model.js";
import Workflow from "../models/workflow.model.js";
import Committee from '../models/committee.model.js';
// Create a new user workflow
export async function createUserWorkflow(req, res) {
  const { userId, workflowId } = req.body;
  try {
    if (!userId || !workflowId) {
      throw new Error("Both userId and workflowId are required");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const userWorkflow = new UserWorkflow({
      userId,
      workflows: [{ workflowId, isActive: true }],
    });

    await userWorkflow.save();
    return res.status(201).json(userWorkflow);
  } catch (error) {
    console.error(`Error assigning workflow to user: ${error.message}`);
    return res.status(400).json({ message: error.message });
  }
}

export async function deactivateWorkflowForUser(userId, workflowId) {
  try {
    await UserWorkflow.findOneAndUpdate(
      { userId, "workflows.workflowId": workflowId },
      { $set: { "workflows.$.isActive": false } }
    );
    return "Workflow deactivated for user";
  } catch (error) {
    throw new Error(`Error deactivating workflow for user: ${error.message}`);
  }
}

export async function activateWorkflowForUser(userId, workflowId) {
  try {
    await UserWorkflow.findOneAndUpdate(
      { userId, "workflows.workflowId": workflowId },
      { $set: { "workflows.$.isActive": true } }
    );
    return "Workflow activated for user";
  } catch (error) {
    throw new Error(`Error activating workflow for user: ${error.message}`);
  }
}

export async function getUserWorkflows(req, res) {
  try {
    const { userId } = req.params;

    // Check if the user is a member of any committee
    const committees = await Committee.find({ members: userId });
    const single = await UserWorkflow.find({userId});
    let userWorkflows;

    if (committees && committees.length > 0) {
      // If user is a committee member, fetch workflows associated with the committee
      const committeeIds = committees.map(committee => committee._id);
      userWorkflows = await UserWorkflow.find({ committeeId: { $in: committeeIds } }).populate({
        path: "workflows.workflowId",
        select: "name currentStageIndex status createdAt",
      });
    } 
    if (single){
      // If user is not a committee member, fetch workflows associated with the user
      userWorkflows = await UserWorkflow.find({ userId }).populate({
        path: "workflows.workflowId",
        select: "name currentStageIndex status createdAt",
      });
    }

    if (!userWorkflows || userWorkflows.length === 0) {
      return res
        .status(404)
        .json({ message: "This user doesn't have any workflows" });
    }

    const workflows = userWorkflows.flatMap((userWorkflow) =>
      userWorkflow.workflows
        .filter((workflow) => workflow.workflowId)
        .map((workflow) => ({
          workflowId: workflow.workflowId._id,
          name: workflow.workflowId.name || "Unnamed Workflow",
          currentStageIndex: workflow.workflowId.currentStageIndex,
          status: workflow.workflowId.status,
          createdAt: workflow.workflowId.createdAt,
        }))
    );

    if (!workflows || workflows.length === 0) {
      return res
        .status(404)
        .json({ message: "All workflows are removed or deleted" });
    }

    return res.json(workflows);
  } catch (error) {
    console.error("Error fetching user workflows:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateUserWorkflowStatus(req, res) {
  try {
    const { userId, workflowId } = req.params;
    const { isActive } = req.body;
    await UserWorkflow.findOneAndUpdate(
      { userId, "workflows.workflowId": workflowId },
      { "workflows.$.isActive": isActive }
    );
    return res
      .status(200)
      .json({ message: "User workflow status updated successfully" });
  } catch (error) {
    console.error("Error updating user workflow status:", error);
    return res.status(400).json({ message: error.message });
  }
}
