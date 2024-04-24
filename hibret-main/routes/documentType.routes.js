// routes/documentTypes.js

import { Router } from 'express';
const router = Router();
import { createDocumentType, getAllDocumentTypes, getDocumentTypeById, updateDocumentType, deleteDocumentType} from '../controllers/documentTypeController.js'

// // Route for creating a new document type
 router.post('/', createDocumentType);

// // Route for retrieving all document types
router.get('/', getAllDocumentTypes);

// // Route for retrieving a specific document type by ID
router.get('/:id', getDocumentTypeById);

// // Route for updating a document type by ID
router.put('/:id', updateDocumentType);

// // Route for deleting a document type by ID
router.delete('/:id', deleteDocumentType);

export default router;
