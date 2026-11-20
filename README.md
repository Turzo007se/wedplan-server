# WedPlan Server

Express API, Better Auth handler, MongoDB business data, and Stripe subscription webhooks.

## Local development

1. Install Node.js 20.9 or newer and run MongoDB.
2. Copy `.env.example` to `.env` and configure MongoDB, Better Auth, and the client URL.
3. Run `npm ci`, then `npm run dev`.
4. Check `GET /api/health`.

Use `npm start` in production. The API defaults to port 4000.

## Environment

See `.env.example`. Set `BETTER_AUTH_SECRET` to a long random secret. Google OAuth, Stripe, and ImgBB credentials must remain server-side. The Stripe webhook URL is `/api/webhooks/stripe`; subscribe it to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.

## Admin provisioning

Create the account through public registration, set its email in `ADMIN_EMAIL`, then run `npm run promote-admin`. Registration only allows customer and vendor roles.

## Local demo data

Create two vendor accounts, set `DEMO_VENDOR_ONE_EMAIL` and `DEMO_VENDOR_TWO_EMAIL`, and run `npm run seed-demo`. This inserts six approved demo services into the existing `services` collection, three per vendor, so the home page has examples without exceeding the Free plan limit. Use only with a development database.

## Data collections

- Better Auth user/session/account data, with role, blocked status, vendor name, and subscription fields on the user record.
- `services`: vendor-owned service listings and review/availability state.
- `bookings`: customer requests with vendor and service references.
- `transactions`: verified Stripe checkout records.

Deploy as a persistent Node service. Set `CLIENT_URL`, `BETTER_AUTH_URL`, and MongoDB network access for production. Point Stripe webhooks to the public HTTPS API URL.
