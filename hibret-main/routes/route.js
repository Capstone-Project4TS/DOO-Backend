import { Router } from "express";
const router = Router();


/** import all controllers */
import * as auth from '../controllers/authController.js';
import * as user from '../controllers/userController.js';

import * as register  from '../controllers/mailer.js'
// import Auth, { localVariables } from '../middleware/auth.js';



/** POST Methods */
router.route('/admin/users/create').post(user.createAccounts); // register user
router.route('/sendVerification').post(register.sendVerificationEmail); // send the email
router.route('/verifyEmail').post(register.verifyEmail); // verifying the email
router.route('/authenticate').post(auth.verifyUser, (req, res) => res.end()); // authenticate user
router.route('/login').post(auth.verifyUser,auth.login); // login in app

// /** GET Methods */
// router.route('/user/:username').get(controller.getUser) // user with username
// router.route('/generateOTP').get(controller.verifyUser, localVariables, controller.generateOTP) // generate random OTP
// router.route('/verifyOTP').get(controller.verifyUser, controller.verifyOTP) // verify generated OTP
// router.route('/createResetSession').get(controller.createResetSession) // reset all the variables


// /** PUT Methods */
// // router.route('/updateuser').put(Auth, controller.updateUser); // is use to update the user profile
// router.route('/resetPassword').put(controller.verifyUser, controller.resetPassword); // use to reset password



export default router;