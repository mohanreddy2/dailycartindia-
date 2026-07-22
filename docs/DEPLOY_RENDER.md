# Deploy DailyCart for free testing

DailyCart is one React app with three routes, not three separate frontend deployments:

- Customer: `https://dailycartindia.com/`
- Vendor: `https://dailycartindia.com/vendor`
- Admin: `https://dailycartindia.com/admin`

The included `render.yaml` creates:

- `dailycart-api`: FastAPI backend
- `dailycart-web`: React static site

## 1. Create a MongoDB Atlas free database

1. Create an Atlas **M0 Free** cluster.
2. Create a database user with a strong password.
3. Add `0.0.0.0/0` to the IP access list for testing. Restrict this to Render's outbound IPs before production.
4. Copy the connection string and replace `<password>` with the database user's URL-encoded password.

The connection string looks like:

```text
mongodb+srv://<username>:<password>@<cluster-url>/dailycart?retryWrites=true&w=majority
```

## 2. Deploy from Render

1. Push this repository to GitHub.
2. In Render, select **New → Blueprint** and choose the GitHub repository.
3. Render detects `render.yaml` and asks for `MONGO_URL` and `REACT_APP_BACKEND_URL`.
4. Set `MONGO_URL` to the Atlas connection string.
5. Deploy the blueprint, then copy the public API URL, for example:

```text
https://dailycart-api.onrender.com
```

6. Set `REACT_APP_BACKEND_URL` on the `dailycart-web` service to that API URL (without `/api`) and redeploy the static site.
7. Copy the static site's public URL and add it to `CORS_ORIGINS` on `dailycart-api`, alongside the two production domains:

```text
https://<your-web>.onrender.com,https://dailycartindia.com,https://www.dailycartindia.com
```

8. Redeploy `dailycart-api`, then verify:

```text
https://<your-api>.onrender.com/api/health
https://<your-web>.onrender.com/
https://<your-web>.onrender.com/vendor
https://<your-web>.onrender.com/admin
```

## 3. Enable Razorpay (online payments)

Checkout and service booking support **Cash on delivery** plus **Razorpay** (UPI / cards / netbanking).

1. In the [Razorpay Dashboard](https://dashboard.razorpay.com/) → **Account & Settings → API Keys**, create **Test** keys first (or Live when ready).
2. On Render → `dailycart-api` → **Environment**, add:

| Key | Value |
| --- | --- |
| `RAZORPAY_KEY_ID` | `rzp_test_...` or `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | matching secret (never commit this) |

3. **Manual Deploy** `dailycart-api`, then **Manual Deploy** `dailycart-web` (so the updated checkout UI is live).
4. Confirm online pay is on:

```text
https://<your-api>.onrender.com/api/payments/methods
```

You should see `"razorpay": true`. On checkout, **Pay online (Razorpay)** appears next to COD.

Test cards (test mode): use Razorpay’s documented test card numbers from their docs. Do not put secrets in GitHub or chat — only in Render env.

## 4. Connect `dailycartindia.com` in Squarespace

1. In Render's `dailycart-web` service, add the custom domains:
   - `dailycartindia.com`
   - `www.dailycartindia.com`
2. Render displays the exact DNS records to add.
3. In Squarespace Domains → `dailycartindia.com` → **DNS Settings**, copy those records exactly.
4. After Render verifies the domain and issues TLS, keep the static-site URL and set `CORS_ORIGINS` on `dailycart-api` to:

```text
https://<your-web>.onrender.com,https://dailycartindia.com,https://www.dailycartindia.com
```

5. Redeploy `dailycart-api`.

## Testing limitations

Render's free web service sleeps after inactivity and can take about a minute to start on the first request. MongoDB Atlas M0 is limited to 512 MB. Both are appropriate for testing, not production.
