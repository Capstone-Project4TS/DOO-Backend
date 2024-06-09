import upload from "../config/multerConfig.js";
import { Router } from "express";
const router = Router();
import {uploadDoc} from "../services/fileService.js";
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
router.post("/workflows", createWorkflow);
router.post('/workflows/draft-workflows', saveAsDraft);

// Upload Documents endpoint
router.post("/upload",upload.single("file"),uploadDoc);

// Route to fetch all workflow instances
router.get("/workflows", getAllWorkflows);

// Route to fetch  workflow instances by id
router.get("/workflows/get/:id", getWorkflowById);
router.get("/workflows/:id/getArchived", getArchivedWorkflows);
//Get all required documents in the workflow
router.get("/reqDoc/workflows/:id", getAllRequiredDocuments);

// Route to get all the workflows of an owner
router.get("/workflows/owner/:userId", getAllWorkflowsOfOwner);

// Route to update an existing workflow
router.put("/workflows/:id", updateWorkflow);
router.put('/workflows/:id/cancel', cancelWorkflow);

// Route to update a workflow status
//router.post('/workflows/status/:id', approveWorkflow);

// Route to delete a workflow
router.delete("/workflows/:id", deleteWorkflow);
router.delete("/workflows/:id/deleteArchived", deleteArchivedWorkflows);
router.patch("/workflows/:id/archive", archiveWorkflow);
router.patch("/workflows/:id/unarchive", unarchiveWorkflow);

// Define the search by name endpoint
router.get('/workflows/search', searchWorkflowsByName);

// Define the filter endpoint
router.get('/workflows/filter', filterWorkflows);

// Route to switch stages, approve and reject
router.post("/workflows/forward", moveStageForward);
router.post("/workflows/backward", moveStageBackward);
router.post("/workflows/approve", approveWorkflow);
router.post("/workflows/reject", rejectWorkflow);

router.get("/workflows/:workflowId/user/:userId", getWorkflowDetails);

export default router;
