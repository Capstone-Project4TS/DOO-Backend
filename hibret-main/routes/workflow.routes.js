
import { Router } from 'express';
const router = Router();
import { createWorkflow, getAllWorkflows,deleteWorkflow,updateWorkflow,approveWorkflow,getWorkflowsById } from '../controllers/workflowController.js';

// Route to create a new workflow instance
router.post('/workflows', createWorkflow);

// Route to fetch all workflow instances
router.get('/workflows', getAllWorkflows);

// Route to fetch all workflow instances
router.get('/workflows/:id', getWorkflowsById);

// Route to update an existing workflow
router.put('/workflows/:id', updateWorkflow);

// Route to update a workflow status
router.post('/workflows/status/:id', approveWorkflow);

// Route to delete a workflow
router.delete('/workflows/:id', deleteWorkflow);



export default router;
