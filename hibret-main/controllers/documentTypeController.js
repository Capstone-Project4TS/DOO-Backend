// documentType.controller.js

import DocumentType from "../models/DocumentType.model.js";

// Controller function to create a new document type
export const createDocumentType = async (req, res) => {
  try {
    const { name, description } = req.body;
    const newDocumentType = new DocumentType({ name, description });
    const savedDocumentType = await newDocumentType.save();
    res.status(201).json(savedDocumentType);
  } catch (error) {
    console.error('Error creating document type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller function to retrieve all document types
export const getAllDocumentTypes = async (req, res) => {
  try {
    const documentTypes = await DocumentType.find();
    res.status(200).json(documentTypes);
  } catch (error) {
    console.error('Error retrieving document types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller function to retrieve a document type by ID
export const getDocumentTypeById = async (req, res) => {
  try {
    const documentType = await DocumentType.findById(req.params.id);
    if (!documentType) {
      return res.status(404).json({ error: 'Document type not found' });
    }
    res.status(200).json(documentType);
  } catch (error) {
    console.error('Error retrieving document type by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller function to update a document type by ID
export const updateDocumentType = async (req, res) => {
  try {
    const updatedDocumentType = await DocumentType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedDocumentType) {
      return res.status(404).json({ error: 'Document type not found' });
    }
    res.status(200).json(updatedDocumentType);
  } catch (error) {
    console.error('Error updating document type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller function to delete a document type by ID
export const deleteDocumentType = async (req, res) => {
  try {
    const deletedDocumentType = await DocumentType.findByIdAndDelete(req.params.id);
    if (!deletedDocumentType) {
      return res.status(404).json({ error: 'Document type not found' });
    }
    res.status(200).json({ message: 'Document type deleted successfully' });
  } catch (error) {
    console.error('Error deleting document type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { createDocumentType, getAllDocumentTypes, getDocumentTypeById, updateDocumentType, deleteDocumentType };
