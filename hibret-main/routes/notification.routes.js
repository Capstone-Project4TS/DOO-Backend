import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notification.js';
import  {

    isLoggedIn,
  } from "../middleware/auth.js";
  
const router = express.Router();

router.route('/notifications/:userId')
  .get( getNotifications);

router.route('/notifications/:notificationId/read')
  .put(isLoggedIn, markAsRead);

export default router;
