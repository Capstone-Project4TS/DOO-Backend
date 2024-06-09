import { Router } from "express";
const router = Router();
import Auth, {
  isLoggedIn,
} from "../middleware/auth.js";

import {
  createUserWorkflow,
  getUserWorkflows,
  updateUserWorkflowStatus,
} from "../controllers/userWorkflowController.js";

// Create a new user workflow
router.post("/userWorkflow",isLoggedIn, createUserWorkflow);

// Get user's workflows by user ID
router.get("/userWorkflow/:userId",isLoggedIn, getUserWorkflows);

// Update user workflow status (isActive)
router.put("/userWorkflow/:userId/:workflowId",isLoggedIn, updateUserWorkflowStatus);

export default router;
