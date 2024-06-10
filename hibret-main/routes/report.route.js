
import { Router } from "express";
import reortController from "../controllers/reportAndAnalyticsController.js";
import authMiddleware from '../middleware/auth.js'
import  {
  
    authorize,
    isLoggedIn,
  } from "../middleware/auth.js";
  
const router = Router();
const {
    getAdminDashboard,
    getAdminReport,
    getUserDashboard
} = reortController;


//Get
// Admin routes
router.route("/admin/reports")
  .get(isLoggedIn, authorize(["DooAdmin"]), getAdminReport);

router.route("/admin/dashboard")
  .get(isLoggedIn, authorize(["DooAdmin"]), getAdminDashboard);

// User routes
router.route("/user/dashboard")
  .get(isLoggedIn, authMiddleware, getUserDashboard);

export default router;
