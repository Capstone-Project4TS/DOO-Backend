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

// // Route for creating a new document type
router.post("/category", isLoggedIn, authorize(["DooAdmin"]),createDocumentCategory);

// // Route for retrieving all document types
router.get("/category",isLoggedIn, getAllDocumentCategory);

// Define the filter endpoint
router.get('/document-categories/filter',isLoggedIn, filterDocumentCategories);

// Define the search by name endpoint
router.get('/document-categories/search',isLoggedIn, searchDocumentCategoriesByName);

// // Route for retrieving a specific document type by ID
router.get("/category/:id",isLoggedIn, getDocumentCategoryById);

// // Route for retrieving a specific document type by ID
router.get("/repo/category/:depId", isLoggedIn, getCategoriesByRepositoryId);

// // Route for updating a document type by ID
router.put("/category/:id",isLoggedIn,authorize(["DooAdmin"]), updateDocumentCategory);

// // Route for deleting a document type by ID
router.delete("/category/:id", isLoggedIn,authorize(["DooAdmin"]), deleteDocumentCategory);

router.get("/category/dep/:dep_id",isLoggedIn, getCatForDep)

export default router;
