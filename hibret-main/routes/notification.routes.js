import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notification.js';
import  {

    isLoggedIn,
  } from "../middleware/auth.js";
  
const router = express.Router();

router.get('/notifications/:userId', isLoggedIn, getNotifications);
router.put('/notifications/:notificationId/read',isLoggedIn, markAsRead);

export default router;
