import express from "express";
import Auth from "../middleware/auth.js";

import {
  // fetchRepositories,
} from "../controllers/repositoryController.js";

const router = express.Router();

// router.get("/fetchrepos", Auth, fetchRepositories);

export default router;
