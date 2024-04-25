import { Router } from "express";
const router = Router();


/** import all controllers */
import * as auth from '../controllers/authController.js';
import * as user from '../controllers/userController.js';
import * as register  from '../services/emailService.js'
import Auth, { localVariables ,adminMiddleware} from '../middleware/auth.js';



/** POST Methods */
router.route('/admin/users/create').post(user.createAccounts); // register user
router.route('/sendVerification').post(user.sendInvitations); // send the email
router.route('/verifyEmail').post(register.verifyEmail); // verifying the email
router.route('/authenticate').post(auth.verifyUser, (req, res) => res.end()); // authenticate user
router.route('/login').post(auth.verifyUser,auth.login); // login in app
router.route('/logout').post(auth.Logout); // login in app

// /** GET Methods */
router.route('/user/:username').get(user.getUser) // user with username
router.route('/generateOTP').get(auth.verifyUser, localVariables, user.generateOTP) // generate random OTP
router.route('/verifyOTP').get(auth.verifyUser, user.verifyOTP) // verify generated OTP
router.route('/createResetSession').get(user.createResetSession) // reset all the variables



// /** PUT Methods */
router.route('/resetPassword').put(auth.verifyUser, user.resetPassword); // use to reset password
router.route('/change-password').put(Auth, user.changePassword);
// Endpoint to deactivate a user account
router.put('/admin/users/:userId/deactivate', adminMiddleware, user.deactivateAccount);
// Endpoint to activate a user account
router.put('/admin/users/:userId/activate', adminMiddleware, user.activateAccount);

export default router;