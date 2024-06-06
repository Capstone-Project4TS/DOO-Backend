import SubCategory from "../models/documentSubCategory.model.js";
import Folder from '../models/folder.model.js'
import {deleteFolderHierarchy} from '../services/folderService.js'
import DocumentCategory from "../models/documentCategory.model.js";
import {findWorkflowsInFolderHierarchy} from "../services/folderService.js"

// Controller function to create a new sub-category
export const createSubCategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    // Input validation
    if (!name || !categoryId || typeof name !== "string" || typeof categoryId !== "string") {
      return res.status(400).json({ error: "Invalid input data" });
    }

    const newSubCategory = new SubCategory({ name, categoryId });
    const savedSubCategory = await newSubCategory.save();
    res.status(201).json(savedSubCategory);
  } catch (error) {
    console.error("Error creating sub-category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to retrieve all sub-categories
export const getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate("categoryId");
    res.status(200).json(subCategories);
  } catch (error) {
    console.error("Error retrieving sub-categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to retrieve a sub-category by ID
export const getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id).populate("categoryId");
    if (!subCategory) {
      return res.status(404).json({ error: "Sub-category not found" });
    }
    res.status(200).json(subCategory);
  } catch (error) {
    console.error("Error retrieving sub-category by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to retrieve sub-categories by categoryId
export const getSubCategoryByCatId = async (req, res) => {
  try {
    const subCategories = await SubCategory.find({ categoryId: req.params.id });
    if (subCategories.length === 0) {
      return res.status(404).json({ error: "Sub-categories not found for the provided category ID" });
    }
    res.status(200).json(subCategories);
  } catch (error) {
    console.error("Error retrieving sub-categories by category ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to update a sub-category by ID
export const updateSubCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Find the existing sub-category by its ID
    const existingSubCategory = await SubCategory.findById(req.params.id);

    if (!existingSubCategory) {
      return res.status(404).json({ error: "Sub-category not found" });
    }

    // Update the sub-category
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    if (!updatedSubCategory) {
      return res.status(404).json({ error: "Sub-category not found" });
    }

    // Find and update the folder names associated with this sub-category
    const foldersToUpdate = await Folder.find({ name: existingSubCategory.name });
    for (const folder of foldersToUpdate) {
      folder.name = name;
      await folder.save();
    }

    res.status(200).json({
      message: "Sub-category and associated folders updated successfully",
      subCategory: updatedSubCategory,
      updatedFolders: foldersToUpdate
    });
  } catch (error) {
    console.error("Error updating sub-category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Controller function to delete a sub-category by ID
export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the sub-category by ID
    const subCategory = await SubCategory.findById(id);

    if (!subCategory) {
      return res.status(404).json({ error: "Sub-category not found" });
    }

    // Find the folder associated with the sub-category
    const folderToDelete = await Folder.findOne({ name: subCategory.name });

    if (!folderToDelete) {
      return res.status(404).json({ error: "Associated folder not found" });
    }

     // Check if there are any workflows in the folder hierarchy
     const workflowsFound = await findWorkflowsInFolderHierarchy(folderToDelete._id);
     if (workflowsFound) {
       return res.status(403).json({ error: "Cannot delete Sub category. Workflows are present in the folder hierarchy." });
     }
 
    // Delete related folders associated with the sub-category
    await deleteFolderHierarchy(folderToDelete._id);

    // Delete the sub-category
    await SubCategory.findByIdAndDelete(id);

    // Update any documents referencing the deleted sub-category
    await DocumentCategory.updateMany(
      { subcategories: id },
      { $pull: { subcategories: id } }
    );

    res.status(200).json({ message: "Sub-category and associated folders deleted successfully" });
  } catch (error) {
    console.error("Error deleting sub-category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export default {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
};
