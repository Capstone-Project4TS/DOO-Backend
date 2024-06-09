import Folder from "../models/folder.model.js";
import UserModel from "../models/users.model.js";
import Workflow from "../models/workflow.model.js";
import UserWorkflow from "../models/userWorkflow.model.js";
// Helper function to create folders and subfolders recursively
export const createFolderHierarchy = async (parentFolderId, year) => {
  const yearFolder = new Folder({
    name: `workflows of ${year}`,
    parentFolder: parentFolderId,
  });
  const savedYearFolder = await yearFolder.save();

  // Update parent folder's children
  const parentFolder = await Folder.findById(parentFolderId);
  parentFolder.folders.push(savedYearFolder._id);
  await parentFolder.save();

  const quarters = ["Quarter1", "Quarter2", "Quarter3", "Quarter4"];
  for (const q of quarters) {
    const quarterFolder = new Folder({
      name: q,
      parentFolder: savedYearFolder._id,
    });
    const savedQuarterFolder = await quarterFolder.save();

    // Update year folder's children
    savedYearFolder.folders.push(savedQuarterFolder._id);
    await savedYearFolder.save();

    for (let m = 1; m <= 3; m++) {
      const monthName = new Date(
        year,
        quarters.indexOf(q) * 3 + m - 1
      ).toLocaleString("default", { month: "long" });
      const monthFolder = new Folder({
        name: monthName,
        parentFolder: savedQuarterFolder._id,
      });
      const savedMonthFolder = await monthFolder.save();

      // Update quarter folder's children
      savedQuarterFolder.folders.push(savedMonthFolder._id);
      await savedQuarterFolder.save();
    }
  }

  return savedYearFolder._id; // Return the ID of the year folder
};

export const getFolderHierarchy = async (folderId) => {
  const folder = await Folder.findById(folderId).populate(
    "workflows.workflowId"
  );

  if (!folder) return null;

  const children = await Promise.all(
    folder.folders.map(
      async (subFolder) => await getFolderHierarchy(subFolder._id)
    )
  );

  const getWorkflowDetails = async (workflow) => {
    const workflowDoc = await Workflow.findById(workflow.workflowId)
      .populate("requiredDocuments")
      .populate("additionalDocuments")
      .populate("user", "name"); // Populate user with name

    console.log("Fetched Workflow:", workflowDoc);

    if (!workflowDoc) return null;

    // Retrieve the required document IDs and names
    const requiredDocuments = workflowDoc.requiredDocuments.map((doc) => ({
      _id: doc._id,
      title: doc.title,
    }));

    // Retrieve the additional document IDs and names
    const additionalDocuments = workflowDoc.additionalDocuments.map((doc) => ({
      _id: doc._id,
      title: doc.title,
    }));

    // Retrieve user IDs associated with the workflow
    const userWorkflows = await UserWorkflow.find({
      "workflows.workflowId": workflow.workflowId,
    });
    const userIds = userWorkflows.map((userWorkflow) => userWorkflow.userId);

    return {
      workflowId: workflowDoc._id,
      workflowName: workflowDoc.name,
      userId: workflowDoc.user._id, // Include user ID
      requiredDocuments,
      additionalDocuments,
      userIds,
    };
  };

  let workflowDetails = [];
  if (folder.workflows && folder.workflows.length > 0) {
    workflowDetails = await Promise.all(
      folder.workflows.map(
        async (workflow) => await getWorkflowDetails(workflow)
      )
    );
  }

  return {
    name: folder.name,
    workflows: workflowDetails.filter((workflow) => workflow !== null),
    children: children.filter((child) => child !== null),
  };
};

// Helper function to delete a folder and its children recursively
export const deleteFolderHierarchy = async (folderId) => {
  const folder = await Folder.findById(folderId);

  if (!folder) return;

  // Delete child folders recursively
  for (const childFolderId of folder.folders) {
    await deleteFolderHierarchy(childFolderId);
  }

  // Delete the folder itself
  await Folder.findByIdAndDelete(folderId);
};

export const findWorkflowsInFolderHierarchy = async (folderId) => {
  const folder = await Folder.findById(folderId).populate("folders");
  if (!folder) return false;

  // Check for workflows in the current folder
  if (folder.workflows && folder.workflows.length > 0) {
    return true;
  }

  // Recursively check for workflows in subfolders
  for (const subFolder of folder.folders) {
    const workflowsFound = await findWorkflowsInFolderHierarchy(subFolder._id);
    if (workflowsFound) {
      return true;
    }
  }

  return false;
};

export default {
  createFolderHierarchy,
  deleteFolderHierarchy,
  findWorkflowsInFolderHierarchy,
  getFolderHierarchy,
};
