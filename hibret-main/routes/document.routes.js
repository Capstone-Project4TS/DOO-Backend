import { Router } from "express";
import documentController from "../controllers/documentController.js";

const router = Router();
const {
  deleteDocumentById,
  getDocumentDetail
} = documentController;


//Get
router.get("/detail/:id", getDocumentDetail);

//DELETE
router.delete("/delete/:id", deleteDocumentById);

export default router;
