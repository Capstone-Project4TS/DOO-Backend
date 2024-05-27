import { Router } from "express";
import Auth from "../middleware/auth.js";

const router = Router();
import {
  createFolder,
  getAllFolders,
  getFolderById,
  updateFolderDetailsById,
  updateFolderParentById,
  addDocumentToFolderById,
  removeDocumentFromFolderById,
  deleteFolderById,
  getDocumentsInFolder,
  getImmediate,
  fetchRepositories
} from "../controllers/folderController.js";

// Route for creating a new folder
router.post("/", createFolder);

// Route for retrieving all folders
router.get("/", getAllFolders);

router.get("/fetchrepos", Auth, fetchRepositories);

// Route for retrieving a specific folder by ID
router.get("/:id", getFolderById);

// Route for updating a folder's name by ID
router.put("/:id", updateFolderDetailsById);

// Route for updating a folder's parent folder by ID
router.put("/:id/parent", updateFolderParentById);

// Route for adding a document to a folder by ID
router.put("/:id/documents/add", addDocumentToFolderById);

// Route for removing a document from a folder by ID
router.put("/:id/documents/remove", removeDocumentFromFolderById);

// Route for deleting a folder by ID
router.delete("/:id", deleteFolderById);

// Route for retrieving documents within a folder
router.get("/:folderId/documents", getDocumentsInFolder);

// Route for retrieving immediate subfolders and documents of a folder by ID
router.get("/immediate/:folderId", getImmediate);

export default router;
