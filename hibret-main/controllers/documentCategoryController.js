import DocumentCategory from '../models/documentCategory.model.js';
import SubCategory from '../models/documentSubCategory.model.js';
import Repository from '../models/repository.model.js';
import Folder from '../models/folder.model.js';


// Helper function to create folders and subfolders recursively
const createFolderHierarchy = async (parentFolderId, year) => {
    const yearFolder = new Folder({
      name: `workflows of ${year}`,
      parentFolder: parentFolderId
    });
    const savedYearFolder = await yearFolder.save();
  
    const quarters = ['Quarter1', 'Qquarter2', 'Qquarter3', 'Qquarter4'];
    for (const q of quarters) {
      const quarterFolder = new Folder({
        name: `${q}`,
        parentFolder: savedYearFolder._id
      });
      const savedQuarterFolder = await quarterFolder.save();
  
      for (let m = 1; m <= 3; m++) {
        const monthName = new Date(year, (quarters.indexOf(q) * 3) + m - 1).toLocaleString('default', { month: 'long' });
        const monthFolder = new Folder({
          name: `${monthName}`,
          parentFolder: savedQuarterFolder._id
        });
        await monthFolder.save();
      }
    }
  
    return savedYearFolder._id; // Return the ID of the year folder
  };
  
  export const createDocumentCategory = async (req, res) => {
    try {
      const { name, subcategories, repositoryId } = req.body;
  
      // Create new document category
      const newDocumentCategory = new DocumentCategory({ name, repositoryId });
      const savedDocumentCategory = await newDocumentCategory.save();
  
      // Create subcategories and their folder hierarchies
      const savedSubCategories = [];
      const currentYear = new Date().getFullYear();
  
      for (const subcategoryName of subcategories) {
        const newSubCategory = new SubCategory({ name: subcategoryName, categoryId: savedDocumentCategory._id });
        const savedSubCategory = await newSubCategory.save();
  
        // Create folder hierarchy for the current year
        const yearFolderId = await createFolderHierarchy(savedSubCategory._id, currentYear);
        savedSubCategory.folders.push(yearFolderId); // Update folders field with the ID of the year folder
        await savedSubCategory.save();
        savedSubCategories.push(savedSubCategory);
      }
  
      // Update the document category with the subcategory IDs
      savedDocumentCategory.subcategories = savedSubCategories.map(sub => sub._id);
      await savedDocumentCategory.save();
  
      // Find the repository and update it with the new category
      const repository = await Repository.findById(repositoryId);
      if (!repository) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      repository.categories.push(savedDocumentCategory._id);
      await repository.save();
  
      res.status(201).json({ category: savedDocumentCategory, subcategories: savedSubCategories });
    } catch (error) {
      console.error('Error creating document category with subcategories and folder hierarchies:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };


// Controller function to retrieve all document categories with subcategories
export const getAllDocumentCategory = async (req, res) => {
    try {
        const documentCategories = await DocumentCategory.find().populate('subcategories');
        res.status(200).json(documentCategories);
    } catch (error) {
        console.error('Error retrieving document categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  };
  


// Controller function to retrieve a document category by ID with subcategories
export const getDocumentCategoryById = async (req, res) => {
    try {
        const documentCategory = await DocumentCategory.findById(req.params.id).populate('subcategories');
        if (!documentCategory) {
            return res.status(404).json({ error: 'Document category not found' });
        }
        res.status(200).json(documentCategory);
    } catch (error) {
        console.error('Error retrieving document category by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Controller function to get categories by repository ID
export const getCategoriesByRepositoryId = async (req, res) => {
  try {
    const { repositoryId } = req.params;

    // Find document categories by repositoryId
    const documentCategories = await DocumentCategory.find({ repositoryId }).populate('subcategories');

    if (!documentCategories.length) {
      return res.status(404).json({ error: 'No categories found for the given repository ID' });
    }

    res.status(200).json(documentCategories);
  } catch (error) {
    console.error('Error retrieving document categories by repository ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

  

// Controller function to update a document category by ID
export const updateDocumentCategory = async (req, res) => {
    try {
        const { name, subcategories } = req.body;
        const updatedDocumentCategory = await DocumentCategory.findByIdAndUpdate(req.params.id, { name }, { new: true });
        if (!updatedDocumentCategory) {
            return res.status(404).json({ error: 'Document category not found' });
        }
  
        // Update subcategories
        const existingSubCategories = await SubCategory.find({ categoryId: updatedDocumentCategory._id });
        const existingSubCategoryNames = existingSubCategories.map(sub => sub.name);
        const newSubCategories = subcategories.filter(sub => !existingSubCategoryNames.includes(sub));
        const removedSubCategories = existingSubCategoryNames.filter(sub => !subcategories.includes(sub));
  
        // Add new subcategories
        const savedSubCategories = [];
        for (const subcategoryName of newSubCategories) {
            const newSubCategory = new SubCategory({ name: subcategoryName, categoryId: updatedDocumentCategory._id });
            const savedSubCategory = await newSubCategory.save();
            savedSubCategories.push(savedSubCategory);
        }
  
        // Remove old subcategories
        for (const subcategoryName of removedSubCategories) {
            await SubCategory.findOneAndDelete({ name: subcategoryName, categoryId: updatedDocumentCategory._id });
        }
  
        // Update the document category with the subcategory IDs
        updatedDocumentCategory.subcategories = [
            ...existingSubCategories.filter(sub => !removedSubCategories.includes(sub.name)).map(sub => sub._id),
            ...savedSubCategories.map(sub => sub._id)
        ];
        await updatedDocumentCategory.save();
  
        res.status(200).json(updatedDocumentCategory);
    } catch (error) {
        console.error('Error updating document category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  };
  

// Controller function to delete a document category by ID
export const deleteDocumentCategory = async (req, res) => {
    try {
        const deletedDocumentCategory = await DocumentCategory.findByIdAndDelete(req.params.id);
        if (!deletedDocumentCategory) {
            return res.status(404).json({ error: 'Document category not found' });
        }
  
        // Delete related subcategories
        await SubCategory.deleteMany({ categoryId: deletedDocumentCategory._id });
  
        // Remove the category reference from the repository
        const repository = await Repository.findById(deletedDocumentCategory.repositoryId);
        if (repository) {
            repository.categories.pull(deletedDocumentCategory._id);
            await repository.save();
        }
  
        res.status(200).json({ message: 'Document category deleted successfully' });
    } catch (error) {
        console.error('Error deleting document category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  };
  

export default {
  createDocumentCategory,
  getAllDocumentCategory,
  getDocumentCategoryById,
  updateDocumentCategory,
  deleteDocumentCategory,
  getCategoriesByRepositoryId
};