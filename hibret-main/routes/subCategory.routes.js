import { Router } from "express";
const router = Router();
import Auth, {
  localVariables,
  adminMiddleware,
  authorize,
  isLoggedIn,
} from "../middleware/auth.js";

import {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoryByCatId,
} from "../controllers/subCategoryController.js";

// Route for creating a new sub-category
router.post("/subCategory",isLoggedIn,authorize(["DooAdmin"]), createSubCategory);

// Route for retrieving all sub-categories
router.get("/subCategory", isLoggedIn, getAllSubCategories);

// Route for retrieving a specific sub-category by ID
router.get("/subCategory/:id",isLoggedIn, getSubCategoryById);

// Route for retrieving a specific sub-category by ID
router.get("/subCategory/cat/:id",isLoggedIn, getSubCategoryByCatId);

// Route for updating a sub-category by ID
router.put("/subCategory/:id",isLoggedIn, authorize(["DooAdmin"]),updateSubCategory);

// Route for deleting a sub-category by ID
router.delete("/subCategory/:id",isLoggedIn, authorize(["DooAdmin"]),deleteSubCategory);

export default router;
