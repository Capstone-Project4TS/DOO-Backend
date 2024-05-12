import { Router } from "express";
import documentController from "../controllers/documentController.js";

const router = Router();
const { createDocument,
   getAllDocuments,
   getDocumentById,
   getDocumentsByFilter,
   deleteDocumentById,
   createDocumentFromBlank,
   generatePdfFromDocumentData ,
   getPdfDocument,
   getUploadedDoc,
} = documentController;

//GET
router.get('/', getAllDocuments);
router.get('/filter', getDocumentsByFilter)
router.get('/:id', getDocumentById);
router.get('/retrieve/:id', getPdfDocument);
router.get('/getUpload/:id', getUploadedDoc);


//POST
router.post('/upload', createDocument);
router.post('/blank', createDocumentFromBlank)

//PUT

//DELETE
router.delete('/:id', deleteDocumentById);

router.post('/generatePDF', generatePdfFromDocumentData);

export default router;
