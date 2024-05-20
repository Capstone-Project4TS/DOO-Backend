import { Router } from 'express';
const router = Router();
import {
    createWorkflowTemplate,
    getAllWorkflowTemplates,
    getWorkflowTemplateById,
    // updateWorkflowTemplate,
    deleteWorkflowTemplate,
    getAllRequiredDocumentTemplates
} from
    '../controllers/workflowTemplateController.js';

// Routes for workflow template management
router.post('/workflow-templates', createWorkflowTemplate);
router.get('/workflow-templates', getAllWorkflowTemplates);
router.get('/workflow-templates/:id', getWorkflowTemplateById);
// router.put('/workflow-templates/:id', updateWorkflowTemplate);
router.delete('/workflow-templates/:id', deleteWorkflowTemplate);
router.get('/workflow-templates/requiredDoc/:id', getAllRequiredDocumentTemplates);


export default router;