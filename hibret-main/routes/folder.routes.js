import { Router } from "express";
import Auth from "../middleware/auth.js";
import  {
  isLoggedIn,
} from "../middleware/auth.js";

const router = Router();
import {
  fetchRepositories
} from "../controllers/folderController.js";


router.route("/fetchrepos")
  .get(isLoggedIn, Auth, fetchRepositories);


export default router;
