import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {auth, users} from './context.js';
import {toNodeHandler} from 'better-auth/node';
import {mountWebhooks,mountPaymentRoutes} from './routes/payments.js';
import {mountProfileRoutes} from './routes/profile.js';
import {mountServiceRoutes} from './routes/services.js';
import {mountBookingRoutes} from './routes/bookings.js';
import {mountAdminRoutes} from './routes/admin.js';
const app=express();
const allowedOrigins=(process.env.CLIENT_URL||'http://localhost:3000').split(',').map(o=>o.trim());
app.use(cors({origin:(origin,cb)=>{if(!origin||allowedOrigins.some(o=>origin===o||origin.endsWith('.vercel.app')))cb(null,true);else cb(new Error('Not allowed by CORS'));},credentials:true}));
mountWebhooks(app);
app.all('/api/auth/*',toNodeHandler(auth));
app.use(express.json({limit:'1mb'}));
app.get('/api/health',(req,res)=>res.json({ok:true}));
mountProfileRoutes(app);
mountServiceRoutes(app);
mountBookingRoutes(app);
mountPaymentRoutes(app);
mountAdminRoutes(app);
app.use((req,res)=>res.status(404).json({message:'That API route does not exist.'}));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({message:'Unexpected server error.'});});
const port=Number(process.env.PORT)||4000;
app.listen(port,async()=>{
  console.log('WedPlan API listening on '+port);
  // Auto-promote ADMIN_EMAIL to admin role on every startup
  if(process.env.ADMIN_EMAIL){
    try{
      const result=await users.updateOne({email:process.env.ADMIN_EMAIL},{$set:{role:'admin'}});
      if(result.modifiedCount>0) console.log('✅ Promoted '+process.env.ADMIN_EMAIL+' to admin');
      else if(result.matchedCount>0) console.log('ℹ️ Admin already set: '+process.env.ADMIN_EMAIL);
      else console.log('⚠️ Admin email not found yet (register first): '+process.env.ADMIN_EMAIL);
    }catch(e){console.error('Admin promote error:',e.message);}
  }
});
