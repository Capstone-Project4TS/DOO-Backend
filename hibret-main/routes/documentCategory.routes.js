// routes/documentTypes.js

import { Router } from 'express';
const router = Router();
import { createDocumentType, getAllDocumentTypes, getDocumentTypeById, updateDocumentType, deleteDocumentType} from '../controllers/documentCategoryController.js'

// // Route for creating a new document type
 router.post('/category', createDocumentType);

// // Route for retrieving all document types
router.get('/category', getAllDocumentTypes);

// // Route for retrieving a specific document type by ID
router.get('/category/:id', getDocumentTypeById);

// // Route for updating a document type by ID
router.put('/category/:id', updateDocumentType);

// // Route for deleting a document type by ID
router.delete('/category/:id', deleteDocumentType);

export default router;
