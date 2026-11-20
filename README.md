# WedPlan Server

Backend REST API for WedPlan built with **Express.js**, **MongoDB**, **Better Auth**, **JWT (`jose`)**, and **Stripe**.

## Repository Link
[https://github.com/Turzo007se/wedplan-server](https://github.com/Turzo007se/wedplan-server)

[Live site](https://wedplan-client-amber.vercel.app) ? [API health check](https://wedplan-server-zmdl.onrender.com/api/health)

## Features
- Better Auth authentication with MongoDB adapter and JWT issuance.
- Server-side role-based authorization middleware (`protect`, `roles('admin')`, `roles('vendor')`, `roles('customer')`).
- Input validation and ownership checks on all mutating service and booking endpoints.
- Vendor service authoring with free tier enforcement (maximum 3 active services without Premium).
- Customer booking request APIs, status changes, and customer metrics computation.
- Admin APIs for user search, user details, account blocking/unblocking, service status approval/rejection, and transaction logs.
- Stripe Checkout integration and secure webhook processing (`/api/webhooks/stripe`).
- Multipart file upload handler for ImgBB hosting.

## Setup & Running Locally
```bash
npm install
npm run seed-demo       # Populates demo vendors and 6 approved services
npm run promote-admin   # Grants admin permissions to ADMIN_EMAIL
npm run dev             # Starts Express server at http://localhost:4000
```

## Environment Variables
Configured in `.env`:
- `PORT`: Server port (default: `4000`)
- `CLIENT_URL`: Client URL for CORS (default: `http://localhost:3000`)
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB`: MongoDB database name (`wedplan`)
- `BETTER_AUTH_SECRET`: Secret key for Better Auth (minimum 32 characters)
- `BETTER_AUTH_URL`: Auth base URL (`http://localhost:4000`)
- `GOOGLE_CLIENT_ID`: Optional Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Optional Google OAuth Client Secret
- `STRIPE_SECRET_KEY`: Stripe secret key (`sk_test_...`)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret (`whsec_...`)
- `STRIPE_PRICE_ID`: Stripe recurring subscription price ID
- `IMGBB_API_KEY`: ImgBB API key
- `ADMIN_EMAIL`: Email to grant admin rights (defaults to `admin@wedplan.com`)

## Evaluator test instructions

1. Open the [live WedPlan site](https://wedplan-client-amber.vercel.app), choose **Sign Up**, and register a new account with the **Vendor** role.
2. In **Dashboard > Subscription**, choose **Upgrade to Premium**.
3. Confirm Stripe Checkout displays **Sandbox** or **Test mode**. Use Stripe's test card `4242 4242 4242 4242`, a future expiry date, and any three-digit CVC. If Checkout asks for a US ZIP code, use `10001`.
4. After payment, wait for WedPlan to show **Premium activated**. Open **Dashboard > Subscription** to confirm the vendor is on Premium. An evaluator signed in as admin can also confirm the payment in **Dashboard > Transactions**.

Share the evaluation admin credentials privately through the submission form.
