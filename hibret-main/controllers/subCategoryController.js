import SubCategory from "../models/documentSubCategory.model.js"; 


// Controller function to create a new sub-category
export const createSubCategory = async (req, res) => {
    try {
      const { name, description, categoryId } = req.body;
  
      // Input validation (optional)
      if (!name || !categoryId) {
        return res.status(400).json({ error: 'Missing required fields: name and categoryId' });
      }
  
      const newSubCategory = new SubCategory({ name, description, categoryId });
      const savedSubCategory = await newSubCategory.save();
      res.status(201).json(savedSubCategory);
    } catch (error) {
      console.error('Error creating sub-category:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  // Controller function to retrieve all sub-categories
export const getAllSubCategories = async (req, res) => {
    try {
      const subCategories = await SubCategory.find().populate('categoryId'); 
      res.status(200).json(subCategories);
    } catch (error) {
      console.error('Error retrieving sub-categories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
};
  
  // Controller function to retrieve a sub-category by ID
  export const getSubCategoryById = async (req, res) => {
    try {
      const subCategory = await SubCategory.findById(req.params.id).populate('categoryId'); 
      if (!subCategory) {
        return res.status(404).json({ error: 'Sub-category not found' });
      }
      res.status(200).json(subCategory);
    } catch (error) {
      console.error('Error retrieving sub-category by ID:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  // Controller function to update a sub-category by ID
  export const updateSubCategory = async (req, res) => {
    try {
      const { name, description } = req.body;
  
      const updatedSubCategory = await SubCategory.findByIdAndUpdate(
        req.params.id,
        { name, description },
        { new: true }
      );
      if (!updatedSubCategory) {
        return res.status(404).json({ error: 'Sub-category not found' });
      }
      res.status(200).json(updatedSubCategory);
    } catch (error) {
      console.error('Error updating sub-category:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  // Controller function to delete a sub-category by ID
  export const deleteSubCategory = async (req, res) => {
    try {
      const deletedSubCategory = await SubCategory.findByIdAndDelete(req.params.id);
      if (!deletedSubCategory) {
        return res.status(404).json({ error: 'Sub-category not found' });
      }
      res.status(200).json({ message: 'Sub-category deleted successfully' });
    } catch (error) {
      console.error('Error deleting sub-category:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  export default {
    createSubCategory,
    getAllSubCategories,
    getSubCategoryById,
    updateSubCategory,
    deleteSubCategory,
  };
  