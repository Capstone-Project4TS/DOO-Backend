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
router.route("/workflow-templates")
  .post(isLoggedIn, authorize(["DooAdmin"]), createWorkflowTemplate)
  .get(isLoggedIn, authorize(["DooAdmin"]), getAllWorkflowTemplates);

router.route("/workflow-templates/getAll")
  .get(isLoggedIn,  getAllWorkflowTemplates);

router.route("/workflow-templates/get/:id")
  .get(isLoggedIn, authorize(["DooAdmin"]), getWorkflowTemplateDetailById);

router.route("/workflow-templates/getArchived/:id")
  .get(isLoggedIn, authorize(["DooAdmin"]), getArchivedWorkflowTemplates);

router.route("/workflow-templates/update/:id")
  .put(isLoggedIn, authorize(["DooAdmin"]), updateWorkflowTemplate);

router.route("/workflow-templates/delete/:id")
  .delete(isLoggedIn, authorize(["DooAdmin"]), deleteWorkflowTemplate);

router.route("/workflow-templates/deleteArchived/:id")
  .delete(isLoggedIn, authorize(["DooAdmin"]), deleteArchivedWorkflowTemplate);

router.route("/workflow-templates/archive/:id")
  .patch(isLoggedIn, authorize(["DooAdmin"]), archiveWorkflowTemplate);

router.route("/workflow-templates/unarchive/:id")
  .patch(isLoggedIn, authorize(["DooAdmin"]), unarchiveWorkflowTemplate);

router.route("/workflow-templates/requiredDoc/:id")
  .get(isLoggedIn, getAllRequiredDocumentTemplates);

router.route("/workflow-templates/search")
  .get(isLoggedIn, searchWorkflowTemplatesByName);

router.route("/workflow-templates/filter")
  .get(isLoggedIn, filterWorkflowTemplates);

export default router;
