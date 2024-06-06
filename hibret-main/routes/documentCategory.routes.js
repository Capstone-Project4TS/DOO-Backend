import { Router } from "express";

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
router.post("/category", createDocumentCategory);

// // Route for retrieving all document types
router.get("/category", getAllDocumentCategory);

// Define the filter endpoint
router.get('/document-categories/filter', filterDocumentCategories);

// Define the search by name endpoint
router.get('/document-categories/search', searchDocumentCategoriesByName);

// // Route for retrieving a specific document type by ID
router.get("/category/:id", getDocumentCategoryById);

// // Route for retrieving a specific document type by ID
router.get("/repo/category/:depId", getCategoriesByRepositoryId);

// // Route for updating a document type by ID
router.put("/category/:id", updateDocumentCategory);

// // Route for deleting a document type by ID
router.delete("/category/:id", deleteDocumentCategory);

router.get("/category/dep/:dep_id", getCatForDep)

export default router;
