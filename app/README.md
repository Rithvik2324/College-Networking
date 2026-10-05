# IntentLink app

The Next.js app uses MongoDB Atlas through the official MongoDB Node.js driver. Copy `.env.example` to `.env.local`, then set `AUTH_SECRET` and `MONGODB_URI`. Keep `.env.local` out of version control.

The Atlas URI must use a database user and password, point to the Atlas cluster hostname, and name the `college_platform` database. In Atlas, allow network access from the deployment that will run the app. For local development, allow your current IP address.

Run `npm install`, `npm run db:check`, and `npm run dev` from this directory. The first app write creates its MongoDB collection and indexes automatically. `npm run build` builds the Next.js app without changing database contents.

The current MongoDB store keeps the app's existing numeric record IDs and collection interface. The old Firebase and Supabase adapters are no longer used. Existing cloud data has not been copied automatically; this setup starts writing to the Atlas database once the connection succeeds.
