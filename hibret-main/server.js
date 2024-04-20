import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connect from './db/conn.js';
// import router from './routes/route.js';
import dotenv from 'dotenv';
const app = express();

/** middlewares */

dotenv.config();
app.use(express.json());
app.use(cors());
app.use(morgan('tiny'));
app.disable('x-powered-by'); 


/** api routes */
// app.use('/api', router)

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

