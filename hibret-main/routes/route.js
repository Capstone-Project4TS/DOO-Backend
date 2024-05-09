import { Router } from "express";
const router = Router();

/** import all controllers */
import * as auth from '../controllers/authController.js';
import * as user from '../controllers/userController.js';
import Auth, { localVariables ,adminMiddleware,authorize,isLoggedIn} from '../middleware/auth.js';


/** POST Methods */
// router.route('/admin/users/create').post(isLoggedIn,authorize(["DooAdmin"]),user.createAccounts); // register user
router.route('/sendInvitation').post(isLoggedIn,authorize(["DooAdmin"]),user.sendInvitations); // send the otp
router.route('/resendInvitation').post(isLoggedIn,authorize(["DooAdmin"]),user.resendInvitationEmail); // send the otp
router.route('/generateOTP').post(auth.verifyUser, localVariables, user.generateOTP) // generate random OTP
router.route('/login').post(auth.verifyUser,auth.login); // login in app
router.route('/logout').post(isLoggedIn,auth.Logout); // login in app

 /** GET Methods */
router.route('/admin/getAllUsers').get(Auth, user.getAllUsers) // verify generated OTP
router.route('/verifyOTP').get(Auth, user.verifyOTP) // verify generated OTP
router.route('/createResetSession').get(user.createResetSession) // reset all the variables
router.route('/filterUsers').get(user.filterUsersByRoleAndStatus) // get users by role and status

 /** PUT Methods */
router.route('/resetPassword').put(Auth, user.resetPassword); // use to reset password
router.route('/change-password').put(isLoggedIn,Auth, user.changePassword);
router.route('/admin/users/:userId/deactivate').put(isLoggedIn,authorize(["DooAdmin"]), user.deactivateAccount);
router.route('/admin/users/:userId/activate').put(isLoggedIn,adminMiddleware, user.activateAccount);

export default router;