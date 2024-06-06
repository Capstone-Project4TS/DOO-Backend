import Workflow from "../models/workflow.model.js";
import WorkflowTemplate from "../models/workflowTemplate.model.js";
import User from "../models/users.model.js";
import Document from "../models/document.model.js";
import UserWorkflow from "../models/userWorkflow.model.js";
import { handleData } from "../controllers/documentController.js";
import Folder from "../models/folder.model.js";
import * as WorkflowService from "../services/workflowService.js";
import createFolderHierarchy from "../services/folderService.js";

export async function createWorkflow(req, res) {
  // const documentData = JSON.parse(req.body.documentData);
  console.log("Received request body:", req.body); // Log the entire request body

  const { workflowTemplateId, workflowName, userId, reqDoc, addDoc } = req.body;

  if (!reqDoc || reqDoc.length === 0) {
    console.log("No reqDoc provided");
    return res.status(400).json({ message: "No data provided" });
  }

  try {
    const workflowTemplate = await WorkflowTemplate.findById(workflowTemplateId)
      .populate({
        path: "categoryId",
      })
      .populate("subCategoryId")
      .exec();
    console.log("hello");
    console.log(workflowTemplate);
    if (!workflowTemplate) {
      return res.status(404).json({ message: "Workflow template not found" });
    }

    // Extract stage information
    const stages = workflowTemplate.stages;

    // Assign users to stages based on conditions or without conditions
    const assignedUsers = [];
    for (const [index, stage] of stages.entries()) {
      let assignedUser;
      if (stage.hasCondition) {
        // Evaluate condition and select appropriate user(s)
        assignedUser = await WorkflowService.assignUserWithCondition(
          stage,
          reqDoc
        );
      } else {
        // Select user with least workload for the role
        assignedUser = await WorkflowService.assignUserWithoutCondition(stage);
      }
      assignedUsers.push({ user: assignedUser, stageIndex: index });
    }

    // Define the criteria for the hierarchy
    const repositoryId = workflowTemplate.depId;
    console.log("Dep Id", repositoryId);
    const categoryName = workflowTemplate.categoryId.name;
    const subCategoryName = workflowTemplate.subCategoryId.name;

    const year = new Date().getFullYear();
    console.log("year", year);
    const quarter = WorkflowService.getCurrentQuarter();
    console.log("Quarter", quarter);
    const month = new Date().getMonth() + 1;
    console.log("month", month);
    const monthName = new Date(year, month - 1).toLocaleString("default", {
      month: "long",
    });

    console.log("month name", monthName);
    // Check if a workflow with the same name already exists for the current month
    const existingWorkflow = await Workflow.findOne({
      name: workflowName,
      user: userId,
      createdAt: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      },
    });

    let newWorkflow;
    if (existingWorkflow) {
      // Update the existing workflow
      newWorkflow = existingWorkflow;
    } else {
      // Create a new workflow instance
      newWorkflow = new Workflow({
        name: workflowName,
        workflowTemplate: workflowTemplateId,
        user: userId,
        assignedUsers,
      });
    }

    // Generate PDF from document data
    const generatedDocuments = await handleData(reqDoc, addDoc);
    console.log("Generated Documents", generatedDocuments);

    if (generatedDocuments.status !== 200) {
      return res
        .status(generatedDocuments.status)
        .json(generatedDocuments.body);
    }

    const requiredDocuments = generatedDocuments.body.reqDocIds;
    const additionalDocuments = generatedDocuments.body.addDocIds;

    newWorkflow.requiredDocuments = requiredDocuments;
    newWorkflow.additionalDocuments = additionalDocuments;

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

    // Find the root folder based on the user's department
    const rootFolder = await Folder.findOne({
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
      name: categoryName,
    });
    console.log("Category Folder", categoryFolder);
    let subCategoryFolder = await Folder.findOne({
      parentFolder: categoryFolder._id,
      name: subCategoryName,
    });
    console.log("Sub Category Folder", subCategoryFolder);
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
      name: workflowTemplate.name,
    });

    if (!workflowFolder) {
      console.log("Workflow folder is undefined. Initializing...");
      workflowFolder = new Folder({
        name: workflowTemplate.name,
        parentFolder: monthFolder._id,
      });
      workflowFolder = await workflowFolder.save();
      console.log("Workflow Folder", workflowFolder);
      monthFolder.folders.push(workflowFolder._id);
      await monthFolder.save();
    } else {
      console.log("Workflow folder already exists...");
      console.log(" Workflow Folder ", workflowFolder);
    }

    const index = workflowFolder.workflows.findIndex((workflow) => {
      console.log("Workflow:", workflow.workflowId);
      console.log("Saved Workflow ID:", savedWorkflow._id);
      console.log("Saved Workflow ID type:", typeof savedWorkflow._id);
      return workflow.workflowId.toString() === savedWorkflow._id.toString();
    });
    console.log("index", index);

    if (index === -1) {
      console.log("Workflow not found in folder. Adding...");
      workflowFolder.workflows.push({
        workflowId: savedWorkflow._id,
        documents: [
          ...savedWorkflow.requiredDocuments,
          ...savedWorkflow.additionalDocuments,
        ],
      });
      await workflowFolder.save();
    } else {
      console.log("Workflow already exists in folder. Skipping...");
    }

    return res
      .status(201)
      .json({ workflow: savedWorkflow, userWorkflows, workflowFolder });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get all workflow templates
