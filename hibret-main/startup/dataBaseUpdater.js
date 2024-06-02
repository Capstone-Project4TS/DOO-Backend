import cron from "node-cron";
import { updateUserStatus } from "../services/userService.js";
import { createAccounts } from "../controllers/userController.js";
import { updateAllRoles } from "../controllers/roleController.js";

const schedules = [
  "0 0 * * *", // Runs at midnight
  "0 12 * * *", // Runs at noon
];

export default function startCronJob() {
  cron.schedule("*/60 * * * *", async () => {
    console.log("Running user status update...");
    try {
      await updateUserStatus(); // Update statuses for all users
      await createAccounts();
      await updateAllRoles();

      console.log("User status update complete.");
    } catch (error) {
      console.error("Error updating user statuses:", error);
    }
  });
}
