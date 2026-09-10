# Free public deployment plan for FinanceOS

This app can be deployed for free in two layers:

1. Frontend static hosting (Netlify or GitHub Pages)
2. Backend API hosting with a free plan (Render or Railway)

## Recommended free setup

### 1) Frontend
Use Netlify Drop for the static UI:
- Go to https://app.netlify.com/drop
- Drag the project folder to the page
- This will deploy the HTML/CSS/JS app

### 2) Backend API
Use Render:
- Create a new Web Service
- Connect this project repo
- Set the build command: `npm install`
- Set the start command: `npm start`
- Add environment variables:
  - `SUPABASE_URL=<your-supabase-url>`
  - `SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>`

If env vars are not set, the app will run with local SQLite as a fallback for local testing.

## Supabase configuration

Create a Supabase project and run this SQL in the SQL editor:

```sql
create table if not exists app_data (
  id integer primary key check (id = 1),
  payload jsonb not null,
  updated_at timestamptz default now()
);
```

Then insert one row if needed:

```sql
insert into app_data (id, payload)
values (1, '{"version":2,"settings":{"currency":"K"},"categories":{},"transactions":[],"debts":[],"budget":{},"goals":[],"recurring":[],"sinkingFunds":[],"accounts":[]}')
on conflict (id) do nothing;
```

## Browser configuration

After deployment, update the frontend so it calls the deployed backend instead of localhost.
For example, in the browser code you can replace:

```js
fetch('/api/data')
```

with:

```js
fetch('https://your-render-app.onrender.com/api/data')
```

or by reading a config variable from a deployed frontend config file.

## Why this is free

- Netlify: free static hosting
- Render: free web service tier
- Supabase: free database tier

These services together are enough to run a basic public version of this app without paying.
