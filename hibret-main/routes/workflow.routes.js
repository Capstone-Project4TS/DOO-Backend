import upload from "../config/multerConfig.js";
import { Router } from "express";
const router = Router();
import { uploadDoc } from "../services/fileService.js";
import Auth, { isLoggedIn } from "../middleware/auth.js";

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
  saveAsDraft,
  getDraftWorkflows
} from "../controllers/workflowController.js";

// Routes for workflows
router
  .route("/workflows")
  .post(isLoggedIn, createWorkflow)
  .get(isLoggedIn, getAllWorkflows);

router.route("/workflows/draft-workflows").post(isLoggedIn, saveAsDraft);
router.route("/workflows/drafts/:id").get(isLoggedIn, getDraftWorkflows);
router
  .route("/workflows/:id")
  .put(isLoggedIn, updateWorkflow)
  .delete(isLoggedIn, deleteWorkflow);

router.route("/workflows/:id/cancel").put(isLoggedIn, cancelWorkflow);

router
  .route("/workflows/:id/deleteArchived")
  .delete(isLoggedIn, deleteArchivedWorkflows);

router.route("/workflows/:id/archive").patch(isLoggedIn, archiveWorkflow);

router.route("/workflows/:id/unarchive").patch(isLoggedIn, unarchiveWorkflow);

router.route("/workflows/get/:id").get(isLoggedIn, getWorkflowById);

router
  .route("/workflows/:id/getArchived")
  .get(isLoggedIn, getArchivedWorkflows);

router.route("/reqDoc/workflows/:id").get(isLoggedIn, getAllRequiredDocuments);

router
  .route("/workflows/owner/:userId")
  .get(isLoggedIn, getAllWorkflowsOfOwner);

router.route("/workflows/search").get(isLoggedIn, searchWorkflowsByName);

router.route("/workflows/filter").get(isLoggedIn, filterWorkflows);

router.route("/workflows/forward").post(isLoggedIn, moveStageForward);

router.route("/workflows/backward").post(isLoggedIn, moveStageBackward);

router.route("/workflows/approve").post(isLoggedIn, approveWorkflow);

router.route("/workflows/reject").post(isLoggedIn, rejectWorkflow);

router
  .route("/workflows/:workflowId/user/:userId")
  .get(isLoggedIn, getWorkflowDetails);

router.route("/upload").post(isLoggedIn, upload.single("file"), uploadDoc);

export default router;
