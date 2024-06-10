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


// Routes for document detail and deletion
router.route("/detail/:id")
  .get(isLoggedIn, getDocumentDetail);

router.route("/delete/:id")
  .delete(isLoggedIn, deleteDocumentById);

export default router;
