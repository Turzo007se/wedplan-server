import 'dotenv/config';
import {MongoClient,ObjectId} from 'mongodb';

if(!process.env.MONGODB_URI){
  console.error('Please set MONGODB_URI in your environment or .env file.');
  process.exit(1);
}

const v1Email=(process.env.DEMO_VENDOR_ONE_EMAIL||'vendor1@wedplan.example').toLowerCase();
const v2Email=(process.env.DEMO_VENDOR_TWO_EMAIL||'vendor2@wedplan.example').toLowerCase();

const client=new MongoClient(process.env.MONGODB_URI);
const samples=[
  {email:v1Email,serviceName:'The Grand Blossom Garden',category:'Wedding Venues',description:'An intimate garden venue with warm natural light, elegant dining pavilions, and room for up to 350 guests.',price:1800,location:'Gulshan, Dhaka',images:['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=85']},
  {email:v1Email,serviceName:'Petal & Pine Floral Design',category:'Decoration & Florist',description:'Seasonal bouquets, fairy lights, and bespoke floral backdrops designed around your chosen palette and bridal theme.',price:420,location:'Banani, Dhaka',images:['https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1400&q=85']},
  {email:v1Email,serviceName:'Golden Hour Wedding Cinematography',category:'Photography & Videography',description:'Candid, high-definition wedding photography and 4K cinematic highlights capturing authentic joyful moments.',price:650,location:'Dhaka',images:['https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85']},
  {email:v2Email,serviceName:'Royal Feast Catering',category:'Catering Services',description:'A generous gourmet menu featuring traditional delicacies, live food stations, and artisanal desserts.',price:28,location:'Dhanmondi, Dhaka',images:['https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=85']},
  {email:v2Email,serviceName:'Radiant Glow Bridal Studio',category:'Makeup & Styling',description:'Signature bridal makeup, bespoke hairstyling, and relaxing pre-wedding trials tailored to enhance your natural beauty.',price:300,location:'Uttara, Dhaka',images:['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=85']},
  {email:v2Email,serviceName:'Elegance Couture Bridal Fashion',category:'Wedding Fashion',description:'Handcrafted bridal sarees, lehengas, sherwanis, and bespoke accessories with master craftsmanship and custom fitting.',price:900,location:'Chattogram',images:['https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1400&q=85','https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=1400&q=85']},
];

try{
  await client.connect();
  const db=client.db(process.env.MONGODB_DB||'wedplan');
  const users=db.collection('users'), services=db.collection('services');

  // Upsert demo vendors if needed
  const vendors = [
    { email: v1Email, name: 'Heritage Blooms & Spaces', businessName: 'Heritage Celebrations', role: 'vendor', subscriptionPlan: 'free', isBlocked: false, createdAt: new Date() },
    { email: v2Email, name: 'Royal Elegance Styling', businessName: 'Royal Elegance Co.', role: 'vendor', subscriptionPlan: 'free', isBlocked: false, createdAt: new Date() }
  ];

  const vendorIds = new Map();
  for(const v of vendors){
    let existing = await users.findOne({ email: v.email });
    if(!existing){
      const res = await users.insertOne(v);
      vendorIds.set(v.email, res.insertedId);
    } else {
      await users.updateOne({ _id: existing._id }, { $set: { role: 'vendor', isBlocked: false } });
      vendorIds.set(v.email, existing._id);
    }
  }

  for(const sample of samples){
    const {email, ...fields} = sample;
    const vendorId = vendorIds.get(email);
    await services.updateOne(
      { serviceName: fields.serviceName },
      { $set: { ...fields, vendorId, status: 'approved', availability: 'active', updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }

  console.log('Demo vendors and 6 approved services across all categories are ready.');
}catch(e){
  console.error('Seed failed:', e.message);
  process.exitCode=1;
}finally{
  await client.close();
}
