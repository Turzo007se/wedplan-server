import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();
import multer from 'multer';
import { MongoClient, ObjectId } from 'mongodb';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { jwt } from 'better-auth/plugins';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const required=['MONGODB_URI','BETTER_AUTH_SECRET'];
for(const key of required) if(!process.env[key]) { console.error(`Missing required environment variable: ${key}`); process.exit(1); }
const client=new MongoClient(process.env.MONGODB_URI); await client.connect();
const db=client.db(process.env.MONGODB_DB||'wedplan');
export const services=db.collection('services'), bookings=db.collection('bookings'), transactions=db.collection('transactions'), users=db.collection('users');
await Promise.all([services.createIndex({vendorId:1}),services.createIndex({status:1,availability:1}),bookings.createIndex({serviceId:1,eventDate:1,customerId:1}),bookings.createIndex({vendorId:1,status:1}),transactions.createIndex({stripeSessionId:1},{unique:true,sparse:true})]);
export const authBase=process.env.BETTER_AUTH_URL||`http://localhost:${process.env.PORT||4000}`; export const auth=betterAuth({baseURL:authBase,secret:process.env.BETTER_AUTH_SECRET, database:mongodbAdapter(db), trustedOrigins:[process.env.CLIENT_URL||'http://localhost:3000'],advanced:{defaultCookieAttributes:{sameSite:process.env.NODE_ENV==='production'?'none':'lax',secure:process.env.NODE_ENV==='production'}},socialProviders:process.env.GOOGLE_CLIENT_ID?{google:{clientId:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET}}:{}, user:{modelName:'users',additionalFields:{role:{type:'string',required:true,defaultValue:'customer',input:true},isBlocked:{type:'boolean',required:true,defaultValue:false,input:false},businessName:{type:'string',required:false,input:false},subscriptionPlan:{type:'string',required:true,defaultValue:'free',input:false},subscriptionExpiresAt:{type:'date',required:false,input:false}}},databaseHooks:{user:{create:{before:async(data)=>({data:{...data,role:data.role==='vendor'?'vendor':'customer',isBlocked:false,subscriptionPlan:'free'}})}}},plugins:[jwt()]});
const jwks=createRemoteJWKSet(new URL('/api/auth/jwks',authBase));
export async function protect(req,res,next){try{const raw=req.headers.authorization?.replace(/^Bearer\s+/i,'');if(!raw)return res.status(401).json({message:'Please sign in to continue.'});const {payload}=await jwtVerify(raw,jwks,{issuer:authBase,audience:authBase});const id=payload.sub;if(!id)return res.status(401).json({message:'Invalid session token.'});const user=await users.findOne({_id:new ObjectId(id)});if(!user)return res.status(401).json({message:'Your account could not be found.'});if(user.isBlocked)return res.status(403).json({message:'This account is currently blocked.'});req.user=user;next();}catch{return res.status(401).json({message:'Your session has expired. Please sign in again.'});}}
export const roles=(...allowed)=>(req,res,next)=>allowed.includes(req.user.role)?next():res.status(403).json({message:'You do not have permission to do that.'});
export const imageUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>cb(null,/^image\/(jpeg|png|webp)$/.test(file.mimetype))});
export const oid=(v)=>ObjectId.isValid(v)?new ObjectId(v):null;
export const publicService=(s)=>({...s,_id:s._id.toString(),vendorId:s.vendorId?.toString()});
