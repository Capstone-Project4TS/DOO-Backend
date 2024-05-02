import { Router } from "express";
const router = Router();

/** import all controllers */
import * as auth from '../controllers/authController.js';
import * as user from '../controllers/userController.js';
import * as register  from '../services/emailService.js'
import Auth, { localVariables ,adminMiddleware,authorize,isLoggedIn} from '../middleware/auth.js';


/** POST Methods */
router.route('/admin/users/create').post(isLoggedIn,authorize(["Admin"]),user.createAccounts); // register user
router.route('/sendVerification').post(isLoggedIn,authorize(["Admin"]),user.sendInvitations); // send the email
router.route('/verifyEmail').post(register.verifyEmail); // verifying the email
router.route('/authenticate').post(auth.verifyUser, (req, res) => res.end()); // authenticate user
router.route('/login').post(auth.verifyUser,auth.login); // login in app
router.route('/logout').post(isLoggedIn,auth.Logout); // login in app

 /** GET Methods */
router.route('/user').get(isLoggedIn,user.getUser) // user with username
router.route('/generateOTP').get(auth.verifyUser, localVariables, user.generateOTP) // generate random OTP
router.route('/verifyOTP').get(auth.verifyUser, user.verifyOTP) // verify generated OTP
router.route('/createResetSession').get(user.createResetSession) // reset all the variables

 /** PUT Methods */
router.route('/resetPassword').put(auth.verifyUser, user.resetPassword); // use to reset password
router.route('/change-password').put(isLoggedIn,Auth, user.changePassword);
// Endpoint to deactivate a user account
router.route('/admin/users/:userId/deactivate').put(isLoggedIn,authorize(["Admin"]), user.deactivateAccount);
// Endpoint to activate a user account
router.route('/admin/users/:userId/activate').put(isLoggedIn,adminMiddleware, user.activateAccount);

export default router;