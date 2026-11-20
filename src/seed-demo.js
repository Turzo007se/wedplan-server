import 'dotenv/config';
import {MongoClient} from 'mongodb';

const emails=[process.env.DEMO_VENDOR_ONE_EMAIL,process.env.DEMO_VENDOR_TWO_EMAIL].filter(Boolean).map(x=>x.toLowerCase());
if(!process.env.MONGODB_URI||emails.length!==2){console.error('Set MONGODB_URI and DEMO_VENDOR_ONE_EMAIL plus DEMO_VENDOR_TWO_EMAIL for two registered vendor accounts.');process.exit(1)}
const client=new MongoClient(process.env.MONGODB_URI);
const samples=[
  {email:emails[0],serviceName:'The Garden House',category:'Wedding Venues',description:'An intimate garden venue with warm natural light, elegant dining spaces, and room for the people closest to you.',price:1800,location:'Gulshan, Dhaka',images:['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=85']},
  {email:emails[0],serviceName:'Petal & Pine Florals',category:'Decoration & Florist',description:'Seasonal bouquets and thoughtful floral styling designed around your palette and favorite blooms.',price:420,location:'Banani, Dhaka',images:['https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1400&q=85']},
  {email:emails[0],serviceName:'Golden Hour Studio',category:'Photography & Videography',description:'Candid wedding photography that keeps the little in-between moments as beautiful as the big ones.',price:650,location:'Dhaka',images:['https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85']},
  {email:emails[1],serviceName:'Gather & Graze',category:'Catering Services',description:'A generous, seasonal menu with beautifully presented dishes for celebrations large and small.',price:28,location:'Dhanmondi, Dhaka',images:['https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=85']},
  {email:emails[1],serviceName:'Soft Glow Beauty',category:'Makeup & Styling',description:'Bridal makeup and hair styling with a calm, personal trial and a look that still feels like you.',price:300,location:'Uttara, Dhaka',images:['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=85']},
  {email:emails[1],serviceName:'Heirloom Atelier',category:'Wedding Fashion',description:'Made-to-measure wedding looks, thoughtful fittings, and finishing details for your celebration.',price:900,location:'Chattogram',images:['https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=1400&q=85']},
];
try{
  await client.connect();const db=client.db(process.env.MONGODB_DB||'wedplan');const users=db.collection('users'),services=db.collection('services');
  const vendorIds=new Map();for(const email of emails){const user=await users.findOne({email,role:'vendor'});if(!user)throw new Error(`Vendor account not found: ${email}`);vendorIds.set(email,user._id)}
  for(const sample of samples){const {email,...fields}=sample;await services.updateOne({vendorId:vendorIds.get(email),serviceName:fields.serviceName},{$setOnInsert:{...fields,vendorId:vendorIds.get(email),status:'approved',availability:'active',createdAt:new Date()}},{upsert:true})}
  console.log('Demo services are ready. Each registered demo vendor has three approved active services.');
}catch(e){console.error(e.message);process.exitCode=1}finally{await client.close()}
