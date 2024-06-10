import Workflow from "../models/workflow.model.js";
import WorkflowTemplate from "../models/workflowTemplate.model.js";
import User from "../models/users.model.js";
import Document from "../models/document.model.js";
import UserWorkflow from "../models/userWorkflow.model.js";
import { handleData } from "../controllers/documentController.js";
import Committee from "../models/committee.model.js";
import Folder from "../models/folder.model.js";
import DraftWorkflow from "../models/workflowDraft.model.js";
import { sendNotification } from "./notification.js";

import {
  handleMajorityDecision,
  aggregateVotes,
} from "../services/workflowHelp.js";
import * as WorkflowService from "../services/workflowService.js";

export async function createWorkflow(req, res) {
  const { workflowTemplateId, workflowName, userId, reqDoc, addDoc } = req.body;

  if (!reqDoc || reqDoc.length === 0) {
    return res.status(400).json({ message: "No data provided" });
  }

  try {
    const workflowTemplate = await WorkflowTemplate.findById(workflowTemplateId)
      .populate({
        path: "categoryId",
      })
      .populate("subCategoryId")
      .exec();
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
      const committee = await Committee.findById(assignedUser);
      if (committee) {
        const userType = "Committee";
        assignedUsers.push({
          userType: userType,
          committee: assignedUser,
          stageIndex: index,
        });
      } else {
        const userType = "User";
        assignedUsers.push({
          userType: userType,
          user: assignedUser,
          stageIndex: index,
        });
      }
    }
    // Define the criteria for the hierarchy
    const repositoryId = workflowTemplate.depId;
    const categoryName = workflowTemplate.categoryId.name;
    const subCategoryName = workflowTemplate.subCategoryId.name;

    const year = new Date().getFullYear();
    const quarter = WorkflowService.getCurrentQuarter();
    const month = new Date().getMonth() + 1;
    const monthName = new Date(year, month - 1).toLocaleString("default", {
      month: "long",
    });

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

    // Update or create user workflow entry for the initiator
    await UserWorkflow.findOneAndUpdate(
      { userId },
      {
        $addToSet: {
          workflows: {
            workflowId: savedWorkflow._id,
            isActive: false, // Initiator's stage is -1, hence inactive
          },
        },
      },
      { upsert: true, new: true }
    );

    // Define an array to store user workflows
    let userWorkflows = [];
    // Update or create user workflow entries for assigned users
    for (const user of assignedUsers) {
      if (user.userType === "User") {
        let singleUserWorkflow = await UserWorkflow.findOneAndUpdate(
          { userId: user.user },
          {
            $addToSet: {
              workflows: {
                workflowId: savedWorkflow._id,
                isActive: user.stageIndex === newWorkflow.currentStageIndex,
              },
            },
          },
          { upsert: true, new: true }
        );

        // Check if singleUserWorkflow is not null before pushing it into the array
        if (singleUserWorkflow) {
          // Push singleUserWorkflow into userWorkflows array
          userWorkflows.push(singleUserWorkflow);
        } else {
          console.error(
            "Failed to create user workflow for single user:",
            userId
          );
        }
      } else if (user.userType === "Committee") {
        const committee = await Committee.findById(user.committee).populate(
          "members"
        );
        for (const member of committee.members) {
          let memberWorkflow = await UserWorkflow.findOneAndUpdate(
            { userId: member._id },
            {
              $addToSet: {
                workflows: {
                  workflowId: savedWorkflow._id,
                  isActive: user.stageIndex === newWorkflow.currentStageIndex,
                },
              },
            },
            { upsert: true, new: true }
          );
          // Check if memberWorkflow is not null before pushing it into the array
          if (memberWorkflow) {
            // Push memberWorkflow into userWorkflows array
            userWorkflows.push(memberWorkflow);
          } else {
            console.error("Failed to create user workflow for member:", member);
          }
        }

        let chairpersonWorkflow = await UserWorkflow.findOneAndUpdate(
          { userId: committee.chairperson._id },
          {
            $addToSet: {
              workflows: {
                workflowId: savedWorkflow._id,
                isActive: user.stageIndex === newWorkflow.currentStageIndex,
              },
            },
          },
          { upsert: true, new: true }
        );
        // Check if memberWorkflow is not null before pushing it into the array
        if (chairpersonWorkflow) {
          // Push memberWorkflow into userWorkflows array
          userWorkflows.push(chairpersonWorkflow);
        } else {
          console.error(
            "Failed to create user workflow for member:",
            chairpersonWorkflow
          );
        }
      }
    }

    // Send notifications to assigned users
    for (const user of assignedUsers) {
      if (user.userType === "User") {
        await sendNotification(
          user.user,
          userId,
          `You have been assigned to a new workflow: ${workflowName}.`,
          savedWorkflow._id
        );
      } else if (user.userType === "Committee") {
        const committee = await Committee.findById(user.committee).populate(
          "members"
        );
        for (const member of committee.members) {
          await sendNotification(
            member._id,
            userId,
            `You have been assigned to a new workflow as part of the committee ${committee.name}: ${workflowName}.`,
            savedWorkflow._id
          );
        }
        await sendNotification(
          committee.chairperson,
          userId,
          `You have been assigned to a new workflow as the chairperson of committee ${committee.name}: ${workflowName}.`,
          savedWorkflow._id
        );
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
    let subCategoryFolder = await Folder.findOne({
      parentFolder: categoryFolder._id,
      name: subCategoryName,
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
      name: workflowTemplate.name,
    });

    if (!workflowFolder) {
      workflowFolder = new Folder({
        name: workflowTemplate.name,
        parentFolder: monthFolder._id,
      });
      workflowFolder = await workflowFolder.save();
      monthFolder.folders.push(workflowFolder._id);
      await monthFolder.save();
    } else {
      console.log("Workflow folder already exists...");
    }

    const index = workflowFolder.workflows.findIndex((workflow) => {
      return workflow.workflowId.toString() === savedWorkflow._id.toString();
    });

    if (index === -1) {
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
    return res.status(201).json({
      message: "Workflow created successfully",
      workflow: savedWorkflow,
      userWorkflows,
      workflowFolder,
    });
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
    const workflows = await Workflow.find({ isDraft: { $ne: true } });

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
    const processedRequiredDocuments =
      workflow.requiredDocuments.map(processDocument);

    // Process additional documents if they exist
    let processedAdditionalDocuments = [];
    if (workflow.additionalDocuments) {
      processedAdditionalDocuments =
        workflow.additionalDocuments.map(processDocument);
    }

    // Construct the result with processed documents and workflowTemplate
    const result = {
      ...workflow.toObject(),
      workflowTemplate: {
        name: workflow.workflowTemplate.name,
        stages: workflow.workflowTemplate.stages.map(
          (stage) => stage.stageTitle
        ),
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

// Update Workflow Function
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

    // Temporarily set currentStageIndex to -1 during update
    const currentStageIndexBeforeUpdate = existingWorkflow.currentStageIndex;
    existingWorkflow.currentStageIndex = -1;

    // Save the updated workflow
    const updatedWorkflow = await existingWorkflow.save();

    // Revert currentStageIndex to its original value
    updatedWorkflow.currentStageIndex = currentStageIndexBeforeUpdate;
    await updatedWorkflow.save();

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

// Cancel Workflow Function
export const cancelWorkflow = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    // Check if the workflow exists
    const existingWorkflow = await Workflow.findById(id);
    if (!existingWorkflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Update the status of the workflow to "Cancelled" and add the reason
    existingWorkflow.status = "Cancelled";
    existingWorkflow.cancellationReason = reason;

    // Save the updated workflow
    const updatedWorkflow = await existingWorkflow.save();

    // Remove the workflow from user workflows
    await UserWorkflow.updateMany(
      { "workflows.workflowId": id },
      { $pull: { workflows: { workflowId: id } } }
    );

    return res.status(200).json(updatedWorkflow);
  } catch (error) {
    console.error("Error cancelling workflow:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const moveStageForward = async (req, res) => {
  const { workflowId, userId, comment } = req.body;

  try {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const currentStageIndex = workflow.currentStageIndex;

    // Check if the user is a member of any committee
    const committee = await Committee.findOne({ members: userId });
    let assignedUser;

    if (committee) {
      assignedUser = workflow.assignedUsers.find(
        (user) =>
          user.committee.toString() === committee._id &&
          user.stageIndex === currentStageIndex
      );
    } else {
      assignedUser = workflow.assignedUsers.find(
        (user) =>
          user.user.toString() === userId &&
          user.stageIndex === currentStageIndex
      );
    }

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
      const nextAssignedUser = workflow.assignedUsers[currentStageIndex + 1];
      const nextUser = nextAssignedUser?.user || null;
      const nextCommittee = nextAssignedUser?.committee || null;

      const commentObj = {
        stageIndex: currentStageIndex,
        fromUser: userId,
        toUser: nextUser,
        toCommittee: nextCommittee,
        comment: comment,
        decision: "Forward",
        visibleTo: [
          userId?.toString(),
          nextUser?.toString(),
          workflow.user._id.toString(),
        ].filter(Boolean),
      };

      // If the user is part of a committee, add the committee name to the comment
      if (committee) {
        commentObj.memberOf = committee.name;
        commentObj.visibleTo.push(
          ...committee.members.map((member) => member._id.toString())
        );
      }

      // If the next stage involves a committee, make the comment visible to all its members
      if (nextCommittee) {
        const nextCommitteeMembers = await Committee.findById(
          nextCommittee
        ).populate("members");
        if (nextCommitteeMembers) {
          commentObj.visibleTo.push(
            ...nextCommitteeMembers.members.map((member) =>
              member._id.toString()
            )
          );
        }
      }

      workflow.comments.push(commentObj);
    }

    if (assignedUser.userType === "Committee") {
      workflow.votes.push({
        stageIndex: currentStageIndex,
        committeeId: assignedUser.committee,
        memberId: userId,
        decision: "forward",
      });

      const voteCounts = aggregateVotes(workflow.votes, currentStageIndex);

      if (
        Object.keys(voteCounts).length === assignedUser.committee.members.length
      ) {
        const majorityDecision = Object.keys(voteCounts).reduce((a, b) =>
          voteCounts[a] > voteCounts[b] ? a : b
        );
        await handleMajorityDecision(
          workflow,
          userId,
          majorityDecision,
          currentStageIndex,
          res
        );
        return;
      }
    } else {
      workflow.currentStageIndex += 1;
      await UserWorkflow.updateOne(
        { userId, "workflows.workflowId": workflowId },
        { $set: { "workflows.$.isActive": false } }
      );

      const nextAssignedUser =
        workflow.assignedUsers[workflow.currentStageIndex];
      const nextUserId = nextAssignedUser.user || nextAssignedUser.committee;

      await UserWorkflow.updateOne(
        { userId: nextUserId, "workflows.workflowId": workflowId },
        { $set: { "workflows.$.isActive": true } }
      );

      if (nextAssignedUser.userType === "Committee") {
        const nextCommittee = await Committee.findById(nextUserId).populate(
          "members"
        );
        for (const member of nextCommittee.members) {
          await sendNotification(
            member._id,
            userId,
            `Workflow ${workflow.workflowName} has reached your stage as part of the committee ${nextCommittee.name}.`,
            workflowId
          );
        }
        await sendNotification(
          nextCommittee.chairperson,
          userId,
          `Workflow ${workflow.workflowName} has reached your stage as the chairperson of committee ${nextCommittee.name}.`,
          workflowId
        );
      } else {
        await sendNotification(
          nextUserId,
          userId,
          `Workflow ${workflow.workflowName} has reached your stage.`,
          workflowId
        );
      }
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

    // Check if the user is a member of any committee
    const committee = await Committee.findOne({ members: userId });
    let assignedUser;

    if (committee) {
      assignedUser = workflow.assignedUsers.find(
        (user) =>
          user.committee.toString() === committee._id.toString() &&
          user.stageIndex === currentStageIndex
      );
    } else {
      assignedUser = workflow.assignedUsers.find(
        (user) =>
          user.user.toString() === userId &&
          user.stageIndex === currentStageIndex
      );
    }

    if (!assignedUser) {
      return res
        .status(403)
        .json({ message: "User not assigned to the current stage" });
    }

    // Add comment if provided
    if (comment) {
      const prevAssignedUser = workflow.assignedUsers[currentStageIndex - 1];
      const prevUser = prevAssignedUser?.user || null;
      const prevCommittee = prevAssignedUser?.committee || null;

      const commentObj = {
        stageIndex: currentStageIndex,
        fromUser: userId,
        toUser: prevUser,
        toCommittee: prevCommittee,
        comment: comment,
        decision: "Revert",
        visibleTo: [
          userId?.toString(),
          prevUser?.toString(),
          workflow.user._id.toString(),
        ].filter(Boolean),
      };

      // If the user is part of a committee, add the committee name to the comment
      if (committee) {
        commentObj.memberOf = committee.name;
        commentObj.visibleTo.push(
          ...committee.members.map((member) => member._id.toString())
        );
      }

      // If the previous stage involves a committee, make the comment visible to all its members
      if (prevCommittee) {
        const prevCommitteeMembers = await Committee.findById(
          prevCommittee
        ).populate("members");
        if (prevCommitteeMembers) {
          commentObj.visibleTo.push(
            ...prevCommitteeMembers.members.map((member) =>
              member._id.toString()
            )
          );
        }
      }

      workflow.comments.push(commentObj);
    }

    if (assignedUser.userType === "Committee") {
      workflow.votes.push({
        stageIndex: currentStageIndex,
        committeeId: assignedUser.committee,
        memberId: userId,
        decision: "revert",
      });

      const voteCounts = aggregateVotes(workflow.votes, currentStageIndex);

      if (
        Object.keys(voteCounts).length === assignedUser.committee.members.length
      ) {
        const majorityDecision = Object.keys(voteCounts).reduce((a, b) =>
          voteCounts[a] > voteCounts[b] ? a : b
        );
        await handleMajorityDecision(
          workflow,
          userId,
          majorityDecision,
          currentStageIndex,
          res
        );
        return;
      }
    } else {
      if (currentStageIndex > 0) {
        workflow.currentStageIndex -= 1;
        await UserWorkflow.updateOne(
          { userId, "workflows.workflowId": workflowId },
          { $set: { "workflows.$.isActive": false } }
        );

        const prevAssignedUser =
          workflow.assignedUsers[workflow.currentStageIndex];
        const prevUserId = prevAssignedUser.user || prevAssignedUser.committee;

        await UserWorkflow.updateOne(
          { userId: prevUserId, "workflows.workflowId": workflowId },
          { $set: { "workflows.$.isActive": true } }
        );

        if (prevAssignedUser.userType === "Committee") {
          const prevCommittee = await Committee.findById(prevUserId).populate(
            "members"
          );
          for (const member of prevCommittee.members) {
            await sendNotification(
              member._id,
              userId,
              `Workflow ${workflow.workflowName} was reverted back to your stage as part of the committee ${prevCommittee.name}.`,
              workflowId
            );
          }
          await sendNotification(
            prevCommittee.chairperson,
            userId,
            `Workflow ${workflow.workflowName} was reverted back to your stage as the chairperson of committee ${prevCommittee.name}.`,
            workflowId
          );
        } else {
          await sendNotification(
            prevUserId,
            userId,
            `Workflow ${workflow.workflowName} was reverted back to your stage.`,
            workflowId
          );
        }
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

    // Check if the user is a member of any committee
    const committee = await Committee.findOne({ members: userId });
    let assignedUser;

    if (committee) {
      assignedUser = workflow.assignedUsers.find(
        (user) =>
          user.committee.toString() === committee._id.toString() &&
          user.stageIndex === currentStageIndex
      );
    } else {
      assignedUser = workflow.assignedUsers.find(
        (user) =>
          user.user.toString() === userId &&
          user.stageIndex === currentStageIndex
      );
    }

    if (!assignedUser) {
      return res
        .status(403)
        .json({ message: "User not assigned to the current stage" });
    }

    // Add comment if provided
    if (comment) {
      const commentObj = {
        stageIndex: currentStageIndex,
        fromUser: userId,
        toUser: workflow.user,
        comment: comment,
        decision: "Approved",
        visibleTo: [userId?.toString(), workflow.user._id.toString()].filter(
          Boolean
        ),
      };

      // If the user is part of a committee, add the committee name to the comment
      if (committee) {
        commentObj.memberOf = committee._id;
        commentObj.visibleTo.push(
          ...committee.members.map((member) => member._id.toString())
        );
      }

      workflow.comments.push(commentObj);
    }

    if (assignedUser.userType === "Committee") {
      workflow.votes.push({
        stageIndex: currentStageIndex,
        committeeId: assignedUser.committee,
        memberId: userId,
        decision: "approve",
      });

      const voteCounts = aggregateVotes(workflow.votes, currentStageIndex);
      if (Object.keys(voteCounts).length === committee.members.length) {
        const majorityDecision = Object.keys(voteCounts).reduce((a, b) =>
          voteCounts[a] > voteCounts[b] ? a : b
        );
        await handleMajorityDecision(
          workflow,
          userId,
          majorityDecision,
          currentStageIndex,
          res
        );
        return;
      }
    } else {
      workflow.status = "Approved";
      await workflow.save();
      await sendNotification(
        workflow.user,
        userId,
        `Workflow ${workflow.workflowName} was approved.`,
        workflowId
      );
      return res.status(200).json({ workflow });
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

    // Check if the workflow status is already "Rejected"
    if (workflow.status === "Rejected") {
      return res
        .status(400)
        .json({ message: "Workflow status is already rejected" });
    }

    const currentStageIndex = workflow.currentStageIndex;

    // Check if the user is a member of any committee
    const committee = await Committee.findOne({ members: userId });
    let assignedUser;

    if (committee) {
      assignedUser = workflow.assignedUsers.find(
        (user) =>
          user.committee.toString() === committee._id.toString() &&
          user.stageIndex === currentStageIndex
      );
    } else {
      assignedUser = workflow.assignedUsers.find(
        (user) =>
          user.user.toString() === userId &&
          user.stageIndex === currentStageIndex
      );
    }

    if (!assignedUser) {
      return res
        .status(403)
        .json({ message: "User not assigned to the current stage" });
    }

    // Add comment if provided
    if (comment) {
      const commentObj = {
        stageIndex: currentStageIndex,
        fromUser: userId,
        toUser: workflow.user,
        comment: comment,
        decision: "Rejected",
        visibleTo: [userId?.toString(), workflow.user._id.toString()].filter(
          Boolean
        ),
      };

      // If the user is part of a committee, add the committee name to the comment
      if (committee) {
        commentObj.memberOf = committee._id;
        commentObj.visibleTo.push(
          ...committee.members.map((member) => member._id.toString())
        );
      }

      workflow.comments.push(commentObj);
    }

    if (assignedUser.userType === "Committee") {
      workflow.votes.push({
        stageIndex: currentStageIndex,
        committeeId: assignedUser.committee,
        memberId: userId,
        decision: "reject",
      });

      const voteCounts = aggregateVotes(workflow.votes, currentStageIndex);
      if (Object.keys(voteCounts).length === committee.members.length) {
        const majorityDecision = Object.keys(voteCounts).reduce((a, b) =>
          voteCounts[a] > voteCounts[b] ? a : b
        );
        await handleMajorityDecision(
          workflow,
          userId,
          majorityDecision,
          currentStageIndex,
          res
        );
        return;
      }
    } else {
      workflow.status = "Rejected";
      await workflow.save();
      await sendNotification(
        workflow.user,
        userId,
        `Workflow ${workflow.workflowName} was rejected.`,
        workflowId
      );
      return res.status(200).json({ workflow });
    }
  } catch (error) {
    console.error("Error rejecting workflow:", error);
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
        path: "comments.toCommittee",
        select: "name",
      })
      .populate({
        path: "comments.memberOf",
        select: "name",
      })
      .populate({
        path: "comments",
        select: "decision createdAt",
      })
      .populate({
        path: "comments.visibleTo",
        // select: "name",
      });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    // Check if the user is a member of any committee
    const committee = await Committee.findOne({ members: userId });
    var assignedUser = null;
    var isActiveUser = false;
    var tbrb = "";

    if (committee) {
      // If user is a committee member, check if the committee is assigned to the workflow
      assignedUser = workflow.assignedUsers.find(
        (user) =>
          user.committee &&
          user.committee.toString() === committee._id.toString()
      );
      isActiveUser =
        assignedUser && assignedUser.stageIndex === workflow.currentStageIndex;
      tbrb = "Committee";
    } else {
      // Check if user is assigned to the workflow and active in the current stage

      const assignedUser = workflow.assignedUsers.find(
        (user) => user.user && user.user.toString() === userId
      );
      const isActiveUser =
        assignedUser && assignedUser.stageIndex === workflow.currentStageIndex;
      tbrb = "Single Person";
      // }

      // Check user permissions and determine button visibility
      const isOwner = workflow.user.toString() === userId;
      const currentStageIndex = workflow.currentStageIndex;
      const canMoveForward =
        (isActiveUser &&
          currentStageIndex < workflow.assignedUsers.length - 1) ||
        true;
      const canMoveBackward = (isActiveUser && currentStageIndex > 0) || true;
      const canApprove =
        (isActiveUser &&
          currentStageIndex === workflow.assignedUsers.length - 1) ||
        true;
      const isActive = isActiveUser;
      const canEdit = isOwner && currentStageIndex == -1;

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
          name: workflow.name,
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
        toBeReviewedBy: tbrb,
        isActive: isActive,
        currentStageUser: currentStageUserOrCommitteeName,
        buttons: {
          canMoveForward,
          canMoveBackward,
          isOwner,
          canApprove,
          canEdit,
        },
      };

      // Return the workflow details to the client
      return res.status(200).json(responseData);
    }
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

// Route to archive a workflow
export const archiveWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await Workflow.findById(id);

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    // Check if the workflow status is "Pending"
    if (workflow.status === "Pending") {
      return res
        .status(400)
        .json({ message: "Cannot archive a pending workflow" });
    }
    workflow.isArchived = true;
    workflow.archivedAt = new Date();

    await workflow.save();

    return res
      .status(200)
      .json({ message: "Workflow archived successfully", workflow });
  } catch (err) {
    console.error("Error archiving workflow:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Route to unarchive a workflow
export const unarchiveWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await Workflow.findById(id);

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    workflow.isArchived = false;
    workflow.archivedAt = null;

    await workflow.save();

    return res
      .status(200)
      .json({ message: "Workflow unarchived successfully", workflow });
  } catch (err) {
    console.error("Error unarchiving workflow:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Route to delete archived workflows
export const deleteArchivedWorkflows = async (req, res) => {
  try {
    const archivedWorkflows = await Workflow.find({ isArchived: true });

    if (!archivedWorkflows.length) {
      return res.status(404).json({ message: "No archived workflows found" });
    }

    await Workflow.deleteMany({ isArchived: true });

    return res
      .status(200)
      .json({ message: "Archived workflows deleted successfully" });
  } catch (err) {
    console.error("Error deleting archived workflows:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get Archived Workflows Endpoint
export const getArchivedWorkflows = async (req, res) => {
  try {
    const archivedWorkflows = await Workflow.find({ isArchived: true });
    res.status(200).json({ archivedWorkflows });
  } catch (err) {
    console.error("Error fetching archived workflows:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete Expired Workflows Function
export const deleteExpiredWorkflows = async () => {
  try {
    const now = new Date();
    await Workflow.deleteMany({ isArchived: true, deleteAfter: { $lt: now } });
    console.log("Expired workflows deleted successfully");
  } catch (err) {
    console.error("Error deleting expired workflows:", err);
  }
};

export async function saveAsDraft(req, res) {
  const { workflowTemplateId, workflowName, userId, reqDoc, addDoc } = req.body;

  if (!reqDoc || reqDoc.length === 0) {
    return res.status(400).json({ message: "No data provided" });
  }

  try {
    const workflowTemplate = await WorkflowTemplate.findById(
      workflowTemplateId
    );
    if (!workflowTemplate) {
      return res.status(404).json({ message: "Workflow template not found" });
    }

    // Create a new workflow instance
    const newWorkflow = new Workflow({
      name: workflowName,
      workflowTemplate: workflowTemplateId,
      user: userId,
      status:Draft
    });

    // Generate PDF from document data
    const generatedDocuments = await handleData(reqDoc, addDoc);
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

    return res.status(201).json({ workflow: savedWorkflow });
  } catch (error) {
    console.error("Error saving workflow as draft:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Handler to get all draft workflows
export async function getDraftWorkflows(req, res) {
  const { userId } = req.params;
  try {
    const draftWorkflows = await Workflow.find({
      user: userId,
      isDraft: true,
    }).populate("user workflowTemplate");
    return res.status(200).json(draftWorkflows);
  } catch (error) {
    console.error("Error fetching draft workflows:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default {
  searchWorkflowsByName,
  createWorkflow,
  filterWorkflows,
  getAllWorkflows,
  getWorkflowById,
  getAllRequiredDocuments,
  archiveWorkflow,
  unarchiveWorkflow,
  deleteArchivedWorkflows,
  getArchivedWorkflows,
  deleteExpiredWorkflows,
  cancelWorkflow,
  saveAsDraft,
  getDraftWorkflows,
};
