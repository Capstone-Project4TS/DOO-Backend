import Folder from "../models/folder.model.js";
import UserModel from "../models/users.model.js";
import {getFolderHierarchy} from '../services/folderService.js'

// Controller function to fetch repositories with folders and workflows
export const fetchRepositories = async (req, res) => {
  try {
    // Validate userId from the token
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Unauthorized access, no user ID found in token." });
    }

    // Retrieve user and role information
    const user = await UserModel.findById(req.user.userId).populate("role_id");

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const depId = user.role_id?.depId;
    if (!user.role_id || !depId) {
      return res.status(400).json({ error: "User does not have an assigned department." });
    }

    // Retrieve top-level department folder
    const departmentFolder = await Folder.findOne({ parentFolder: depId });

    if (!departmentFolder) {
      return res.status(404).json({ error: "No folders found for this department." });
    }

    // Fetch folder hierarchy
    const hierarchicalData = await getFolderHierarchy(departmentFolder._id);
    if (!hierarchicalData) {
      return res.status(404).json({ error: "No folder hierarchy found for this department." });
    }

    return res.status(200).json(hierarchicalData);
  } catch (error) {
    console.error("Error fetching repositories with folders and workflows:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};











