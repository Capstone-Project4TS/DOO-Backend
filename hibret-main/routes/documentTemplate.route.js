import { Router } from "express";
const router = Router();
import Auth, {
  localVariables,
  adminMiddleware,
  authorize,
  isLoggedIn,
} from "../middleware/auth.js";

import {
  createDocumentTemplate,
  getAllDocumentTemplates,
  getDocumentTemplateById,
  getDocumentBySub,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  getConditionsByTemp,
  filterDocumentTemplates,
  searchDocumentTemplatesByTitle,
  archiveDocumentTemplate,
  unarchiveDocumentTemplate,
  deleteArchivedDocumentTemplate,
  getArchivedDocumentTemplates
} from "../controllers/documentTemplateController.js";

// Create a new document template (POST)
router.post("/documentTemplate", isLoggedIn,authorize(["DooAdmin"]), createDocumentTemplate);

// Get all document templates (GET)
router.get("/documentTemplate", isLoggedIn, getAllDocumentTemplates);

// Get a single document template by ID (GET)
router.get("/documentTemplate/get/:id",isLoggedIn, getDocumentTemplateById);

router.get("/documentTemplate/getArchived/:id",isLoggedIn,authorize(["DooAdmin"]), getArchivedDocumentTemplates);


// Get all documents with a subcategory ID (GET)
router.get("/documentTemplate/sub/:id",isLoggedIn, getDocumentBySub);

// Get all conditions of each docTemp (GET)
router.post("/documentTemplate/conditions",isLoggedIn, getConditionsByTemp);

// Update a document template (PUT)
router.put("/documentTemplate/:id", isLoggedIn,authorize(["DooAdmin"]),updateDocumentTemplate);

// Delete a document template (DELETE)
router.delete("/documentTemplate/:id", isLoggedIn, authorize(["DooAdmin"]), deleteDocumentTemplate);
router.delete("/documentTemplate/deleteArchived/:id",isLoggedIn, authorize(["DooAdmin"]), deleteArchivedDocumentTemplate);

router.patch("/documentTemplate/archive:id", isLoggedIn,authorize(["DooAdmin"]), archiveDocumentTemplate);
router.patch("/documentTemplate/unarchive:id",isLoggedIn, authorize(["DooAdmin"]), unarchiveDocumentTemplate);

// Define the search by title endpoint
router.get('/document-templates/search', isLoggedIn, searchDocumentTemplatesByTitle);

// Define the filter endpoint
router.get('/document-templates/filter',isLoggedIn, filterDocumentTemplates);


export default router;
