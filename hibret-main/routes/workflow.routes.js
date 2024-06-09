import upload from "../config/multerConfig.js";
import { Router } from "express";
const router = Router();
import {uploadDoc} from "../services/fileService.js";
import Auth, {
 
  isLoggedIn,
} from "../middleware/auth.js";

import {
  createWorkflow,
  getAllWorkflows,
  deleteWorkflow,
  updateWorkflow,
  moveStageForward,
  moveStageBackward,
  approveWorkflow,
  rejectWorkflow,
  getWorkflowDetails,
  getAllWorkflowsOfOwner,
  getAllRequiredDocuments,
  filterWorkflows,
  getWorkflowById,
  searchWorkflowsByName,
  archiveWorkflow,
  unarchiveWorkflow,
  deleteArchivedWorkflows,
  getArchivedWorkflows,
  cancelWorkflow,
  saveAsDraft
} from "../controllers/workflowController.js";

// Route to create a new workflow instance
router.post("/workflows",isLoggedIn, createWorkflow);
router.post('/workflows/draft-workflows',isLoggedIn, saveAsDraft);

// Upload Documents endpoint
router.post("/upload",isLoggedIn,upload.single("file"),uploadDoc);

// Route to fetch all workflow instances
router.get("/workflows",isLoggedIn, getAllWorkflows);

// Route to fetch  workflow instances by id
router.get("/workflows/get/:id",isLoggedIn, getWorkflowById);
router.get("/workflows/:id/getArchived",isLoggedIn, getArchivedWorkflows);
//Get all required documents in the workflow
router.get("/reqDoc/workflows/:id", isLoggedIn,getAllRequiredDocuments);


// Route to get all the workflows of an owner
router.get("/workflows/owner/:userId",isLoggedIn, getAllWorkflowsOfOwner);

// Route to update an existing workflow
router.put("/workflows/:id",isLoggedIn, updateWorkflow);
router.put('/workflows/:id/cancel',isLoggedIn, cancelWorkflow);

// Route to update a workflow status
//router.post('/workflows/status/:id', approveWorkflow);

// Route to delete a workflow
router.delete("/workflows/:id", isLoggedIn,deleteWorkflow);
router.delete("/workflows/:id/deleteArchived",isLoggedIn, deleteArchivedWorkflows);
router.patch("/workflows/:id/archive",isLoggedIn, archiveWorkflow);
router.patch("/workflows/:id/unarchive",isLoggedIn, unarchiveWorkflow);

// Define the search by name endpoint
router.get('/workflows/search',isLoggedIn, searchWorkflowsByName);

// Define the filter endpoint
router.get('/workflows/filter',isLoggedIn, filterWorkflows);

// Route to switch stages, approve and reject
router.post("/workflows/forward",isLoggedIn, moveStageForward);
router.post("/workflows/backward",isLoggedIn, moveStageBackward);
router.post("/workflows/approve",isLoggedIn, approveWorkflow);
router.post("/workflows/reject",isLoggedIn, rejectWorkflow);

router.get("/workflows/:workflowId/user/:userId",isLoggedIn, getWorkflowDetails);

export default router;
