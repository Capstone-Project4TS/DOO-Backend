import mongoose from 'mongoose';
import DocumentCategory from "../models/documentCategory.model.js";
import SubCategory from "../models/documentSubCategory.model.js";
import Folder from "../models/folder.model.js";
import { createFolderHierarchy } from "./folderController.js";
import { getDeps } from "./roleController.js";

export const createDocumentCategory = async (req, res) => {
  try {
    const { name, subcategories, depId } = req.body;

    // Get the department name
    const deps = await getDeps();
    const department = deps.find((dep) => dep._id.toString() === depId);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    const departmentName = department.name;

    // Create the top-level folder for the department if it doesn't exist
    let departmentFolder = await Folder.findOne({ name: departmentName, parentFolder: null });
    if (!departmentFolder) {
      departmentFolder = new Folder({
        name: departmentName,
        parentFolder: depId // Top-level folder has no parent
      });
      departmentFolder = await departmentFolder.save();
    }

    // Create main folder for the document category under the department folder
    const mainCategoryFolder = new Folder({
      name: name,
      parentFolder: departmentFolder._id,
    });
    const savedMainCategoryFolder = await mainCategoryFolder.save();

    // Update department folder's children
    departmentFolder.folders.push(savedMainCategoryFolder._id);
    await departmentFolder.save();

    // Create new document category
    const newDocumentCategory = new DocumentCategory({
      name,
      depId,
    });
    const savedDocumentCategory = await newDocumentCategory.save();

    // Create subcategories and their folder hierarchies
    const savedSubCategories = [];
    const currentYear = new Date().getFullYear();

    for (const subcategoryName of subcategories) {
      // Create subcategory folder under the main category folder
      const subCategoryFolder = new Folder({
        name: subcategoryName,
        parentFolder: savedMainCategoryFolder._id,
      });
      const savedSubCategoryFolder = await subCategoryFolder.save();

      // Update main category folder's children
      savedMainCategoryFolder.folders.push(savedSubCategoryFolder._id);
      await savedMainCategoryFolder.save();

      // Create folder hierarchy for the current year under the subcategory folder
      const yearFolderId = await createFolderHierarchy(
        savedSubCategoryFolder._id,
        currentYear
      );

      const newSubCategory = new SubCategory({
        name: subcategoryName,
        categoryId: savedDocumentCategory._id,
      });
      const savedSubCategory = await newSubCategory.save();

      savedSubCategories.push(savedSubCategory);
    }

    // Update the document category with the subcategory IDs
    savedDocumentCategory.subcategories = savedSubCategories.map(
      (sub) => sub._id
    );
    await savedDocumentCategory.save();

    res.status(201).json({
      category: savedDocumentCategory,
      subcategories: savedSubCategories,
    });
  } catch (error) {
    console.error(
      "Error creating document category with subcategories and folder hierarchies:",
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};




// Controller function to retrieve all document categories with subcategories
export const getAllDocumentCategory = async (req, res) => {
  try {
    const documentCategories = await DocumentCategory.find().populate(
      "subcategories"
    );

    res.status(200).json(documentCategories);
  } catch (error) {
    console.error("Error retrieving document categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to retrieve a document category by ID with subcategories
export const getDocumentCategoryById = async (req, res) => {
  try {
    const documentCategory = await DocumentCategory.findById(
      req.params.id
    ).populate("subcategories");
    if (!documentCategory) {
      return res.status(404).json({ error: "Document category not found" });
    }
    res.status(200).json(documentCategory);
  } catch (error) {
    console.error("Error retrieving document category by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to get categories by repository ID
export const getCategoriesByRepositoryId = async (req, res) => {
  try {
    const { repositoryId } = req.params;

    // Find document categories by repositoryId
    const documentCategories = await DocumentCategory.find({
      repositoryId,
    }).populate("subcategories");

    if (!documentCategories.length) {
      return res
        .status(404)
        .json({ error: "No categories found for the given repository ID" });
    }

    res.status(200).json(documentCategories);
  } catch (error) {
    console.error(
      "Error retrieving document categories by repository ID:",
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to update a document category by ID
export const updateDocumentCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;
    const updatedDocumentCategory = await DocumentCategory.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    if (!updatedDocumentCategory) {
      return res.status(404).json({ error: "Document category not found" });
    }

    // Update subcategories
    const existingSubCategories = await SubCategory.find({
      categoryId: updatedDocumentCategory._id,
    });
    const existingSubCategoryNames = existingSubCategories.map(
      (sub) => sub.name
    );
    const newSubCategories = subcategories.filter(
      (sub) => !existingSubCategoryNames.includes(sub)
    );
    const removedSubCategories = existingSubCategoryNames.filter(
      (sub) => !subcategories.includes(sub)
    );

    // Add new subcategories
    const savedSubCategories = [];
    for (const subcategoryName of newSubCategories) {
      const newSubCategory = new SubCategory({
        name: subcategoryName,
        categoryId: updatedDocumentCategory._id,
      });
      const savedSubCategory = await newSubCategory.save();
      savedSubCategories.push(savedSubCategory);
    }

    // Remove old subcategories
    // for (const subcategoryName of removedSubCategories) {
    //   await SubCategory.findOneAndDelete({
    //     name: subcategoryName,
    //     categoryId: updatedDocumentCategory._id,
    //   });
    // }

    // Update the document category with the subcategory IDs
    updatedDocumentCategory.subcategories = [
      ...existingSubCategories
        .filter((sub) => !removedSubCategories.includes(sub.name))
        .map((sub) => sub._id),
      ...savedSubCategories.map((sub) => sub._id),
    ];
    await updatedDocumentCategory.save();

    res.status(200).json(updatedDocumentCategory);
  } catch (error) {
    console.error("Error updating document category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to delete a document category by ID
export const deleteDocumentCategory = async (req, res) => {
  try {
    const deletedDocumentCategory = await DocumentCategory.findByIdAndDelete(
      req.params.id
    );
    if (!deletedDocumentCategory) {
      return res.status(404).json({ error: "Document category not found" });
    }

    // Delete related subcategories
    await SubCategory.deleteMany({ categoryId: deletedDocumentCategory._id });

    // Remove the category reference from the repository
    const repository = await Repository.findById(
      deletedDocumentCategory.repositoryId
    );
    if (repository) {
      repository.categories.pull(deletedDocumentCategory._id);
      await repository.save();
    }

    res.status(200).json({ message: "Document category deleted successfully" });
  } catch (error) {
    console.error("Error deleting document category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// get all categories under that department
//sanitized & error handled
export const getCatForDep = async(req, res) => {
  const { dep_id } = req.params;

  if (!dep_id) {
    return res.status(400).json({ message: 'Department ID is required' });
  }

  try {
    // Check if the department ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(dep_id)) {
      return res.status(400).json({ message: 'Invalid Department ID' });
    }

    const categories = await DocumentCategory.find({ dep_id }).populate('subcategories', '_id name');

    if (!categories || categories.length === 0) {
      return res.status(404).json({ message: 'No categories found for this department' });
    }

    // Sanitize output to include only necessary fields
    const sanitizedCategories = categories.map(category => ({
      _id: category._id,
      name: category.name,
      subcategories: category.subcategories.map(subcategory => ({
        _id: subcategory._id,
        name: subcategory.name
      }))
    }));

    res.status(200).json(sanitizedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid Department ID format' });
    }

    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}




export default {
  createDocumentCategory,
  getAllDocumentCategory,
  getDocumentCategoryById,
  updateDocumentCategory,
  deleteDocumentCategory,
  getCategoriesByRepositoryId,
  createFolderHierarchy,

};
