
import { Router } from "express";
import reortController from "../controllers/reportAndAnalyticsController.js";
import authMiddleware from '../middleware/auth.js'

const router = Router();
const {
    getAdminDashboard,
    getAdminReport,
    getUserDashboard
} = reortController;


//Get
router.get("/admin/reports", getAdminReport);
router.get("/admin/dashboard", getAdminDashboard);

router.get("/user/dashboard", authMiddleware,getUserDashboard);


export default router;
