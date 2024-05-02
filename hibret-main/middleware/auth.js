import jwt from 'jsonwebtoken';

/** auth middleware */
export default async function Auth(req, res, next){
    try {
        
        // access authorize header to validate request
        const token = req.headers.authorization.split(" ")[1];

        // retrive the user details fo the logged in user
        const decodedToken =  jwt.verify(token, process.env.JWT_SECRET);

        req.user = decodedToken;
        next()

    } catch (error) {
        res.status(401).json({ error : "Authentication Failed!"})
    }
}

export function localVariables(req, res, next){
    req.app.locals = {
        OTP : null,
        resetSession : false
    }
    next()
}


// adminMiddleware.js

export function adminMiddleware(req, res, next) {
    try {
      // Check if session exists and data is available
      if (!req.session || !req.session.data) {
        return res.status(401).json({ error: "Unauthorized: No active session found" });
      }
  
      if (req.session.data.role !== 'Admin') {
        return res.status(403).json({ error: "Forbidden" });
      }
  
      // User is admin, allow access
      next();
    } catch (error) {
      console.error('Error occured:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  


// Middleware to protect routes based on user role
export function authorize (roles) {
    return (req, res, next) => {
      const token = req.headers.authorization;
  
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
  };


  // Middleware to check if the user is logged in
export function isLoggedIn(req, res, next) {
  if (req.session && req.session.data && req.session.data._id) {
      // User is logged in
      next(); // Continue to the next middleware or route handler
  } else {
      // User is not logged in
      res.status(401).json({ error: "Unauthorized: Please log in first" });
  }
}
