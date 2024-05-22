import express from "express";
import Auth from "../middleware/auth.js";

import {
  getRepos,
  fetchRepositories,
} from "../controllers/repositoryController.js";

const router = express.Router();

router.get("/repository", getRepos);
router.get("/fetchrepos", Auth, fetchRepositories);

export default router;
