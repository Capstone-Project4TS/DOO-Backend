import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connect from './db/conn.js';
import router from './routes/route.js';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from "express-session";
import passport from "passport";
import  initPassportJS from "./startup/passport.js";
import  initCORS  from "./startup/cors.js";
import MongoDBSessionStore from 'connect-mongodb-session';

const app = express();
/** middlewares */


dotenv.config();
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(morgan('tiny'));
app.disable('x-powered-by')
initPassportJS();
initCORS(app);
/** api routes */
app.use('/api', router)


// Middleware to initialize session
app.use(session({
  secret: process.env.SESSION_KEY, // Secret key used to sign the session ID cookie
  resave: false,
  saveUninitialized: false,
  cookie: {
      maxAge: 3600000, // Session expiry time (in milliseconds), e.g., 1 hour
      httpOnly: true, // Cookie accessible only through HTTP(S) requests, not client-side scripts
  }
}));

  app.use(
    cors({
      origin: [`https://${process.env.HOST}`, `http://${process.env.HOST}`, `${process.env.HOST}`],
      methods: ["GET", "POST", "PUT", "OPTIONS", "DELETE"],
      credentials: true, // enable set cookie
    })
  );
  app.use(passport.session());
/** start server only when we have valid connection */
connect().then(() => {
    try {
        app.listen(process.env.PORT, () => {
            console.log(`Server connected to http://localhost:${process.env.PORT}`);  

        })
    } catch (error) {
        console.log('Cannot connect to the server')
       
    }
}).catch(error => {
    console.log("Invalid database connection...!");
    console.log(process.env.ATLAS_URI)

})

