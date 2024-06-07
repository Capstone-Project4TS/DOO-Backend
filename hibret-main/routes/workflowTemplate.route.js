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
  searchWorkflowTemplatesByName
} from "../controllers/workflowTemplateController.js";

// Routes for workflow template management
router.post("/workflow-templates", createWorkflowTemplate);
router.get("/workflow-templates/getAll", getAllWorkflowTemplates);
router.get("/workflow-templates/get/:id", getWorkflowTemplateDetailById);
router.put('/workflow-templates/update/:id', updateWorkflowTemplate);
router.delete("/workflow-templates/delete/:id", deleteWorkflowTemplate);
router.get(
  "/workflow-templates/requiredDoc/:id",
  getAllRequiredDocumentTemplates
);

// Define the search by name endpoint
router.get('/workflow-templates/search', searchWorkflowTemplatesByName);

// Define the filter endpoint
router.get('/workflow-templates/filter', filterWorkflowTemplates);

export default router;
