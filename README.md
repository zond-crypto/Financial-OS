# FinanceOS — Personal Financial Management PWA

A installable, offline-capable web app version of your financial workbook —
Dashboard, Transactions, Budget vs Actual, Debt tracker, Savings goals,
Cash Flow, and Net Worth. Built with plain HTML/CSS/JS (no build step, no
external dependencies), so it's small, fast, and works without internet
once installed.

Your data is stored **only in your browser** (localStorage) — nothing is
sent to any server. Use **Settings → Export Backup** regularly, especially
before clearing browser data or switching devices.

## Try it locally right now

You cannot just double-click `index.html` — browsers block service workers
(the thing that makes it installable/offline) on the `file://` protocol.
You need to serve the folder over `http://` or `https://`. Easiest options:

**Option A — Python (already on most Macs/Linux, and Windows if installed):**
```
cd finance-pwa
python3 -m http.server 8000
```
Then open **http://localhost:8000** in Chrome, Edge, or Safari.

**Option B — Node:**
```
cd finance-pwa
npx serve .
```

Once it's open, look for an **install icon in the address bar** (Chrome/Edge)
or use **Share → Add to Home Screen** (Safari/iOS), or the **"Install App"**
button in the sidebar. That installs it as a real app icon on your device —
it'll then open in its own window and work fully offline.

## Deploy it for free so you can use it from your phone anywhere

Any static host works since this is just HTML/CSS/JS. Two easy, free options:

- **Netlify Drop** — go to https://app.netlify.com/drop and drag the whole
  `finance-pwa` folder onto the page. You'll get a live HTTPS URL in seconds.
- **GitHub Pages** — push this folder to a GitHub repo, then enable Pages
  in the repo's Settings → Pages, pointing at the root of the branch.

Once it's on HTTPS, open the URL on your phone and install it from there —
your data stays local to whichever device/browser you use it on (it does
not sync between devices; use Export/Import Backup to move data between
devices manually).

## What's included

- **Dashboard** — KPIs, Financial Health Score (0–100), forecast, alerts,
  a **Next 30 Days** command centre (upcoming obligations vs cash on hand),
  income-vs-outflow and net-worth charts
- **Transactions** — full add/edit/delete, filter by month/type, CSV export,
  proper **Transfer** support (From/To account, never counted as income or
  expense)
- **Budget** — budget vs actual by category, inline editing, status colors
- **Cash Flow** — month-by-month beginning/ending cash reconciliation
- **Debt** — creditor register with opening balance, interest, Avalanche/
  Snowball prioritisation, payoff tracking
- **Savings** — goals with progress bars and required-monthly-contribution;
  Emergency Fund target auto-calculates from your average essential
  spending and offers to sync when it drifts
- **Sinking Funds** — set aside a fixed amount monthly for predictable but
  irregular costs (vehicle upkeep, insurance, education, medical) so they
  never blow up a month's budget
- **Accounts** — reconcile each account's book balance (derived from your
  transactions) against its real-world balance, and flags mismatches
- **Net Worth** — assets minus liabilities, tracked monthly, with trend chart
- **Settings** — currency, targets/thresholds, category management, JSON
  backup/restore, full data reset

The app ships pre-loaded with the same July–December transaction history
from your original workbook, so it's immediately useful — edit or delete
anything you don't need.

## Notes on the Debt tracker

Just like in the corrected workbook, each creditor's **Original/Opening
Balance** is a blank input by design — the app won't invent a number for
you. Until you fill it in, Total Debt and Net Worth show a clear "enter
balance" state rather than silently showing K0. Fill in opening balances on
the Debt page and everything downstream (Total Debt, Debt-to-Income, Net
Worth trend) updates automatically.