export async function getAllRequiredDocuments(req, res) {
  try {
    const template = await Workflow.findById(req.params.id)
      .populate("requiredDocuments")
      .populate("additionalDocuments");

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
// error handled
export const getAllWorkflows = async (req, res) => {
  try {
    // Fetch all workflow instances from the database
    const workflows = await Workflow.find();

    if (!workflows) {
      return res.status(404).json({ message: "No worklfow found." });
    } else {
      return res.status(200).json(workflows);
    }
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export async function getWorkflowById(req, res) {
  const { id } = req.params;

  try {
    const workflow = await Workflow.findById(id)
      .select("-user -currentStageIndex -status -assignedUsers ")
      .populate({
        path: "workflowTemplate",
        select: "name stages.stageTitle",
      })
      .populate({
        path: "requiredDocuments",
        select: "-filePath",
      })
      .populate({
        path: "additionalDocuments",
        select: "-filePath",
      });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Function to process document sections
    const processSections = (sections) => {
      return sections.map((section) => ({
        ...section.toObject(),
        content: section.content.map((contentItem) => {
          if (contentItem.type === "upload") {
            return {
              ...contentItem,
              value: null,
            };
          }
          return contentItem;
        }),
      }));
    };

    // Process each document to exclude value for upload types and set filePath to null
    const processDocument = (doc) => {
      if (!doc) return null;

      return {
        ...doc.toObject(),
        title: doc.title,
        sections: processSections(doc.sections),
      };
    };

    // Process required documents
    const processedRequiredDocuments = workflow.requiredDocuments.map(
      processDocument
    );

    // Process additional documents if they exist
    let processedAdditionalDocuments = [];
    if (workflow.additionalDocuments) {
      processedAdditionalDocuments = workflow.additionalDocuments.map(
        processDocument
      );
    }

    // Construct the result with processed documents and workflowTemplate
    const result = {
      ...workflow.toObject(),
      workflowTemplate: {
        name: workflow.workflowTemplate.name,
        stages: workflow.workflowTemplate.stages.map((stage) => stage.stageTitle),
      },
      requiredDocuments: processedRequiredDocuments,
      additionalDocuments: processedAdditionalDocuments,
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving workflow:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}


export async function updateWorkflow(req, res) {
  const { id } = req.params;
  const { workflowName, reqDoc, addDoc } = req.body;

  try {
    // Check if the workflow exists
    const existingWorkflow = await Workflow.findById(id);
    if (!existingWorkflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Process document data if provided
    if (reqDoc || addDoc) {
      // Generate PDF from document data
      const generatedDocuments = await handleData(reqDoc, addDoc);
      if (generatedDocuments.status !== 200) {
        return res
          .status(generatedDocuments.status)
          .json(generatedDocuments.body);
      }

      if (reqDoc) {
        const requiredDocuments = generatedDocuments.body.reqDocIds;
        existingWorkflow.requiredDocuments = requiredDocuments;
      }

      if (addDoc) {
        const additionalDocuments = generatedDocuments.body.addDocIds;
        existingWorkflow.additionalDocuments = additionalDocuments;
      }
    }

    // Update the workflow name if provided
    if (workflowName) {
      existingWorkflow.name = workflowName;
    }

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
      .populate({
        path: "requiredDocuments",
        select: "title filePath",
        model: Document,
      })
      .populate({
        path: "additionalDocuments",
        select: "title filePath",
        model: Document,
      })
      .populate({
        path: "assignedUsers.user",
        select: "name",
      })
      .populate({
        path: "assignedUsers.committee",
        select: "name",
      })
      .populate({
        path: "comments.fromUser",
        select: "name",
      })
      .populate({
        path: "comments.toUser",
        select: "name",
      })
      .populate({
        path: "comments.visibleTo",
        select: "name",
      });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Check if user is assigned to the workflow and active in the current stage
    const assignedUser = workflow.assignedUsers.find(
      (user) => user.user && user.user._id.toString() === userId
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

    // Get the current stage user or committee name
    let currentStageUserOrCommitteeName = "";
    const currentStage = workflow.assignedUsers.find(
      (stage) => stage.stageIndex === currentStageIndex
    );
    if (currentStage) {
      const id = currentStage.user || currentStage.committee;
      if (id) {
        // Check if the ID belongs to a User
        const user = await User.findById(id).select("name");
        if (user) {
          currentStageUserOrCommitteeName = user.name;
        } else {
          // If not a user, check if it belongs to a Committee
          const committee = await Committee.findById(id).select("name");
          if (committee) {
            currentStageUserOrCommitteeName = committee.name;
          }
        }
      }
    }

    // Log the current stage information for debugging
    console.log("Current Stage:", currentStage);
    console.log(
      "Current Stage User/Committee ID:",
      currentStage ? currentStage.user || currentStage.committee : null
    );
    console.log(
      "Current Stage User/Committee Name:",
      currentStageUserOrCommitteeName
    );

    // Prepare response data
    const responseData = {
      workflow: {
        _id: workflow._id,
        status: workflow.status,
        currentStageIndex: workflow.currentStageIndex,
        requiredDocuments: workflow.requiredDocuments.map((doc) => ({
          name: doc.title,
          filePath: doc.filePath,
        })),
        additionalDocuments: workflow.additionalDocuments.map((doc) => ({
          name: doc.title,
          filePath: doc.filePath,
        })),
        comments,
      },
      currentStageUserOrCommitteeName,
      buttons: {
        canMoveForward,
        canMoveBackward,
        isOwner,
        canApprove,
      },
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
        _id: workflow._id,
        workflowName: workflow.name || "Unnamed Workflow",
        status: workflow.status,
        createdAt: workflow.createdAt,
        categoryName,
        subCategoryName,
      };
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Search workflows by their name
export const searchWorkflowsByName = async (req, res) => {
  const { name } = req.query;

  try {
    if (!name) {
      return res.status(400).json({ message: "Name parameter is required" });
    }

    // Search by name
    const workflows = await Workflow.find({
      name: { $regex: new RegExp(name, "i") },
    });

    if (workflows.length === 0) {
      return res
        .status(404)
        .json({ message: "No workflows found matching the name" });
    }

    return res.status(200).json({ workflows });
  } catch (error) {
    console.error("Error searching workflows by name:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Controller function to filter workflows
export const filterWorkflows = async (req, res) => {
  const { status, user, workflowTemplate } = req.query;

  try {
    // Construct query object
    let query = {};

    // Add status filter if provided
    if (status) {
      query.status = { $in: Array.isArray(status) ? status : [status] };
    }

    // Add user filter if provided
    if (user) {
      const userNames = Array.isArray(user) ? user : [user];
      const matchingUsers = await User.find({
        username: { $in: userNames.map((name) => new RegExp(name, "i")) },
      }).select("_id");

      if (matchingUsers.length > 0) {
        query.user = { $in: matchingUsers.map((u) => u._id) };
      } else {
        return res
          .status(404)
          .json({ message: "No workflows found matching the user criteria" });
      }
    }

    // Add workflowTemplate filter if provided
    if (workflowTemplate) {
      const templateNames = Array.isArray(workflowTemplate)
        ? workflowTemplate
        : [workflowTemplate];
      const matchingTemplates = await WorkflowTemplate.find({
        templateName: {
          $in: templateNames.map((name) => new RegExp(name, "i")),
        },
      }).select("_id");

      if (matchingTemplates.length > 0) {
        query.workflowTemplate = {
          $in: matchingTemplates.map((t) => t._id),
        };
      } else {
        return res.status(404).json({
          message: "No workflows found matching the workflow template criteria",
        });
      }
    }

    // Execute the query
    const workflows = await Workflow.find(query);

    if (workflows.length === 0) {
      return res
        .status(404)
        .json({ message: "No workflows found matching the criteria" });
    }

    return res.status(200).json({ workflows });
  } catch (error) {
    console.error("Error filtering workflows:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  searchWorkflowsByName,
  createWorkflow,
  filterWorkflows,
  getAllWorkflows,
  getWorkflowById,
  getAllRequiredDocuments,
};
