import { Router } from "express";
const router = Router();
import Auth, {
  authorize,
  isLoggedIn,
} from "../middleware/auth.js";

import {
  createWorkflowTemplate,
  getAllWorkflowTemplates,
  getWorkflowTemplateDetailById,
  updateWorkflowTemplate,
  deleteWorkflowTemplate,
  getAllRequiredDocumentTemplates,
  filterWorkflowTemplates,
  searchWorkflowTemplatesByName,
  archiveWorkflowTemplate,
  unarchiveWorkflowTemplate,
  getArchivedWorkflowTemplates,
  deleteArchivedWorkflowTemplate
} from "../controllers/workflowTemplateController.js";

// Routes for workflow template management
router.post("/workflow-templates",isLoggedIn,authorize(["DooAdmin"]), createWorkflowTemplate);
router.get("/workflow-templates/getAll",isLoggedIn,authorize(["DooAdmin"]), getAllWorkflowTemplates);
router.get("/workflow-templates/get/:id",isLoggedIn,isLoggedIn, getWorkflowTemplateDetailById);
router.get("/workflow-templates/getArchived/:id",isLoggedIn,authorize(["DooAdmin"]), getArchivedWorkflowTemplates);
router.put('/workflow-templates/update/:id',isLoggedIn,authorize(["DooAdmin"]), updateWorkflowTemplate);
router.delete("/workflow-templates/delete/:id",isLoggedIn,authorize(["DooAdmin"]), deleteWorkflowTemplate);
router.delete("/workflow-templates/deleteArchived/:id", isLoggedIn,authorize(["DooAdmin"]), deleteArchivedWorkflowTemplate);
router.patch("/workflow-templates/archive/:id",isLoggedIn,authorize(["DooAdmin"]), archiveWorkflowTemplate);
router.patch("/workflow-templates/unarchive/:id",isLoggedIn,authorize(["DooAdmin"]), unarchiveWorkflowTemplate);

router.get(
  "/workflow-templates/requiredDoc/:id",isLoggedIn,authorize(["DooAdmin"]),
  getAllRequiredDocumentTemplates
);

// Define the search by name endpoint
router.get('/workflow-templates/search',isLoggedIn, searchWorkflowTemplatesByName);

// Define the filter endpoint
router.get('/workflow-templates/filter',isLoggedIn, filterWorkflowTemplates);

export default router;
