
import { Router } from "express";
import reortController from "../controllers/reportAndAnalyticsController.js";

const router = Router();
const {
    getSystemActivityDashboard
} = reortController;


//Get
router.get("/reports/system-activity", getSystemActivityDashboard);


export default router;
