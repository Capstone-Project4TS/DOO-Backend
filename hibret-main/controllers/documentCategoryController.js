import mongoose from "mongoose";
import DocumentCategory from "../models/documentCategory.model.js";
import SubCategory from "../models/documentSubCategory.model.js";
import Folder from "../models/folder.model.js";
import { createFolderHierarchy } from "../services/folderService.js";
import { getDeps } from "./roleController.js";
import { deleteFolderHierarchy } from "../services/folderService.js";
import {findWorkflowsInFolderHierarchy} from "../services/folderService.js"

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
    let departmentFolder = await Folder.findOne({
      name: departmentName,
      parentFolder: depId,
    });
    if (!departmentFolder) {
      departmentFolder = new Folder({
        name: departmentName,
        parentFolder: depId, 
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

    try {
      await newDocumentCategory.save();
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error code
        return res
          .status(400)
          .json({ error: "Document category with this name already exists" });
      }
      throw error; // Re-throw error if it's not due to duplicate key
    }

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
        categoryId: newDocumentCategory._id,
      });
      const savedSubCategory = await newSubCategory.save();

      savedSubCategories.push(savedSubCategory);
    }

    // Update the document category with the subcategory IDs
    newDocumentCategory.subcategories = savedSubCategories.map(
      (sub) => sub._id
    );
    await newDocumentCategory.save();

    res.status(201).json({
      category: newDocumentCategory,
      subcategories: savedSubCategories,
    });
  } catch (error) {
    console.error(
      "Error creating document category with subcategories and folder hierarchies:",
      error
    );
    res
      .status(500)
      .json({ error: "Internal server error. Please try again later." });
  }
};

// Controller function to retrieve all document categories with subcategories
export const getAllDocumentCategory = async (req, res) => {
  try {
    const documentCategories = await DocumentCategory.find().populate(
      "subcategories"
    );

    if (!documentCategories || documentCategories.length === 0) {
      return res.status(404).json({ error: "No document categories found" });
    }

    res.status(200).json(documentCategories);
  } catch (error) {
    console.error("Error retrieving document categories:", error);
    res
      .status(500)
      .json({ error: "Internal server error. Please try again later." });
  }
};

// Get a single document category by ID with detailed information
export const getDocumentCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the provided ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid document category ID" });
    }

    // Find the document category by ID and populate subcategories
    const documentCategory = await DocumentCategory.findById(id).populate(
      "subcategories",
      "name"
    );

    if (!documentCategory) {
      return res.status(404).json({ error: "Document category not found" });
    }

    // Sanitize the document category to include necessary details only
    const documentCategoryDetail = {
      _id: documentCategory._id,
      name: documentCategory.name,
      subcategories: documentCategory.subcategories.map((subcategory) => ({
        _id: subcategory._id,
        name: subcategory.name,
      })),
    };

    // Return the document category details
    return res.status(200).json(documentCategoryDetail);
  } catch (error) {
    console.error("Error retrieving document category by ID:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid document category ID" });
    }
    return res
      .status(500)
      .json({ error: "Internal server error. Please try again later." });
  }
};

// Controller function to get categories by repository ID
export const getCategoriesByRepositoryId = async (req, res) => {
  try {
    const { depId } = req.params;

    // Find document categories by repositoryId
    const documentCategories = await DocumentCategory.find({
      depId,
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
    res
      .status(500)
      .json({ error: "Internal server error. Please try again later." });
  }
};

// Controller function to update a document category by ID
export const updateDocumentCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    // Find the existing document category by ID
    const existingDocumentCategory = await DocumentCategory.findById(
      req.params.id
    );
    if (!existingDocumentCategory) {
      return res.status(404).json({ error: "Document category not found" });
    }
    console.log(existingDocumentCategory);
    // Check for duplicate category name
    const duplicateCategory = await DocumentCategory.findOne({ name });
    if (
      duplicateCategory &&
      duplicateCategory._id.toString() !== req.params.id
    ) {
      return res
        .status(400)
        .json({ error: "Document category with this name already exists" });
    }
    const currentYear = new Date().getFullYear();
    // Update the folder name associated with the category name
    const categoryFolder = await Folder.findOne({
      name: existingDocumentCategory.name,
    });
    console.log(categoryFolder);
    if (categoryFolder) {
      categoryFolder.name = name;
      await categoryFolder.save();
    }

    // Update the document category name
    existingDocumentCategory.name = name;
    const updatedDocumentCategory = await existingDocumentCategory.save();

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

    // Add new subcategories and create associated folders
    const savedSubCategories = [];
    for (const subcategoryName of newSubCategories) {
      const newSubCategory = new SubCategory({
        name: subcategoryName,
        categoryId: updatedDocumentCategory._id,
      });
      const savedSubCategory = await newSubCategory.save();
      savedSubCategories.push(savedSubCategory);

      // Create a folder for the new subcategory under the category folder
      const subCategoryFolder = new Folder({
        name: subcategoryName,
        parentFolder: categoryFolder._id,
      });

      await subCategoryFolder.save();
      await createFolderHierarchy(subCategoryFolder._id, currentYear);

      // Update the category folder's children
      categoryFolder.folders.push(subCategoryFolder._id);
      await categoryFolder.save();
    }

    // Delete removed subcategories and their associated folders
    for (const subcategoryName of removedSubCategories) {
      const subCategory = await SubCategory.findOneAndDelete({
        name: subcategoryName,
        categoryId: updatedDocumentCategory._id,
      });
      // Find the folder associated with the sub-category
      const folderToDelete = await Folder.findOne({ name: subCategory.name });
      if (folderToDelete) {
        // Delete related folders associated with the sub-category
        await deleteFolderHierarchy(folderToDelete._id);
      }
    }

    // Update the document category with the subcategory IDs
    updatedDocumentCategory.subcategories = [
      ...existingSubCategories
        .filter((sub) => !removedSubCategories.includes(sub.name))
        .map((sub) => sub._id),
      ...savedSubCategories.map((sub) => sub._id),
    ];
    await updatedDocumentCategory.save();

    res.status(200).json({
      message: "Document category and associated folders updated successfully",
      documentCategory: updatedDocumentCategory,
    });
  } catch (error) {
    console.error("Error updating document category:", error);
    if (error.code === 11000) {
      res
        .status(400)
        .json({ error: "Document category with this name already exists" });
    } else {
      res
        .status(500)
        .json({ error: "Internal server error. Please try again later." });
    }
  }
};


