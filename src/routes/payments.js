import express from 'express';
import Stripe from 'stripe';
import {ObjectId} from 'mongodb';
import {users,transactions,protect,roles} from '../context.js';
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
        const existing=await transactions.findOne({stripeSessionId:session.id});
        if(!existing)await transactions.insertOne({vendorId,plan:'premium',amount:session.amount_total||0,currency:session.currency||'usd',stripeSessionId:session.id,stripeSubscriptionId:session.subscription||null,status:'paid',createdAt:new Date()});
        await users.updateOne({_id:new ObjectId(vendorId),role:'vendor'},{$set:{subscriptionPlan:'premium',subscriptionExpiresAt:null,stripeSubscriptionId:session.subscription||null}});
      }
    }else if(['customer.subscription.created','customer.subscription.updated'].includes(event.type)){
      const sub=event.data.object;const vendorId=sub.metadata?.vendorId;const active=['active','trialing'].includes(sub.status);
      if(vendorId&&ObjectId.isValid(vendorId))await users.updateOne({_id:new ObjectId(vendorId),role:'vendor'},{$set:{subscriptionPlan:active?'premium':'free',subscriptionExpiresAt:active?new Date(sub.current_period_end*1000):null,stripeSubscriptionId:active?sub.id:null}});
    }else if(event.type==='customer.subscription.deleted'){
      const sub=event.data.object;await users.updateOne({stripeSubscriptionId:sub.id},{$set:{subscriptionPlan:'free',subscriptionExpiresAt:null,stripeSubscriptionId:null}});
    }
    res.json({received:true});
  }catch(e){console.error('Stripe webhook verification failed',e.message);res.status(400).send('Invalid webhook signature');}
});
}
export function mountPaymentRoutes(app){
app.post('/api/payments/checkout',protect,roles('vendor'),async(req,res)=>{try{if(req.user.subscriptionPlan==='premium')return res.status(409).json({message:'Your vendor account already has Premium.'});if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_PRICE_ID)return res.status(503).json({message:'Payments are not configured yet.'});const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const session=await stripe.checkout.sessions.create({mode:'subscription',line_items:[{price:process.env.STRIPE_PRICE_ID,quantity:1}],success_url:`${process.env.CLIENT_URL}/payment/success`,cancel_url:`${process.env.CLIENT_URL}/payment/cancel`,client_reference_id:req.user._id.toString(),metadata:{vendorId:req.user._id.toString()},subscription_data:{metadata:{vendorId:req.user._id.toString()}},customer_email:req.user.email});res.json({url:session.url});}catch(e){console.error(e);res.status(500).json({message:'Unable to start checkout.'});}});
app.post('/api/payments/cancel',protect,roles('vendor'),async(req,res)=>{try{if(!process.env.STRIPE_SECRET_KEY)return res.status(503).json({message:'Payments are not configured yet.'});if(req.user.subscriptionPlan!=='premium'||!req.user.stripeSubscriptionId)return res.status(409).json({message:'No active Premium renewal was found.'});const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const subscription=await stripe.subscriptions.update(req.user.stripeSubscriptionId,{cancel_at_period_end:true});res.json({message:'Renewal cancelled. Premium stays active until the end of the current period.',cancelAt:subscription.cancel_at?new Date(subscription.cancel_at*1000):null});}catch(e){console.error(e);res.status(500).json({message:'Unable to cancel renewal.'});}});
}
