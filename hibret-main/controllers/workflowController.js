import Workflow from "../models/workflow.model.js";
import WorkflowTemplate from "../models/workflowTemplate.model.js";
import User from "../models/users.model.js";
import UserWorkflow from "../models/userWorkflow.model.js";
import UserModel from '../models/users.model.js'
import { handleData } from "../controllers/documentController.js";
import Folder from "../models/folder.model.js";

function getCurrentQuarter() {
  const month = new Date().getMonth() + 1; // getMonth() returns 0-11
  return Math.floor((month - 1) / 3) + 1;
}

export async function createWorkflow(req, res) {
  const { workflowTemplateId, workflowName, userId, reqDoc, addDoc } = req.body;
  const files = req.files;
  let reqDocs = [];
  let addDocs = [];
  try {
    reqDocs = reqDoc ? JSON.parse(reqDoc) : [];
    addDocs = addDoc ? JSON.parse(addDoc) : [];
  } catch (error) {
    console.error("Invalid JSON format in reqDoc or addDoc:", error);
    return res.status(400).json({ message: "Invalid JSON format" });
  }
  try {
    // Retrieve workflow template
    const workflowTemplate = await WorkflowTemplate.findById(
      workflowTemplateId
    );
    if (!workflowTemplate) {
      return res.status(404).json({ message: "Workflow template not found" });
    }

    // Retrieve user and role information
    const user = await UserModel.findById(userId).populate({
      path: "role_id",
    });
    const userDepartment = user.role_id.depId; // Assuming user's department is available in the request

    // Extract stage information
    const stages = workflowTemplate.stages;

    // Assign users to stages based on conditions or without conditions
    const assignedUsers = [];
    for (const [index, stage] of stages.entries()) {
      let assignedUser;
      if (stage.hasCondition) {
        // Evaluate condition and select appropriate user(s)
        assignedUser = await assignUserWithCondition(stage, reqDocs);
      } else {
        // Select user with least workload for the role
        assignedUser = await assignUserWithoutCondition(stage);
      }
      assignedUsers.push({ user: assignedUser, stageIndex: index });
    }

    // Create workflow instance
    const newWorkflow = new Workflow({
      name: workflowName,
      workflowTemplate: workflowTemplateId,
      user: userId,
      assignedUsers,
    });

    // Generate PDF from document data
    const generatedDocuments = await handleData(reqDoc, addDoc, files);

    // Update documents field of the workflow
    newWorkflow.requiredDocuments = generatedDocuments.reqDocIds;
    newWorkflow.additionalDocuments = generatedDocuments.addDocIds;

    // Save workflow instance
    const savedWorkflow = await newWorkflow.save();

    // Update or create user workflow entry
    const userWorkflows = [];
    for (const user of assignedUsers) {
      const { user: userId, stageIndex } = user;

      // Update or create user workflow entry
      let userWorkflow = await UserWorkflow.findOneAndUpdate(
        { userId },
        {
          $addToSet: {
            workflows: {
              workflowId: savedWorkflow._id,
              isActive: stageIndex === newWorkflow.currentStageIndex,
            },
          },
        },
        { upsert: true, new: true }
      );

      // Check if userWorkflow is not null before pushing it into the array
      if (userWorkflow) {
        userWorkflows.push(userWorkflow);
      }
    }

    // Define the criteria for the hierarchy
    const repositoryId = workflowTemplate.depId;
    const year = new Date().getFullYear();
    const quarter = getCurrentQuarter();
    const month = new Date().getMonth() + 1;
    const monthName = new Date(year, month - 1).toLocaleString("default", {
      month: "long",
    });

    // Find the root folder based on the user's department
    const rootFolder = await Folder.findOne({
      name: userDepartment,
      parentFolder: repositoryId,
    });
    if (!rootFolder) {
      return res
        .status(404)
        .json({ message: "Department Repository not found" });
    }

    // Traverse the folder hierarchy
    let categoryFolder = await Folder.findOne({
      parentFolder: rootFolder._id,
      name: workflowTemplate.categoryId,
    });

    let subCategoryFolder = await Folder.findOne({
      parentFolder: categoryFolder._id,
      name: workflowTemplate.subCategoryId,
    });

    let yearFolder = await Folder.findOne({
      parentFolder: subCategoryFolder._id,
      name: `workflows of ${year}`,
    });
    if (!yearFolder) {
      await createFolderHierarchy(subCategoryFolder._id, year);
      yearFolder = await Folder.findOne({
        parentFolder: subCategoryFolder._id,
        name: `workflows of ${year}`,
      });
    }

    let quarterFolder = await Folder.findOne({
      parentFolder: yearFolder._id,
      name: `Quarter${quarter}`,
    });

    let monthFolder = await Folder.findOne({
      parentFolder: quarterFolder._id,
      name: `${monthName}`,
    });

    let workflowFolder = await Folder.findOne({
      parentFolder: monthFolder._id,
      name: workflowName,
    });
    if (!workflowFolder) {
      workflowFolder = new Folder({
        name: workflowName,
        parentFolder: monthFolder._id,
      });
      workflowFolder = await workflowFolder.save();
    }

    // Add the workflow ID and documents to the workflow folder
    workflowFolder.workflows.push({
      workflowId: savedWorkflow._id,
      documents: [
        ...newWorkflow.requiredDocuments,
        ...newWorkflow.additionalDocuments,
      ],
    });
    await workflowFolder.save();
    newWorkflow.parentFolder=workflowFolder._id;
    await  newWorkflow.save();

    return res
      .status(201)
      .json({ workflow: savedWorkflow, userWorkflows, workflowFolder });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Helper function to assign user to a stage with condition
async function assignUserWithCondition(stage, documentData) {
  // Extract the condition field and its value from the stage
  console.log(documentData);
  const conditionFieldName = stage.condition;
  console.log(conditionFieldName);
  const conditionValue = extractConditionValue(
    conditionFieldName,
    documentData
  );
  console.log(conditionValue);

  // Initialize an array to store potential users for approval
  let potentialApprovers = [];

  // Check if the stage has condition variants
  if (stage.conditionVariants && stage.conditionVariants.length > 0) {
    // Iterate over each condition variant
    for (const variant of stage.conditionVariants) {
      // Evaluate the condition variant
      const conditionMatched = evaluateCondition(variant, conditionValue);
      console.log(conditionMatched);
      // If the condition variant is matched
      if (conditionMatched) {
        // Select approver(s) based on the condition variant
        if (variant.approverType === "Single Person") {
          console.log("SingleWithCondition");
          console.log(variant.single_permissions.role_id);
          // Select single user based on role and workload
          potentialApprovers = await selectSingleUser(
            variant.single_permissions.role_id
          );
        } else if (variant.approverType === "Committee") {
          console.log("ComitteeWithCondition");
          // Select committee members based on roles and workload
          // potentialApprovers = await selectCommitteeMembers(variant.committee_permissions.role_ids);
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
  console.log("documentData:", JSON.stringify(documentData, null, 2)); // Log the structure of documentData

  // Iterate through documentData to find the field matching fieldName and return its value
  for (const data of documentData) {
    console.log("Processing data:", JSON.stringify(data, null, 2)); // Log the current data object

    if (data.sections && Array.isArray(data.sections)) {
      // Check if data.sections is defined and is an array
      for (const section of data.sections) {
        console.log("Processing section:", JSON.stringify(section, null, 2)); // Log the current section object

        if (section.content && Array.isArray(section.content)) {
          // Check if section.content is defined and is an array
          // Find the content with the given fieldName
          const content = section.content.find(
            (field) => field.title === fieldName
          );
          if (content && content.value !== undefined) {
            // If content is found, return its value
            return content.value;
          }
        }
      }
    } else {
      console.log(
        "data.sections is not an array or is undefined for data:",
        JSON.stringify(data, null, 2)
      );
    }
  }
  // If no matching field is found, return undefined or a default value
  return undefined;
}

// Function to evaluate condition variant
function evaluateCondition(variant, conditionValue) {
  // Logic to evaluate condition based on condition value and variant value
  // For example, you might compare the condition value with the variant value using the operator
  switch (variant.operator) {
    case ">":
      return conditionValue > variant.value;
    case "<":
      return conditionValue < variant.value;
    case ">=":
      return conditionValue >= variant.value;
    case "<=":
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
    console.log("the user with least workload");
    console.log(workloadDetails[0].userId);
    return workloadDetails[0].userId;
  } catch (error) {
    console.error("Error finding user with least workload:", error);
    throw error; // Throw error for handling at higher level
  }
}

// Function to select committee members based on roles and workload
async function selectCommitteeMembers(roleIds) {
  // Query UserWorkflow collection to find committee members with least workload for the specified roles
  // Logic to select committee members with least workload
  // Return the selected committee members
}

// Helper function to assign user to a stage without condition
async function assignUserWithoutCondition(stage) {
  let potentialApprovers = [];
  if (stage.approverType === "Single Person") {
    console.log("signlewithoutcondition");
    console.log(stage.single_permissions.role_id);
    // Select single user based on role and workload
    potentialApprovers = await selectSingleUser(
      stage.single_permissions.role_id
    );
  } else if (stage.approverType === "Committee") {
    console.log("committeeWithoutConditon");
    // Select committee members based on roles and workload
    // potentialApprovers = await selectCommitteeMembers(stage.committee_permissions.role_ids);
    potentialApprovers = stage.committee_permissions.role_ids;
  }
  return potentialApprovers;
}

// Get all workflow templates
export async function getAllRequiredDocuments(req, res) {
  try {
    const template = await Workflow.findById(req.params.id)
      .populate("requiredDocuments")
      .populate("additionalDocuments");
    console.log("hello");
    if (!template) {
      return res.status(404).json({ message: "Workflow template not found" });
    }

    console.log("Template:", template);

    const documents = template.requiredDocuments;
    const additional = template.additionalDocuments;

    // Send document contents array as response
    res.status(200).json({ documents, additional });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Controller function to fetch all workflow instances
export const getAllWorkflows = async (req, res) => {
  try {
    // Fetch all workflow instances from the database
    const workflows = await Workflow.find();

    res.status(200).json(workflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to fetch all workflow instances
export const getWorkflowsById = async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch  workflow instances from the database
    const workflow = await Workflow.findById(id);

    console.log(workflow);
    return res.status(200).json(workflow);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export async function updateWorkflow(req, res) {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Check if the workflow exists
    const existingWorkflow = await Workflow.findById(id);
    if (!existingWorkflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Update the existing workflow with the provided data
    Object.assign(existingWorkflow, updates);

    // Save the updated workflow
    const updatedWorkflow = await existingWorkflow.save();

    return res.status(200).json(updatedWorkflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteWorkflow(req, res) {
  const { id } = req.params;

  try {
    // Check if the workflow exists
    const existingWorkflow = await Workflow.findById(id);
    if (!existingWorkflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Delete the workflow from the database
    await Workflow.deleteOne({ _id: id });

    return res.status(200).json({ message: "Workflow deleted successfully" });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// export async function approveWorkflow(req, res) {
//     const { workflowId } = req.params; // Assuming workflowId is passed in the URL parameters

//     try {
//         // Find the workflow by workflowId
//         const workflow = await Workflow.findById(workflowId);
//         if (!workflow) {
//             return res.status(404).json({ message: 'Workflow not found' });
//         }

//         // Check if the workflow status is already "Approved"
//         if (workflow.status === 'Approved') {
//             return res.status(400).json({ message: 'Workflow status is already approved' });
//         }

//         // Update the workflow status to "Approved"
//         workflow.status = 'Approved';
//         await workflow.save();

//         return res.status(200).json({ message: 'Workflow status updated to approved', workflow });
//     } catch (error) {
//         console.error('Error approving workflow:', error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }

export const moveStageForward = async (req, res) => {
  const { workflowId, userId, comment } = req.body;

  try {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const currentStageIndex = workflow.currentStageIndex;
    const assignedUser = workflow.assignedUsers.find(
      (user) =>
        user.user.toString() === userId && user.stageIndex === currentStageIndex
    );

    if (!assignedUser) {
      return res
        .status(403)
        .json({ message: "User not assigned to the current stage" });
    }

    // Check if the current stage is the last stage
    if (currentStageIndex === workflow.assignedUsers.length - 1) {
      return res
        .status(400)
        .json({ message: "Cannot move forward from the last stage" });
    }

    // Add comment if provided
    if (comment) {
      const nextUser = workflow.assignedUsers[currentStageIndex + 1]?.user;
      workflow.comments.push({
        stageIndex: currentStageIndex,
        fromUser: userId,
        toUser: workflow.assignedUsers[currentStageIndex + 1]?.user,
        comment: comment,
        visibleTo: [
          userId?.toString(),
          nextUser?.toString(),
          workflow.user._id.toString(),
        ].filter(Boolean), // Only commenter, next user and owner
      });
    }

    // Move to the next stage if there is one
    if (currentStageIndex < workflow.assignedUsers.length - 1) {
      workflow.currentStageIndex += 1;
      await UserWorkflow.updateOne(
        { userId, "workflows.workflowId": workflowId },
        { $set: { "workflows.$.isActive": false } }
      );
      const nextUserId =
        workflow.assignedUsers[workflow.currentStageIndex].user;
      await UserWorkflow.updateOne(
        { userId: nextUserId, "workflows.workflowId": workflowId },
        { $set: { "workflows.$.isActive": true } }
      );
    }

    await workflow.save();
    return res.status(200).json({ workflow });
  } catch (error) {
    console.error("Error moving stage forward:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const moveStageBackward = async (req, res) => {
  const { workflowId, userId, comment } = req.body;

  try {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const currentStageIndex = workflow.currentStageIndex;
    const assignedUser = workflow.assignedUsers.find(
      (user) =>
        user.user.toString() === userId && user.stageIndex === currentStageIndex
    );

    if (!assignedUser) {
      return res
        .status(403)
        .json({ message: "User not assigned to the current stage" });
    }

    // Add comment if provided
    if (comment) {
      const prevUserId =
        workflow.assignedUsers[workflow.currentStageIndex]?.user ||
        workflow.user;
      workflow.comments.push({
        stageIndex: currentStageIndex,
        fromUser: userId,
        toUser:
          workflow.assignedUsers[currentStageIndex - 1]?.user || workflow.user,
        comment: comment,
        visibleTo: [
          userId?.toString(),
          prevUserId?.toString(),
          workflow.user._id.toString(),
        ].filter(Boolean),
      });
    }

    // Move to the previous stage if there is one
    if (currentStageIndex >= 0) {
      workflow.currentStageIndex -= 1;
      await UserWorkflow.updateOne(
        { userId, "workflows.workflowId": workflowId },
        { $set: { "workflows.$.isActive": false } }
      );

      const prevUserId =
        workflow.assignedUsers[workflow.currentStageIndex]?.user ||
        workflow.user;

      if (prevUserId.toString() === workflow.user.toString()) {
        // Special case: revert to owner
        workflow.comments.push({
          stageIndex: currentStageIndex,
          comment,
          fromUser: userId,
          toUser: workflow.user,
        });
        return res.status(200).json({
          workflow,
          message: "Workflow reverted to owner for editing.",
        });
      } else {
        await UserWorkflow.updateOne(
          { userId: prevUserId, "workflows.workflowId": workflowId },
          { $set: { "workflows.$.isActive": true } }
        );
      }
    }

    await workflow.save();
    return res.status(200).json({ workflow });
  } catch (error) {
    console.error("Error moving stage backward:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const approveWorkflow = async (req, res) => {
  const { workflowId, userId, comment } = req.body;

  try {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Check if the workflow status is already "Approved"
    if (workflow.status === "Approved") {
      return res
        .status(400)
        .json({ message: "Workflow status is already approved" });
    }

    const currentStageIndex = workflow.currentStageIndex;
    const assignedUser = workflow.assignedUsers.find(
      (user) =>
        user.user.toString() === userId && user.stageIndex === currentStageIndex
    );

    if (!assignedUser) {
      return res
        .status(403)
        .json({ message: "User not assigned to the current stage" });
    }

    // Add comment if provided
    if (comment) {
      workflow.comments.push({
        stageIndex: currentStageIndex,
        fromUser: userId,
        toUser: workflow.user,
        comment: comment,
        visibleTo: [userId?.toString(), workflow.user._id.toString()].filter(
          Boolean
        ),
      });
    }

    // Check if it's the last stage
    if (currentStageIndex === workflow.assignedUsers.length - 1) {
      workflow.status = "Approved";
      await workflow.save();
      return res.status(200).json({ workflow });
    } else {
      return res.status(400).json({ message: "Not at the last stage" });
    }
  } catch (error) {
    console.error("Error approving workflow:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const rejectWorkflow = async (req, res) => {
  const { workflowId, userId, comment } = req.body;

  try {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Check if the workflow status is already "Approved"
    if (workflow.status === "Rejected") {
      return res
        .status(400)
        .json({ message: "Workflow status is already approved" });
    }

    const currentStageIndex = workflow.currentStageIndex;
    const assignedUser = workflow.assignedUsers.find(
      (user) =>
        user.user.toString() === userId && user.stageIndex === currentStageIndex
    );

    if (!assignedUser) {
      return res
        .status(403)
        .json({ message: "User not assigned to the current stage" });
    }

    // Add comment if provided
    if (comment) {
      workflow.comments.push({
        stageIndex: currentStageIndex,
        fromUser: userId,
        toUser: workflow.user,
        comment: comment,
        visibleTo: [userId?.toString(), workflow.user._id.toString()].filter(
          Boolean
        ),
      });
    }

    // Check if it's the last stage
    if (currentStageIndex === workflow.assignedUsers.length - 1) {
      workflow.status = "Rejected";
      await workflow.save();
      return res.status(200).json({ workflow });
    } else {
      return res.status(400).json({ message: "Not at the last stage" });
    }
  } catch (error) {
    console.error("Error rejecting workflow:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const ownerEditAndMoveForward = async (req, res) => {
  const { workflowId, userId, data, comment } = req.body;

  try {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    if (workflow.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "User is not the owner of the workflow" });
    }

    // Update documents
    workflow.documents = data.documents || workflow.documents;
    workflow.additionalDocuments =
      data.additionalDocuments || workflow.additionalDocuments;

    // Add comment if provided
    if (comment) {
      workflow.comments.push({
        stageIndex: workflow.currentStageIndex,
        fromUser: userId,
        toUser: workflow.assignedUsers[workflow.currentStageIndex + 1]?.user,
        comment: comment,
      });
    }

    // Move to the next stage if there is one
    if (workflow.currentStageIndex < workflow.assignedUsers.length - 1) {
      workflow.currentStageIndex += 1;
      await UserWorkflow.updateOne(
        { userId, "workflows.workflowId": workflowId },
        { $set: { "workflows.$.isActive": false } }
      );

      const nextUserId =
        workflow.assignedUsers[workflow.currentStageIndex].user;
      await UserWorkflow.updateOne(
        { userId: nextUserId, "workflows.workflowId": workflowId },
        { $set: { "workflows.$.isActive": true } }
      );
    }

    await workflow.save();
    return res.status(200).json({ workflow });
  } catch (error) {
    console.error("Error owner editing and moving forward:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getWorkflowDetails = async (req, res) => {
  const { workflowId, userId } = req.params;

  try {
    // Fetch workflow details
    const workflow = await Workflow.findById(workflowId)
      .populate("workflowTemplate")
      .populate("user")
      .populate("documents.templateId")
      .populate("assignedUsers")
      // .populate('assignedUsers.committee')
      .populate("comments.fromUser")
      .populate("comments.toUser")
      .populate("comments.visibleTo");

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Check if user is assigned to the workflow and active in the current stage
    const assignedUser = workflow.assignedUsers.find(
      (user) => user.user.toString() === userId
    );
    const isActiveUser =
      assignedUser && assignedUser.stageIndex === workflow.currentStageIndex;

    // Check user permissions and determine button visibility
    const isOwner = workflow.user._id.toString() === userId;
    const currentStageIndex = workflow.currentStageIndex;
    const canMoveForward =
      isActiveUser && currentStageIndex < workflow.assignedUsers.length - 1;
    const canMoveBackward = isActiveUser && currentStageIndex > 0;
    const canApprove =
      isActiveUser && currentStageIndex === workflow.assignedUsers.length - 1;

    // Determine comment visibility based on user role
    const comments = isOwner
      ? workflow.comments
      : workflow.comments.filter((comment) =>
          comment.visibleTo.some((user) => user._id.toString() === userId)
        );

    // Prepare response data
    const responseData = {
      workflow,
      buttons: {
        canMoveForward,
        canMoveBackward,
        isOwner,
        canApprove,
        // Add more button visibility flags as needed...
      },
      comments,
    };

    // Return the workflow details to the client
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching workflow details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllWorkflowsOfOwner = async (req, res) => {
  const { userId } = req.params;

  try {
    const workflows = await Workflow.find({ user: userId })
      .populate({
        path: "workflowTemplate",
        select: "name categoryId subCategoryId",
        populate: [
          { path: "categoryId", select: "name" },
          { path: "subCategoryId", select: "name" },
        ],
      })
      .select("name status createdAt workflowTemplate");

    console.log(JSON.stringify(workflows, null, 2)); // Debugging line

    if (!workflows || workflows.length === 0) {
      return res
        .status(404)
        .json({ message: "No workflows found for this user" });
    }

    const response = workflows.map((workflow) => {
      const workflowTemplate = workflow.workflowTemplate || {};
      const categoryName = workflowTemplate.categoryId
        ? workflowTemplate.categoryId.name
        : "N/A";
      const subCategoryName = workflowTemplate.subCategoryId
        ? workflowTemplate.subCategoryId.name
        : "N/A";

      return {
        workflowName: workflow.name || "Unnamed Workflow",
        status: workflow.status,
        createdAt: workflow.createdAt,
        categoryName,
        subCategoryName,
      };
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  createWorkflow,
  getAllWorkflows,
  getAllRequiredDocuments,
};
