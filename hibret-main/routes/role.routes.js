import express from "express";
import Auth, {
  localVariables,
  adminMiddleware,
  authorize,
  isLoggedIn,
} from "../middleware/auth.js";

import {
  getAllRoles,
  getRoleById,
  getAllDeps,
  getAllRolesByDepId,
  createCommittee,
  getAllCommittee,
  removePermission,
  addPermission,
} from "../controllers/roleController.js";

const router = express.Router();

// Route to get all roles
router.get("/roles",isLoggedIn, getAllRoles);
// Route to get role by ID
router.get("/roles/:id",isLoggedIn, getRoleById);
router.get("/deps",isLoggedIn, getAllDeps);
router.get("/roles/dep/:id",isLoggedIn,authorize(["DooAdmin"]), getAllRolesByDepId);
router.post("/committee",isLoggedIn,authorize(["DooAdmin"]), createCommittee);
router.get("/committee",isLoggedIn,authorize(["DooAdmin"]), getAllCommittee);

router.post("/roles/:roleId/permissions",isLoggedIn,authorize(["DooAdmin"]), addPermission);
router.delete("/roles/:roleId/permissions/:permissionName",isLoggedIn,authorize(["DooAdmin"]), removePermission);

export default router;
