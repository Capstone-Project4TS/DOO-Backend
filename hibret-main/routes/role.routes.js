import express from 'express';
import { getAllRoles, getRoleById, getAllDeps, getAllRolesByDepId, createCommittee,getAllCommittee } from '../controllers/roleController.js';

const router = express.Router();

// Route to get all roles
router.get('/roles', getAllRoles);
// Route to get role by ID
router.get('/roles/:id', getRoleById);

router.get('/deps', getAllDeps)

router.get('/roles/dep/:id', getAllRolesByDepId);

router.post('/committee', createCommittee)
router.get('/committee', getAllCommittee)

export default router;
