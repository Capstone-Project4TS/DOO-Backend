import Folder from "../models/folder.model.js";
import UserModel from "../models/users.model.js";
import Workflow from "../models/workflow.model.js";

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

const getFolderHierarchy = async (folderId) => {
  const folder = await Folder.findById(folderId).populate('workflows.workflowId');

  if (!folder) return null;

  const children = await Promise.all(
    folder.folders.map(async (subFolder) => await getFolderHierarchy(subFolder._id))
  );

  const getWorkflowDetails = async (workflow) => {
    const workflowDoc = await Workflow.findById(workflow.workflowId)
      .populate('requiredDocuments')
      .populate('additionalDocuments');
    console.log("Fetched Workflow:", workflowDoc);

    if (!workflowDoc) return null;

    const documentNames = [
      ...workflowDoc.requiredDocuments.map(doc => doc.title),
      ...workflowDoc.additionalDocuments.map(doc => doc.title)
    ];

    return {
      workflowName: workflowDoc.name,
      documentNames,
    };
  };

  let workflowDetails = [];
  if (folder.workflows && folder.workflows.length > 0) {
    workflowDetails = await Promise.all(
      folder.workflows.map(async (workflow) => await getWorkflowDetails(workflow))
    );
  }

  return {
    name: folder.name,
    workflows: workflowDetails.filter(workflow => workflow !== null),
    children: children.filter(child => child !== null),
  };
};


// Controller function to fetch repositories with folders and workflows
export const fetchRepositories = async (req, res) => {
  try {
    // Validate userId from the token
    if (!req.user || !req.user.userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized access, no user ID found in token." });
    }

    // Retrieve user and role information
    const user = await UserModel.findById(req.user.userId).populate({
      path: "role_id",
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const depId = user.role_id.depId;
    if (!user.role_id || !depId) {
      return res
        .status(400)
        .json({ error: "User does not have an assigned department." });
    }

    // Retrieve top-level department folder
    const departmentFolder = await Folder.findOne({ parentFolder: depId });

    if (!departmentFolder) {
      return res
        .status(404)
        .json({ error: "No folders found for this department." });
    }

    const hierarchicalData = await getFolderHierarchy(departmentFolder._id);
    console.log(hierarchicalData);
    return res.status(200).json(hierarchicalData);
  } catch (error) {
    console.error(
      "Error fetching repositories with folders and workflows:",
      error
    );
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Controller function to update a folder's details by its ID
export const updateFolderDetailsById = async (req, res) => {
  try {
    const updatedFolder = await Folder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedFolder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error("Error updating folder details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to update a folder's parent folder by its ID
export const updateFolderParentById = async (req, res) => {
  try {
    const { parentId } = req.body;
    const updatedFolder = await Folder.findByIdAndUpdate(
      req.params.id,
      { parentFolder: parentId },
      { new: true }
    );
    if (!updatedFolder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error("Error updating folder parent:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to add a document to a folder by its ID
export const addDocumentToFolderById = async (req, res) => {
  try {
    const { documentId } = req.body;
    const updatedFolder = await Folder.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: documentId } },
      { new: true }
    );
    if (!updatedFolder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error("Error adding document to folder:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to remove a document from a folder by its ID
export const removeDocumentFromFolderById = async (req, res) => {
  try {
    const { documentId } = req.body;
    const updatedFolder = await Folder.findByIdAndUpdate(
      req.params.id,
      { $pull: { documents: documentId } },
      { new: true }
    );
    if (!updatedFolder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error("Error removing document from folder:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to delete a folder by its ID
export const deleteFolderById = async (req, res) => {
  try {
    const deletedFolder = await Folder.findByIdAndDelete(req.params.id);
    if (!deletedFolder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.status(200).json({ message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to retrieve documents within a folder by its ID
export const getDocumentsInFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId).populate(
      "documents"
    );
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.status(200).json(folder.documents);
  } catch (error) {
    console.error("Error retrieving documents in folder:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getImmediate = async (req, res) => {
  try {
    const { folderId } = req.params;

    // Find the folder by ID
    const folder = await Folder.findById(folderId);

    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Extract immediate subfolders and documents
    const { subfolders, documents } = folder;

    // Respond with the immediate subfolders and documents
    return res.status(200).json({ subfolders, documents });
  } catch (error) {
    console.error(
      "Error retrieving immediate subfolders and documents:",
      error
    );
    return res.status(500).json({ error: "Internal server error" });
  }
};
