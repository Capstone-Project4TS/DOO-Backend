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

// Routes for roles
router.route("/roles")
  .get(isLoggedIn, getAllRoles);

router.route("/roles/:id")
  .get(isLoggedIn, getRoleById);

router.route("/deps")
  .get(isLoggedIn, getAllDeps);

router.route("/roles/dep/:id")
  .get(isLoggedIn, authorize(["DooAdmin"]), getAllRolesByDepId);

// Routes for committee
router.route("/committee")
  .post(isLoggedIn, authorize(["DooAdmin"]), createCommittee)
  .get(isLoggedIn, authorize(["DooAdmin"]), getAllCommittee);

// Routes for permissions
router.route("/roles/:roleId/permissions")
  .post(isLoggedIn, authorize(["DooAdmin"]), addPermission);

router.route("/roles/:roleId/permissions/:permissionName")
  .delete(isLoggedIn, authorize(["DooAdmin"]), removePermission);
export default router;
