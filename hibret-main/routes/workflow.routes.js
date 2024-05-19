import multer from 'multer';
import upload from "../config/multerConfig.js";
import { Router } from 'express';
const router = Router();
import { createWorkflow, getAllWorkflows,deleteWorkflow,updateWorkflow,getWorkflowsById,
  moveStageForward,
  moveStageBackward,
  approveWorkflow,
  rejectWorkflow,
  ownerEditAndMoveForward,
  getWorkflowDetails
 } from '../controllers/workflowController.js';

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       cb(null, 'uploads/');
//     },
//     filename: (req, file, cb) => {
//       cb(null, file.originalname);
//     }
//   });
  
//   const upload = multer({ storage });

// Route to create a new workflow instance
router.post('/workflows',upload.array('files'), createWorkflow);

// Route to fetch all workflow instances
router.get('/workflows', getAllWorkflows);

// Route to fetch all workflow instances
router.get('/workflows/:id', getWorkflowsById);

// Route to update an existing workflow
router.put('/workflows/:id', updateWorkflow);


// Route to update a workflow status
//router.post('/workflows/status/:id', approveWorkflow);

// Route to delete a workflow
router.delete('/workflows/:id', deleteWorkflow);

// Route to switch stages, approve and reject
router.post('/workflows/forward', moveStageForward);
router.post('/workflows/backward', moveStageBackward);
router.post('/workflows/approve', approveWorkflow);
router.post('/workflows/reject', rejectWorkflow);

// Route for the owner to edit and move the workflow forward
router.post('/workflows/:id/owner/edit', ownerEditAndMoveForward);

router.get('/workflows/:workflowId/user/:userId', getWorkflowDetails);


export default router;

