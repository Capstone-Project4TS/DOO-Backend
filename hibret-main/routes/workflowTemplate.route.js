import { Router } from "express";
const router = Router();
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
router.post("/workflow-templates", createWorkflowTemplate);
router.get("/workflow-templates/getAll", getAllWorkflowTemplates);
router.get("/workflow-templates/get/:id", getWorkflowTemplateDetailById);
router.get("/workflow-templates/getArchived/:id", getArchivedWorkflowTemplates);
router.put('/workflow-templates/update/:id', updateWorkflowTemplate);
router.delete("/workflow-templates/delete/:id", deleteWorkflowTemplate);
router.delete("/workflow-templates/deleteArchived/:id", deleteArchivedWorkflowTemplate);
router.patch("/workflow-templates/archive/:id", archiveWorkflowTemplate);
router.patch("/workflow-templates/unarchive/:id", unarchiveWorkflowTemplate);

router.get(
  "/workflow-templates/requiredDoc/:id",
  getAllRequiredDocumentTemplates
);

// Define the search by name endpoint
router.get('/workflow-templates/search', searchWorkflowTemplatesByName);

// Define the filter endpoint
router.get('/workflow-templates/filter', filterWorkflowTemplates);

export default router;
