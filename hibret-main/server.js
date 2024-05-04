import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connect from './config/conn.js';
import router from './routes/route.js';
import documentRoutes from './routes/document.routes.js';
import documentTemplateRoutes from './routes/documentTemplate.routes.js'
import documentCategoryRoutes from './routes/documentCategory.routes.js'
import subCategoryRoutes from './routes/subCategory.routes.js'
import folderRoutes from './routes/folder.routes.js'
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from "express-session";
import passport from "passport";
import  initPassportJS from "./startup/passport.js";
import  initCORS  from "./startup/cors.js";
import MongoStore from 'connect-mongo';

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

// Middleware to initialize session
app.use(session({
  secret: process.env.SESSION_KEY, // Secret key used to sign the session ID cookie
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store:  MongoStore.create({ 
    mongoUrl: process.env.ATLAS_URI, // MongoDB connection URL
    collectionName: 'sessions', // Name of the collection to store sessions
    ttl: 60 * 60, // Session expiration time in seconds (e.g., 1 day)
  }),
  cookie: {
      maxAge: 3600000, // Session expiry time (in milliseconds), e.g., 1 hour
      httpOnly: true, // Cookie accessible only through HTTP(S) requests, not client-side scripts
      secure: false,
    }
}));

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

/** api routes */
app.use('/api', router)
app.use('/documents', documentRoutes);
//app.use('/documentTemplate', documentTemplateRoutes)
app.use('/admin/category', documentCategoryRoutes)
app.use('/admin/subCategory', subCategoryRoutes)
app.use('/folder', folderRoutes)
