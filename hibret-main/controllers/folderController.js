import Folder from '../models/folder.model.js'



// Helper function to create folders and subfolders recursively
export const createFolderHierarchy = async (parentFolderId, year) => {
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


// Controller function to create a new folder
export const createFolder = async (req, res) => {
  try {
    const { name, parentFolder, folderPath, ownerId } = req.body;
    const folder = new Folder({ name, parentFolder, folderPath, ownerId });
    const newFolder = await folder.save();
    res.status(201).json(newFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller function to retrieve all folders
export const getAllFolders = async (req, res) => {
  try {
    const folders = await Folder.find();
    res.status(200).json(folders);
  } catch (error) {
    console.error('Error retrieving folders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Controller function to retrieve a specific folder by its ID
export const getFolderById = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(200).json(folder);
  } catch (error) {
    console.error('Error retrieving folder by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Controller function to update a folder's details by its ID
export const updateFolderDetailsById = async (req, res) => {
  try {
    const updatedFolder = await Folder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedFolder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error('Error updating folder details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Controller function to update a folder's parent folder by its ID
export const updateFolderParentById = async (req, res) => {
  try {
    const { parentId } = req.body;
    const updatedFolder = await Folder.findByIdAndUpdate(req.params.id, { parentFolder: parentId }, { new: true });
    if (!updatedFolder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error('Error updating folder parent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Controller function to add a document to a folder by its ID
export const addDocumentToFolderById = async (req, res) => {
  try {
    const { documentId } = req.body;
    const updatedFolder = await Folder.findByIdAndUpdate(req.params.id, { $push: { documents: documentId } }, { new: true });
    if (!updatedFolder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error('Error adding document to folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Controller function to remove a document from a folder by its ID
export const removeDocumentFromFolderById = async (req, res) => {
  try {
    const { documentId } = req.body;
    const updatedFolder = await Folder.findByIdAndUpdate(req.params.id, { $pull: { documents: documentId } }, { new: true });
    if (!updatedFolder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error('Error removing document from folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Controller function to delete a folder by its ID
export const deleteFolderById = async (req, res) => {
  try {
    const deletedFolder = await Folder.findByIdAndDelete(req.params.id);
    if (!deletedFolder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(200).json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Controller function to retrieve documents within a folder by its ID
export const getDocumentsInFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId).populate('documents');
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(200).json(folder.documents);
  } catch (error) {
    console.error('Error retrieving documents in folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



export const getImmediate = async (req, res) => {
  try {
    const { folderId } = req.params;

    // Find the folder by ID
    const folder = await Folder.findById(folderId);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Extract immediate subfolders and documents
    const { subfolders, documents } = folder;

    // Respond with the immediate subfolders and documents
    return res.status(200).json({ subfolders, documents });
  } catch (error) {
    console.error('Error retrieving immediate subfolders and documents:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

