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

// Routes for user workflows
router.route("/userWorkflow")
  .post(isLoggedIn, createUserWorkflow);

router.route("/userWorkflow/:userId")
  .get(isLoggedIn, getUserWorkflows);

router.route("/userWorkflow/:userId/:workflowId")
  .put(isLoggedIn, updateUserWorkflowStatus);


export default router;
