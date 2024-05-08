import { Router } from "express";
import documentController from "../controllers/documentController.js";

const router = Router();
const { createDocument,
   getAllDocuments,
   getDocumentById,
   getDocumentsByFilter,
   deleteDocumentById,
   createDocumentFromBlank,
   generatePdfFromDocumentData } = documentController;

//GET
router.get('/', getAllDocuments);
router.get('/filter', getDocumentsByFilter)
router.get('/:id', getDocumentById);

//POST
router.post('/upload', createDocument);
router.post('/blank', createDocumentFromBlank)

//PUT

//DELETE
router.delete('/:id', deleteDocumentById);

router.post('/generatePDF', generatePdfFromDocumentData);

export default router;
