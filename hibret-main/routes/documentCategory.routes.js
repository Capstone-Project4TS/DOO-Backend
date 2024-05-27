import { Router } from "express";

const router = Router();
import {
  createDocumentCategory,
  getAllDocumentCategory,
  getDocumentCategoryById,
  updateDocumentCategory,
  deleteDocumentCategory,
  getCategoriesByRepositoryId,
  
} from "../controllers/documentCategoryController.js";

// // Route for creating a new document type
router.post("/category", createDocumentCategory);

// // Route for retrieving all document types
router.get("/category", getAllDocumentCategory);



// // Route for retrieving a specific document type by ID
router.get("/category/:id", getDocumentCategoryById);

// // Route for retrieving a specific document type by ID
router.get("/repo/category/:repositoryId", getCategoriesByRepositoryId);

// // Route for updating a document type by ID
router.put("/category/:id", updateDocumentCategory);

// // Route for deleting a document type by ID
router.delete("/category/:id", deleteDocumentCategory);

export default router;
