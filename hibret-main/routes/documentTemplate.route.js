import { Router } from "express";
const router = Router();

import {
  createDocumentTemplate,
  getAllDocumentTemplates,
  getDocumentTemplateById,
  getDocumentBySub,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  getConditionsByTemp,
} from "../controllers/documentTemplateController.js";

// Create a new document template (POST)
router.post("/documentTemplate", createDocumentTemplate);

// Get all document templates (GET)
router.get("/documentTemplate", getAllDocumentTemplates);

// Get a single document template by ID (GET)
router.get("/documentTemplate/:id", getDocumentTemplateById);

// Get all documents with a subcategory ID (GET)
router.get("/documentTemplate/sub/:id", getDocumentBySub);

// Get all conditions of each docTemp (GET)
router.post("/documentTemplate/conditions", getConditionsByTemp);

// Update a document template (PUT)
router.put("/documentTemplate/:id", updateDocumentTemplate);

// Delete a document template (DELETE)
router.delete("/documentTemplate/:id", deleteDocumentTemplate);

// Route for retrieving documents based on a document template
// router.get('/:templateId/documents', getDocumentsByTemplateId);

export default router;
