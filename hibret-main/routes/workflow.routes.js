
import { Router } from 'express';
const router = Router();
import { createWorkflow, getAllWorkflows,deleteWorkflow,updateWorkflow } from '../controllers/workflowController.js';

// Route to create a new workflow instance
router.post('/workflows', createWorkflow);

// Route to fetch all workflow instances
router.get('/workflows', getAllWorkflows);

// Route to update an existing workflow
router.put('/workflows/:id', updateWorkflow);

// Route to delete a workflow
router.delete('/workflows/:id', deleteWorkflow);

export default router;
