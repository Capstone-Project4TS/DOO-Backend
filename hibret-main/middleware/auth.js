import jwt from 'jsonwebtoken';
import SessionModel from '../models/session.model.js';

/** auth middleware */
export default async function Auth(req, res, next){
    try {
        
        // access authorize header to validate request
        const token = req.headers.authorization.split(" ")[1];

        // retrive the user details fo the logged in user
        const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);

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
    if (req.session.role=='Admin') {
        // User is admin, allow access
        next();
    } else {
        // User is not admin, deny access
        return res.status(403).json({ error: "Forbidden" });
    }
}

// Middleware to update last login date
export function updateLastLogin(req, res, next) {
    if (req.user) {
        req.user.lastLoginDate = new Date();
        req.user.save();
    }
    next();
}

// Middleware to protect routes
export function authenticateSession(req, res, next) {
    const sessionId = req.cookies.sessionId;

    if (!sessionId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    SessionModel.findOne({ sessionId }, (err, session) => {
        if (err || !session) {
            return res.status(401).json({ message: 'Session expired or invalid' });
        }

        // Optionally, you can check additional conditions like user agent, IP address, etc.
        
        req.session = session;
        next();
    });
}
