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

// Create and get all document templates
router.route("/documentTemplate")
  .post(isLoggedIn, authorize(["DooAdmin"]), createDocumentTemplate)
  .get(isLoggedIn, getAllDocumentTemplates);

// Get a single document template by ID
router.route("/documentTemplate/get/:id")
  .get(isLoggedIn, getDocumentTemplateById);

router.route("/documentTemplate/getArchived/:id")
  .get(isLoggedIn, authorize(["DooAdmin"]), getArchivedDocumentTemplates);

// Get all documents with a subcategory ID
router.route("/documentTemplate/sub/:id")
  .get(isLoggedIn, getDocumentBySub);

// Get all conditions of each document template
router.route("/documentTemplate/conditions")
  .post(isLoggedIn, getConditionsByTemp);

// Update and delete document templates
router.route("/documentTemplate/:id")
  .put(isLoggedIn, authorize(["DooAdmin"]), updateDocumentTemplate)
  .delete(isLoggedIn, authorize(["DooAdmin"]), deleteDocumentTemplate);

router.route("/documentTemplate/deleteArchived/:id")
  .delete(isLoggedIn, authorize(["DooAdmin"]), deleteArchivedDocumentTemplate);

// Archive and unarchive document templates
router.route("/documentTemplate/archive/:id")
  .patch(isLoggedIn, authorize(["DooAdmin"]), archiveDocumentTemplate);

router.route("/documentTemplate/unarchive/:id")
  .patch(isLoggedIn, authorize(["DooAdmin"]), unarchiveDocumentTemplate);

// Define the search by title endpoint
router.route('/document-templates/search')
  .get(isLoggedIn, searchDocumentTemplatesByTitle);

// Define the filter endpoint
router.route('/document-templates/filter')
  .get(isLoggedIn, filterDocumentTemplates);


export default router;
