
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
router.get("/admin/reports",isLoggedIn,authorize(["DooAdmin"]), getAdminReport);
router.get("/admin/dashboard",isLoggedIn,authorize(["DooAdmin"]), getAdminDashboard);

router.get("/user/dashboard",isLoggedIn, authMiddleware,getUserDashboard);


export default router;
