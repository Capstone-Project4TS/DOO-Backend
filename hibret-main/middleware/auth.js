import { compareSync } from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/users.model.js";
import Role from "../models/role.model.js";

/** auth middleware */
export default async function Auth(req, res, next) {
  try {
    // access authorize header to validate request
    const token = req.cookies.jwt;

    // retrive the user details fo the logged in user
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication Failed!" });
  }
}

export function localVariables(req, res, next) {
  req.app.locals = {
    OTP: null,
    resetSession: false,
  };
  next();
}

// adminMiddleware.js

export function adminMiddleware(req, res, next) {
  try {
    // Check if session exists and data is available
    if (!req.session || !req.session.data) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No active session found" });
    }

    if (req.session.data.role !== "DooAdmin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // User is admin, allow access
    next();
  } catch (error) {
    console.error("Error occured:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Middleware to protect routes based on user role
export function authorize(roles) {
  return (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Check if user's role allows access to the route
      if (!roles.includes(decoded.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Pass user ID and role to the request object for further processing
      req.userId = decoded.userId;
      req.userRole = decoded.role;

      // Move to the next middleware or route handler
      next();
    });
  };
}

// Middleware to check if the user is logged in
export function isLoggedIn(req, res, next) {
  if (req.session && req.session.data && req.session.data._id) {
    // User is logged in

    next(); // Continue to the next middleware or route handler
  } else {
    // User is not logged in
    console.log(req.session);
    res.status(401).json({ error: "Unauthorized: Please log in first" });
  }
}

// Middleware to protect routes based on user role
export function authMiddleware() {
  return (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Pass user ID and role to the request object for further processing
      req.userId = decoded.userId;
      req.userRole = decoded.role;

      // Move to the next middleware or route handler
      next();
    });
  };
}

export function checkPermissions(requiredPermissions) {
  return async (req, res, next) => {
    try {
      const userId = req.userId; // Assuming user ID is stored in req.user
      const user = await User.findById(userId).populate("roleId");

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const role = await Role.findById(user.role_id);
      if (!role) {
        return res.status(401).json({ message: "Role not found" });
      }

      const userPermissions = role.permissions;

      const hasPermission = requiredPermissions.every((permission) =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return res
          .status(403)
          .json({ message: "Access denied: insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Error checking permissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}
