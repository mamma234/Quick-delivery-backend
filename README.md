# Quick Delivery Backend

Zomato-style delivery backend with:
- User registration/login
- Browse restaurants within 10km
- Place orders, assign riders, track orders
- Stripe payment integration (test-ready)
- Dockerized and cloud-ready

## 1. Setup

- Copy `.env.example` to `.env` and fill in your actual MongoDB/Stripe keys and a JWT secret.

## 2. Running Locally

```
npm install
npm start
```

## 3. Running with Docker

```
docker build -t quick-delivery-backend .
docker run --env-file .env -p 5000:5000 quick-delivery-backend
```

## 4. Seed Sample Data

Import sample restaurants:
```
mongoimport --uri <YOUR_MONGODB_URI> --collection restaurants --file sampleRestaurants.json --jsonArray
```

Add some riders in Mongo shell:
```
db.riders.insertMany([
  { name: "Rider1", location: { type: "Point", coordinates: [77.5946, 12.9716] }, available: true },
  { name: "Rider2", location: { type: "Point", coordinates: [77.5947, 12.9718] }, available: true }
])
```

## 5. Deploy on Render

- Connect this repo as a **Web Service**.
- Set environment variables: `MONGODB_URI`, `STRIPE_SECRET_KEY`, `JWT_SECRET`.
- Build command: `npm install`
- Start command: `node index.js`
- Expose port **5000**.

---
