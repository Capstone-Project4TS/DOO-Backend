import { Router } from "express";
import multer from 'multer';
import upload from "../config/multerConfig.js";
import documentController , {handleData} from "../controllers/documentController.js";


const router = Router();
const { 
   getAllDocuments,
   getDocumentById,
   getDocumentsByFilter,
   deleteDocumentById,
   getUploadedDoc,
} = documentController;

//GET
router.get('/', getAllDocuments);
router.get('/filter', getDocumentsByFilter)
router.get('/:id', getDocumentById);
router.get('/getUpload/:id', getUploadedDoc);

//POST
router.post('/create',upload.array('files'), handleData);


//PUT

//DELETE
router.delete('/:id', deleteDocumentById);

export default router;
