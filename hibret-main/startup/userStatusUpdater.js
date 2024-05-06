// userStatusUpdater.js

import cron from 'node-cron';
import { updateUserStatus } from '../services/userService';

// Define the cron job to run updateUserStatus function once a day at midnight
cron.schedule('*/2 * * * *', async () => {
    console.log('Running user status update...');
    try {
        await updateUserStatus(); // Update statuses for all users
        console.log('User status update complete.');
    } catch (error) {
        console.error('Error updating user statuses:', error);
    }
});
