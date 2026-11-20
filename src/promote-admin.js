import 'dotenv/config';
import {MongoClient} from 'mongodb';

const adminEmail = (process.env.ADMIN_EMAIL || 'admin@wedplan.com').toLowerCase();
if(!process.env.MONGODB_URI){
  console.error('Please set MONGODB_URI in your environment or .env file.');
  process.exit(1);
}

const client=new MongoClient(process.env.MONGODB_URI);
try{
  await client.connect();
  const db=client.db(process.env.MONGODB_DB||'wedplan');
  const result=await db.collection('users').updateOne(
    {email:adminEmail},
    { $set:{role:'admin',isBlocked:false,name: 'WedPlan Administrator', updatedAt:new Date()} },
    { upsert: false }
  );
  if(!result.matchedCount){
    console.log(`Account ${adminEmail} not yet registered. You can register it from the Sign Up page first, or create it directly.`);
  } else {
    console.log(`Successfully granted admin privileges to ${adminEmail}.`);
  }
}catch(e){
  console.error('Promote admin error:', e.message);
  process.exitCode=1;
}finally{
  await client.close();
}
