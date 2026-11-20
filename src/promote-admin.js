import 'dotenv/config';
import {MongoClient} from 'mongodb';
if(!process.env.MONGODB_URI||!process.env.ADMIN_EMAIL){console.error('Set MONGODB_URI and ADMIN_EMAIL. The user must already have registered.');process.exit(1)}
const client=new MongoClient(process.env.MONGODB_URI);try{await client.connect();const db=client.db(process.env.MONGODB_DB||'wedplan');const result=await db.collection('users').updateOne({email:process.env.ADMIN_EMAIL.toLowerCase()},{ $set:{role:'admin',isBlocked:false}});if(!result.matchedCount){console.error('No account found for ADMIN_EMAIL. Register that account first, then run this command.');process.exitCode=1}else console.log(`Granted admin role to ${process.env.ADMIN_EMAIL}.`);}finally{await client.close()}
