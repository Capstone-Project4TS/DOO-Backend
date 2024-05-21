import express from 'express';

import {getRepos,fetchRepositories} from '../controllers/repositoryController.js'

const router = express.Router();

router.get('/repository', getRepos)
router.get('/fetchrepos', fetchRepositories)


export default router;