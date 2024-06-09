import { Router } from "express";
import documentController from "../controllers/documentController.js";
import  {
  isLoggedIn,
} from "../middleware/auth.js";

const router = Router();
const {
  deleteDocumentById,
  getDocumentDetail
} = documentController;


//Get
router.get("/detail/:id",isLoggedIn, getDocumentDetail);

//DELETE
router.delete("/delete/:id", isLoggedIn, deleteDocumentById);

export default router;
