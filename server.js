const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = path.join(__dirname, 'finance.db');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
  initDatabase();
});

function defaultPayload() {
  return {
    version: 2,
    settings: {
      currency: 'K',
      savingsRateTarget: 0.20,
      emergencyFundMonths: 6,
      budgetAlertThreshold: 0.90,
      lowCashFloor: 2000,
      nonEssentialCap: 0.15,
      debtToIncomeThreshold: 0.30,
      openingCash: 0,
      healthWeights: { cashflow: 25, savings: 20, debt: 25, discipline: 15, emergency: 15 },
    },
    categories: {},
    transactions: [],
    debts: [],
    budget: {},
    goals: [],
    recurring: [],
    sinkingFunds: [],
    accounts: []
  };
}

function initDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS app_data (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

async function loadFromSupabase() {
  const { data, error } = await supabase
    .from('app_data')
    .select('payload, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !data.payload) {
    return defaultPayload();
  }

  return typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
}

async function saveToSupabase(payload) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('app_data')
    .upsert({ id: 1, payload: JSON.stringify(payload), updated_at: now }, { onConflict: 'id' });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true, updated_at: now };
}

function loadFromSqlite() {
  return new Promise((resolve, reject) => {
    db.get('SELECT payload FROM app_data WHERE id = 1', (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(defaultPayload());
      try {
        resolve(JSON.parse(row.payload));
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

function saveToSqlite(payload) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    const json = JSON.stringify(payload);
    db.run(
      `INSERT INTO app_data (id, payload, updated_at)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      [json, now],
      function (err) {
        if (err) return reject(err);
        resolve({ ok: true, updated_at: now });
      }
    );
  });
}

app.get('/api/health', async (_, res) => {
  res.json({ ok: true, message: 'FinanceOS API is running', mode: supabase ? 'supabase' : 'sqlite' });
});

app.get('/api/data', async (_, res) => {
  try {
    const payload = supabase ? await loadFromSupabase() : await loadFromSqlite();
    res.json(payload);
  } catch (error) {
    console.error('Load error:', error.message);
    res.status(500).json({ error: 'Could not load data' });
  }
});

app.post('/api/data', async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Payload must be an object' });
  }

  try {
    const result = supabase ? await saveToSupabase(payload) : await saveToSqlite(payload);
    res.json(result);
  } catch (error) {
    console.error('Save error:', error.message);
    res.status(500).json({ error: 'Could not save data' });
  }
});

app.get('*', (req, res) => {
  const isApi = req.path.startsWith('/api/');
  if (isApi) {
    return res.status(404).json({ error: 'Not found' });
  }

  const indexPath = path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`FinanceOS server running at http://localhost:${PORT}`);
  if (supabase) {
    console.log('Configured for Supabase public deployment.');
  } else {
    console.log('Using local SQLite fallback. Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for public deployment.');
  }
});
