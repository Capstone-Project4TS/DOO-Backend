import { Router } from "express";
const router = Router();
import Auth, {
  localVariables,
  authorize,
  isLoggedIn,
} from "../middleware/auth.js";

/** import all controllers */
import * as auth from "../controllers/authController.js";
import * as user from "../controllers/userController.js";

/** POST Methods */
router
  .route("/sendInvitation")
  .post(isLoggedIn, authorize(["DooAdmin"]), user.sendInvitations); // send the otp
router
  .route("/resendInvitation")
  .post(isLoggedIn, authorize(["DooAdmin"]), user.resendInvitationEmail); // send the otp
router
  .route("/generateOTP")
  .post(auth.verifyUser, localVariables, user.generateOTP); // generate random OTP
router.route("/login").post(auth.verifyUser, auth.login); // login in app
router.route("/logout").post(isLoggedIn, auth.Logout); // login in app

/** GET Methods */
router.route("/admin/getAllUsers").get(isLoggedIn,authorize(["DooAdmin"]), user.getAllUsers); 
router.route("/verifyOTP").post( user.verifyOTP); // verify generated OTP
router.route("/createResetSession").get(user.createResetSession); // reset all the variables
router.route("/admin/filterUsers").get(isLoggedIn,authorize(["DooAdmin"]),user.filterUsersByRoleAndStatus); // get users by role and status
router.route("/admin/searchUsers").get(isLoggedIn,authorize(["DooAdmin"]),user.searchUsers); // get users by role and status

/** PUT Methods */
router.route("/resetPassword").put( user.resetPassword); // use to reset password
router.route("/setNewPassword").put( Auth,user.setNewPassword); // use to set new password
router.route("/change-password").put(isLoggedIn, Auth, user.changePassword);
router
  .route("/admin/users/:userId/deactivate")
  .put(isLoggedIn, authorize(["DooAdmin"]), user.deactivateAccount);
router
  .route("/admin/users/:userId/activate")
  .put(isLoggedIn, authorize(["DooAdmin"]), user.activateAccount);

export default router;

