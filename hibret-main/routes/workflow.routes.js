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
  ownerEditAndMoveForward,
  getWorkflowDetails,
  getAllWorkflowsOfOwner,
  getAllRequiredDocuments,
  filterWorkflows,
  getWorkflowById,
  searchWorkflowsByName
} from "../controllers/workflowController.js";

// Route to create a new workflow instance
router.post("/workflows", createWorkflow);

// Upload Documents endpoint
router.post("/upload",upload.single("file"),uploadDoc);

// Route to fetch all workflow instances
router.get("/workflows", getAllWorkflows);

// Route to fetch  workflow instances by id
router.get("/workflows/get/:id", getWorkflowById);

//Get all required documents in the workflow
router.get("/reqDoc/workflows/:id", getAllRequiredDocuments);

// Route to get all the workflows of an owner
router.get("/workflows/owner/:userId", getAllWorkflowsOfOwner);

// Route to update an existing workflow
router.put("/workflows/:id", updateWorkflow);

// Route to update a workflow status
//router.post('/workflows/status/:id', approveWorkflow);

// Route to delete a workflow
router.delete("/workflows/:id", deleteWorkflow);

// Define the search by name endpoint
router.get('/workflows/search', searchWorkflowsByName);

// Define the filter endpoint
router.get('/workflows/filter', filterWorkflows);

// Route to switch stages, approve and reject
router.post("/workflows/forward", moveStageForward);
router.post("/workflows/backward", moveStageBackward);
router.post("/workflows/approve", approveWorkflow);
router.post("/workflows/reject", rejectWorkflow);

// Route for the owner to edit and move the workflow forward
router.post("/workflows/:id/owner/edit", ownerEditAndMoveForward);

router.get("/workflows/:workflowId/user/:userId", getWorkflowDetails);

export default router;
