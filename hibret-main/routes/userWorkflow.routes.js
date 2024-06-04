import { Router } from "express";
const router = Router();

import {
  createUserWorkflow,
  getUserWorkflows,
  updateUserWorkflowStatus,
} from "../controllers/userWorkflowController.js";

// Create a new user workflow
router.post("/userWorkflow", createUserWorkflow);

// Get user's workflows by user ID
router.get("/userWorkflow/:userId", getUserWorkflows);

// Update user workflow status (isActive)
router.put("/userWorkflow/:userId/:workflowId", updateUserWorkflowStatus);

export default router;
