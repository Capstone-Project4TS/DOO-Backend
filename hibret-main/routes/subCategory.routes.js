import { Router } from 'express';
const router = Router();
import {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoryByCatId,
} from '../controllers/subCategoryController.js'; 

// Route for creating a new sub-category
router.post('/subCategory', createSubCategory);

// Route for retrieving all sub-categories
router.get('/subCategory', getAllSubCategories);

// Route for retrieving a specific sub-category by ID
router.get('/subCategory/:id', getSubCategoryById);

// Route for retrieving a specific sub-category by ID
router.get('/subCategory/cat/:id', getSubCategoryByCatId);

// Route for updating a sub-category by ID
router.put('/subCategory/:id', updateSubCategory);

// Route for deleting a sub-category by ID
router.delete('/subCategory/:id', deleteSubCategory);

export default router;
