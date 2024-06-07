import cron from "node-cron";
import { updateUserStatus } from "../services/userService.js";
import { createAccounts } from "../controllers/userController.js";
import { updateAllRoles } from "../controllers/roleController.js";

const schedules = [
  "0 0 * * *", // Runs at midnight
  "0 12 * * *", // Runs at noon
  // "* * * * *", // Runs every minute
];

export default function startCronJob() {
  // Iterate over each schedule
  schedules.forEach((schedule) => {
    cron.schedule(schedule, async () => {
      console.log(`Running scheduled task at ${schedule}`);
      try {
        try {
          await updateUserStatus();
          console.log("User status updated successfully.");
        } catch (error) {
          console.error("Failed to update user status:", error.message);
        }
        try {
          const result = await createAccounts();

          if (result && result.message) {
            console.log(result.message);
            if (result.createdUsers) {
              console.log("Created users:", result.createdUsers);
            }
            if (result.updatedUsers) {
              console.log("Updated users:", result.updatedUsers);
            }
            if (result.deletedUsers) {
              console.log("Deleted users:", result.deletedUsers);
            }
          } else {
            console.log("Unexpected result:", result);
          }
        } catch (error) {
          console.error(
            "Error during createAccounts execution:",
            error.message || error
          );
        }
        try {
          const result = await updateAllRoles();
          if (result.error && result.error.length > 0) {
            console.error(
              "Errors occurred during role synchronization:",
              result.error
            );
          } else if(result.message) {

            console.log(result.message);
            console.log("Updated roles:", result.updateResults);
            console.log("Deleted roles:", result.deleteResults);

          }
        } catch (error) {
          console.error("Unexpected error occurred:", error);
        }
        console.log("Scheduled task complete.");
      } catch (error) {
        console.error("Error running scheduled task:", error);
      }
    });
  });
}
