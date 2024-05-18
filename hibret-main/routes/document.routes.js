import { Router } from "express";
import multer from 'multer';
import upload from "../config/multerConfig.js";
import documentController, { handleData } from "../controllers/documentController.js";
// const storage = multer.diskStorage({
//    destination: (req, file, cb) => {
//      cb(null, 'uploads/');
//    },
//    filename: (req, file, cb) => {
//      cb(null, file.originalname);
//    }
//  });
 
//  const upload = multer({ storage });

const router = Router();
const { createDocument,
   createDocuments,
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
router.post('/create',upload.array('files'), createDocuments);
router.post('/createtest',upload.array('files'), handleData);
router.post('/blank', createDocumentFromBlank)

//PUT

//DELETE
router.delete('/:id', deleteDocumentById);

router.post('/generatePDF', generatePdfFromDocumentData);

export default router;
