import { Router } from "express";
import Auth, {
  
  authorize,
  isLoggedIn,
} from "../middleware/auth.js";

const router = Router();
import {
  createDocumentCategory,
  getAllDocumentCategory,
  getDocumentCategoryById,
  updateDocumentCategory,
  deleteDocumentCategory,
  getCategoriesByRepositoryId,
  getCatForDep,
  searchDocumentCategoriesByName,
  filterDocumentCategories,
  
} from "../controllers/documentCategoryController.js";

// Route for creating a new document type
router.route("/category")
  .post(isLoggedIn, authorize(["DooAdmin"]), createDocumentCategory)
  .get(isLoggedIn, getAllDocumentCategory);

// Define the filter endpoint
router.route('/document-categories/filter')
  .get(isLoggedIn, filterDocumentCategories);

// Define the search by name endpoint
router.route('/document-categories/search')
  .get(isLoggedIn, searchDocumentCategoriesByName);

// Route for retrieving a specific document type by ID
router.route("/category/:id")
  .get(isLoggedIn,authorize(["DooAdmin"]), getDocumentCategoryById)
  .put(isLoggedIn, authorize(["DooAdmin"]), updateDocumentCategory)
  .delete(isLoggedIn, authorize(["DooAdmin"]), deleteDocumentCategory);

// Route for retrieving categories by repository ID
router.route("/repo/category/:depId")
  .get(isLoggedIn, getCategoriesByRepositoryId);

// Route for getting categories for a department
router.route("/category/dep/:dep_id")
  .get(isLoggedIn, getCatForDep);

export default router;
