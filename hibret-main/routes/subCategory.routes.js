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

// Routes for sub-categories
router.route("/subCategory")
  .post(isLoggedIn, authorize(["DooAdmin"]), createSubCategory)
  .get(isLoggedIn, getAllSubCategories);

router.route("/subCategory/:id")
  .get(isLoggedIn, getSubCategoryById)
  .put(isLoggedIn, authorize(["DooAdmin"]), updateSubCategory)
  .delete(isLoggedIn, authorize(["DooAdmin"]), deleteSubCategory);

router.route("/subCategory/cat/:id")
  .get(isLoggedIn, getSubCategoryByCatId);

export default router;
