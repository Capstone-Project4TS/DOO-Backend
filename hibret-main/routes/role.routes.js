import express from 'express';
import { getAllRoles, getRoleById } from '../controllers/roleController.js';

const router = express.Router();

// Route to get all roles
router.get('/roles', getAllRoles);
// Route to get role by ID
router.get('/roles/:id', getRoleById);

export default router;
