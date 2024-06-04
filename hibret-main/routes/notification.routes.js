import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notification';

const router = express.Router();

router.get('/notifications/:userId', getNotifications);
router.put('/notifications/:notificationId/read', markAsRead);

export default router;