// Controller function to delete a document category by ID
export const deleteDocumentCategory = async (req, res) => {
  try {
     // Find the document category
     const deletedDocumentCategory = await DocumentCategory.findById(req.params.id);
     if (!deletedDocumentCategory) {
       return res.status(404).json({ error: "Document category not found" });
     }

    // Remove the category folder reference from the department's main folder
    const departmentFolder = await Folder.findOne({ parentFolder: deletedDocumentCategory.depId });

    // Find and delete the main folder associated with the document category
    const categoryFolder = await Folder.findOne({ name: deletedDocumentCategory.name, parentFolder: { $exists: true } });
    if (!categoryFolder) {
      return res.status(404).json({ error: "Category folder not found" });
    }

    // Check if there are any workflows in the folder hierarchy
    const workflowsFound = await findWorkflowsInFolderHierarchy(categoryFolder._id);
    if (workflowsFound) {
      return res.status(403).json({ error: "Cannot delete category. Workflows are present in the folder hierarchy." });
    }

    if (departmentFolder && categoryFolder) {
      departmentFolder.folders.pull(categoryFolder._id);
      await departmentFolder.save();
      await deleteFolderHierarchy(categoryFolder._id);
    }else{
      return res.status(404).json({ error: "Department folder or category folder not found" });
    }

    // Delete the document category
      await DocumentCategory.findByIdAndDelete(req.params.id);

     // Delete related subcategories
     await SubCategory.deleteMany({ categoryId: deletedDocumentCategory._id });

    res.status(200).json({ message: "Document category, subcategories, and associated folders deleted successfully" });
  } catch (error) {
    console.error("Error deleting document category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// get all categories under that department
//sanitized & error handled
export const getCatForDep = async (req, res) => {
  const { dep_id } = req.params;

  if (!dep_id) {
    return res.status(400).json({ message: "Department ID is required" });
  }

  try {
    // Check if the department ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(dep_id)) {
      return res.status(400).json({ message: "Invalid Department ID" });
    }

    const categories = await DocumentCategory.find({ dep_id }).populate(
      "subcategories",
      "_id name"
    );

    if (!categories || categories.length === 0) {
      return res
        .status(404)
        .json({ message: "No categories found for this department" });
    }

    // Sanitize output to include only necessary fields
    const sanitizedCategories = categories.map((category) => ({
      _id: category._id,
      name: category.name,
      subcategories: category.subcategories.map((subcategory) => ({
        _id: subcategory._id,
        name: subcategory.name,
      })),
    }));

    res.status(200).json(sanitizedCategories);
  } catch (error) {
    console.error("Error fetching categories:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid Department ID format" });
    }

    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Controller function to search document categories by name
export const searchDocumentCategoriesByName = async (req, res) => {
  const { name } = req.query;

  try {
    if (!name) {
      return res.status(400).json({ message: "Name parameter is required" });
    }

    // Search by name
    const categories = await DocumentCategory.find({
      name: { $regex: new RegExp(name, "i") },
    }).populate("subcategories");

    if (categories.length === 0) {
      return res
        .status(404)
        .json({ message: "No document categories found matching the name" });
    }

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error searching document categories by name:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Controller function to filter document categories
export const filterDocumentCategories = async (req, res) => {
  const { subCategoryId, depId } = req.query;

  try {
    // Construct query object
    let query = {};

    // Add subcategory filter if provided
    if (subCategoryId) {
      query.subcategories = subCategoryId;
    }

    // Add department filter if provided
    if (depId) {
      query.depId = depId;
    }

    // Execute the query
    const categories = await DocumentCategory.find(query).populate(
      "subcategories"
    );

    if (categories.length === 0) {
      return res.status(404).json({
        message: "No document categories found matching the criteria",
      });
    }

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error filtering document categories:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  createDocumentCategory,
  getAllDocumentCategory,
  getDocumentCategoryById,
  updateDocumentCategory,
  deleteDocumentCategory,
  getCategoriesByRepositoryId,
  createFolderHierarchy,
  filterDocumentCategories,
  searchDocumentCategoriesByName,
};
