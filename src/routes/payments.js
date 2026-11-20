import express from 'express';
import Stripe from 'stripe';
import {ObjectId} from 'mongodb';
import {users,transactions,services,protect,roles} from '../context.js';
async function downgradeVendor(subscriptionId){
  const vendor=await users.findOneAndUpdate({stripeSubscriptionId:subscriptionId},{$set:{subscriptionPlan:'free',subscriptionExpiresAt:null}},{returnDocument:'after'});
  if(!vendor)return;
  const extra=await services.find({vendorId:vendor._id,status:'approved',availability:'active'}).sort({createdAt:1,_id:1}).skip(3).project({_id:1}).toArray();
  if(extra.length)await services.updateMany({_id:{$in:extra.map(service=>service._id)}},{$set:{availability:'inactive'}});
}
export function mountWebhooks(app){
// Stripe signs the raw payload; this route must run before JSON parsing.
app.post('/api/webhooks/stripe',express.raw({type:'application/json'}),async(req,res)=>{
  try{
    if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return res.status(503).send('Payments are not configured');
    const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
    const event=stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);
    if(event.type==='checkout.session.completed'){
      const session=event.data.object;const vendorId=session.metadata?.vendorId;
      if(session.mode==='subscription'&&['paid','no_payment_required'].includes(session.payment_status)&&vendorId&&ObjectId.isValid(vendorId)){
        await transactions.updateOne({stripeSessionId:session.id},{$setOnInsert:{vendorId,plan:'premium',amount:session.amount_total||0,currency:session.currency||'usd',stripeSubscriptionId:session.subscription||null,status:'paid',createdAt:new Date()}},{upsert:true});
        const subscription=await stripe.subscriptions.retrieve(session.subscription);
        if(['active','trialing'].includes(subscription.status)){
          const periodEnd=subscription.current_period_end??subscription.items?.data[0]?.current_period_end;
          await users.updateOne({_id:new ObjectId(vendorId),role:'vendor'},{$set:{subscriptionPlan:'premium',subscriptionExpiresAt:periodEnd?new Date(periodEnd*1000):null,stripeSubscriptionId:subscription.id}});
        }
      }
    }else if(['customer.subscription.created','customer.subscription.updated'].includes(event.type)){
      const sub=event.data.object;const vendorId=sub.metadata?.vendorId;const active=['active','trialing'].includes(sub.status);
      if(!active)await downgradeVendor(sub.id);
      else if(vendorId&&ObjectId.isValid(vendorId)){
        const periodEnd=sub.current_period_end??sub.items?.data[0]?.current_period_end;
        await users.updateOne({_id:new ObjectId(vendorId),role:'vendor',stripeSubscriptionId:sub.id},{$set:{subscriptionExpiresAt:periodEnd?new Date(periodEnd*1000):null}});
      }
    }else if(event.type==='customer.subscription.deleted'){
      const sub=event.data.object;await downgradeVendor(sub.id);
    }
    res.json({received:true});
  }catch(e){console.error('Stripe webhook verification failed',e.message);res.status(400).send('Invalid webhook signature');}
});
}
export function mountPaymentRoutes(app){
app.get('/api/payments/confirmation',protect,roles('vendor'),async(req,res,next)=>{
  try{
    const sessionId=req.query.session_id;
    if(typeof sessionId!=='string'||!/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId))return res.status(400).json({message:'Invalid Checkout session.'});
    const transaction=await transactions.findOne({stripeSessionId:sessionId,vendorId:req.user._id.toString(),status:'paid'});
    res.json({confirmed:Boolean(transaction&&req.user.subscriptionPlan==='premium'&&req.user.stripeSubscriptionId===transaction.stripeSubscriptionId)});
  }catch(error){next(error);}
});
app.post('/api/payments/checkout',protect,roles('vendor'),async(req,res)=>{try{if(req.user.subscriptionPlan==='premium')return res.status(409).json({message:'Your vendor account already has Premium.'});if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_PRICE_ID)return res.status(503).json({message:'Payments are not configured yet.'});const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const session=await stripe.checkout.sessions.create({mode:'subscription',line_items:[{price:process.env.STRIPE_PRICE_ID,quantity:1}],success_url:`${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${process.env.CLIENT_URL}/payment/cancel`,client_reference_id:req.user._id.toString(),metadata:{vendorId:req.user._id.toString()},subscription_data:{metadata:{vendorId:req.user._id.toString()}},customer_email:req.user.email});res.json({url:session.url});}catch(e){console.error(e);res.status(500).json({message:'Unable to start checkout.'});}});
app.post('/api/payments/cancel',protect,roles('vendor'),async(req,res)=>{try{if(!process.env.STRIPE_SECRET_KEY)return res.status(503).json({message:'Payments are not configured yet.'});if(req.user.subscriptionPlan!=='premium'||!req.user.stripeSubscriptionId)return res.status(409).json({message:'No active Premium renewal was found.'});const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const subscription=await stripe.subscriptions.update(req.user.stripeSubscriptionId,{cancel_at_period_end:true});res.json({message:'Renewal cancelled. Premium stays active until the end of the current period.',cancelAt:subscription.cancel_at?new Date(subscription.cancel_at*1000):null});}catch(e){console.error(e);res.status(500).json({message:'Unable to cancel renewal.'});}});
}
