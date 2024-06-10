import Notification from '../models/notification.model.js';
import { io } from '../server.js';

export const sendNotification = async (recipientId, senderId, message,  workflowId = null) => {
  try {
    const notificationData = new Notification({
      recipient: recipientId,
      sender: senderId,
      message,
      workflowId,
      createdAt: new Date()
    });

    // if (workflowId) {
    //   notificationData.workflowId = workflowId;
    // }

    // const notification = new Notification(notificationData);
    await notificationData.save();

    // Emit the notification to the recipient in real-time
    io.to(recipientId.toString()).emit('newNotification', notificationData);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

export const getNotifications = async (req, res) => {
  const { userId } = req.params;

  try {
    const notifications = await Notification.find({ recipient: userId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAsRead = async (req, res) => {
  const { notificationId } = req.params;

  try {
    await Notification.findByIdAndUpdate(notificationId, { read: true });
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export default{
  getNotifications
}