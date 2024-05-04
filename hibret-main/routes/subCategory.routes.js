import { Router } from 'express';
const router = Router();
import {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
} from '../controllers/subCategoryController.js'; 

// Route for creating a new sub-category
router.post('/', createSubCategory);

// Route for retrieving all sub-categories
router.get('/', getAllSubCategories);

// Route for retrieving a specific sub-category by ID
router.get('/:id', getSubCategoryById);

// Route for updating a sub-category by ID
router.put('/:id', updateSubCategory);

// Route for deleting a sub-category by ID
router.delete('/:id', deleteSubCategory);

export default router;
