# Deployment

The assignment requires a relational database, so SplitNest uses hosted PostgreSQL rather than MongoDB Atlas.

## Recommended Architecture

- Frontend: deploy the `frontend/` directory to any static hosting provider.
- Backend: deploy the `backend/` directory to a Node.js hosting provider.
- Database: use any managed PostgreSQL provider and copy its connection string into `DATABASE_URL`.

## Backend Environment Variables

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
JWT_SECRET=replace_with_a_long_random_secret
PORT=5001
CLIENT_URL=https://your-frontend-domain.example
NODE_ENV=production
GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
```

The backend automatically enables PostgreSQL SSL when `NODE_ENV=production`.

## Deployment Commands

Run migrations and seed once against the hosted database:

```powershell
Set-Location backend
npm.cmd install
npm.cmd run migrate
npm.cmd run seed
npm.cmd run db:verify
```

Start command:

```text
npm start
```

## Frontend API URL

Before deploying the frontend, set the API URL in the browser once during testing:

```js
localStorage.setItem("splitnestApiBase", "https://your-backend-domain.example/api");
```

For a production build, replace the default `API_BASE` value at the top of `frontend/app.js` with the deployed backend URL.

Set the same Google web client ID in `frontend/config.js` and the backend `GOOGLE_CLIENT_ID` environment variable. Add the deployed frontend domain to the Google OAuth client's authorized JavaScript origins.

## Why Not MongoDB Atlas?

MongoDB Atlas is a strong deployment platform, but MongoDB is not a relational database. Using it would directly conflict with this assignment's relational-database requirement.
