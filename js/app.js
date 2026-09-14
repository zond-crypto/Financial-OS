/* ==========================================================================
   FinanceOS — Personal Financial Management PWA
   Single-file vanilla JS app. All data lives in localStorage on this device.
   ========================================================================== */

/* ---------------------------- Utilities ---------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function currency() {
  return state.data.settings.currency || 'K';
}

function fmtMoney(n, opts = {}) {
  const v = Number(n) || 0;
  const neg = v < 0;
  const abs = Math.abs(v);
  const str = abs.toLocaleString(undefined, { minimumFractionDigits: opts.decimals ?? 0, maximumFractionDigits: opts.decimals ?? 0 });
  return `${neg ? '-' : ''}${currency()}${str}`;
}

function fmtPct(n, decimals = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(decimals)}%`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function monthKey(iso) {
  return (iso || '').slice(0, 7); // YYYY-MM
}

function monthLabel(key) {
  if (!key) return '—';
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function monthLabelShort(key) {
  if (!key) return '—';
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short' });
}

function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toast(msg) {
  const root = $('#toastRoot');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function daysUntil(iso) {
  const target = new Date(iso + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

/* ---------------------------- Constants & Category Architecture ---------------------------- */

const DEFAULT_CATEGORIES = {
  Income: ['Salary', 'Salary Advance', 'Bonus', 'Leave Pay', 'Side Income', 'Business Income', 'Other Income'],
  Essential: ['Housing', 'Food', 'Transport', 'Utilities', 'Education', 'Healthcare', 'Family Support', 'Insurance', 'Vehicle', 'Communication', 'Other Essential'],
  'Non-Essential': ['Entertainment', 'Clothing', 'Social Events', 'Dining Out', 'Gifts', 'Recreation', 'Personal Purchases', 'Other'],
  Debt: ['Loan Repayment', 'Credit Repayment', 'Salary Deduction', 'Informal Debt', 'Finance Company', 'Other Debt'],
};

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Mobile Money', 'Card', 'Salary Deduction'];
const TX_TYPES = ['Income', 'Expense', 'Debt Payment', 'Savings', 'Transfer'];

function getCategories() {
  if (state.data && state.data.categories) return state.data.categories;
  return DEFAULT_CATEGORIES;
}

function classify(category) {
  const cats = getCategories();
  if (cats.Essential && cats.Essential.includes(category)) return 'Essential';
  if (cats['Non-Essential'] && cats['Non-Essential'].includes(category)) return 'Non-Essential';
  if (cats.Income && cats.Income.includes(category)) return 'Income';
  if (cats.Debt && cats.Debt.includes(category)) return 'Debt';
  return 'Other';
}

function categoryOptionsFor(type) {
  const cats = getCategories();
  if (type === 'Income') return cats.Income || DEFAULT_CATEGORIES.Income;
  if (type === 'Debt Payment') return cats.Debt || DEFAULT_CATEGORIES.Debt;
  if (type === 'Savings') return ['Savings Contribution'];
  if (type === 'Transfer') return ['Transfer'];
  return [...(cats.Essential || []), ...(cats['Non-Essential'] || [])];
}

function allAccounts() {
  if (state.data && state.data.accounts && state.data.accounts.length) {
    return state.data.accounts.map(a => a.name);
  }
  return ['Cash', 'Bank Account', 'Mobile Money', 'Savings Account', 'Other'];
}

function allCreditors() {
  if (state.data && state.data.debts && state.data.debts.length) {
    return state.data.debts.map(d => d.creditor);
  }
  return [];
}


/* ---------------------------- Seed data ---------------------------- */
/* Mirrors the July–December transaction history from the source workbook,
   so the app is useful on first load instead of empty. Everything here is
   fully editable / deletable from the Transactions view. */

function seedTransactions() {
  const T = (date, type, category, subcategory, description, amount, account, method, notes) => ({
    id: uid('tx'), date, type, category, subcategory, description: description || subcategory,
    amount, account, method, notes: notes || ''
  });
  return [
    T('2026-07-01', 'Income', 'Salary', 'Salary', 'Monthly salary', 8400, 'Bank Account', 'Bank Transfer'),
    T('2026-07-05', 'Expense', 'Family Support', 'Parents Ndola', '', 1500, 'Cash', 'Cash'),
    T('2026-07-05', 'Expense', 'Housing', 'Home', '', 2000, 'Cash', 'Cash'),
    T('2026-07-05', 'Expense', 'Vehicle', 'Servicing', '', 850, 'Cash', 'Cash'),
    T('2026-07-05', 'Expense', 'Transport', 'Transport to Luanshya', '', 500, 'Cash', 'Cash'),
    T('2026-07-05', 'Expense', 'Food', 'Food Luanshya', '', 600, 'Cash', 'Cash'),
    T('2026-07-05', 'Expense', 'Insurance', 'Insurance & Road Tax & Fitness', '', 740, 'Cash', 'Cash'),
    T('2026-07-05', 'Expense', 'Transport', 'Transport work', '', 600, 'Cash', 'Cash'),
    T('2026-07-10', 'Expense', 'Social Events', 'Boyd Sikanyika', '', 350, 'Cash', 'Cash'),
    T('2026-07-10', 'Expense', 'Clothing', 'Wedding jacket', '', 500, 'Cash', 'Cash'),
    T('2026-07-10', 'Expense', 'Transport', 'Transport to Wedding', '', 500, 'Cash', 'Cash'),
    T('2026-07-10', 'Debt Payment', 'Informal Debt', 'Wizzie matokani', '', 500, 'Cash', 'Cash'),
    T('2026-07-10', 'Debt Payment', 'Informal Debt', 'Esther', '', 300, 'Cash', 'Cash'),
    T('2026-07-10', 'Debt Payment', 'Informal Debt', 'James', '', 100, 'Cash', 'Cash'),

    T('2026-08-01', 'Income', 'Salary', 'Salary', 'Monthly salary', 8400, 'Bank Account', 'Bank Transfer'),
    T('2026-08-01', 'Income', 'Salary Advance', 'Salary Advance', '', 10000, 'Bank Account', 'Bank Transfer'),
    T('2026-08-01', 'Income', 'Leave Pay', 'Leave Pay', '', 2000, 'Bank Account', 'Bank Transfer'),
    T('2026-08-05', 'Expense', 'Family Support', 'Parents Ndola', '', 2000, 'Cash', 'Cash'),
    T('2026-08-05', 'Expense', 'Housing', 'Home', '', 2500, 'Cash', 'Cash'),
    T('2026-08-05', 'Expense', 'Transport', 'Work Transport', '', 1000, 'Cash', 'Cash'),
    T('2026-08-05', 'Expense', 'Vehicle', 'Spare Tyre', '', 700, 'Cash', 'Cash'),
    T('2026-08-05', 'Expense', 'Family Support', 'Leather Square Contribution', '', 500, 'Cash', 'Cash'),
    T('2026-08-10', 'Expense', 'Transport', 'Transport to Chingola', '', 300, 'Cash', 'Cash'),
    T('2026-08-10', 'Expense', 'Vehicle', 'Shocks', '', 1000, 'Cash', 'Cash'),
    T('2026-08-10', 'Expense', 'Education', 'Two Terms School', '', 4400, 'Cash', 'Cash'),
    T('2026-08-10', 'Expense', 'Vehicle', 'Licence', '', 1500, 'Cash', 'Cash'),
    T('2026-08-10', 'Expense', 'Social Events', 'MATEO', '', 700, 'Cash', 'Cash'),
    T('2026-08-10', 'Expense', 'Social Events', 'CEPHAS', '', 500, 'Cash', 'Cash'),
    T('2026-08-10', 'Debt Payment', 'Informal Debt', 'Leather square', '', 500, 'Cash', 'Cash'),
    T('2026-08-10', 'Debt Payment', 'Informal Debt', 'Leather Square Muzenga', '', 400, 'Cash', 'Cash'),
    T('2026-08-10', 'Debt Payment', 'Informal Debt', 'Leather square Titus', '', 400, 'Cash', 'Cash'),
    T('2026-08-10', 'Debt Payment', 'Informal Debt', 'Leather Square Annie', '', 800, 'Cash', 'Cash'),
    T('2026-08-10', 'Debt Payment', 'Finance Company', 'UNITY FINANCE', '', 1000, 'Cash', 'Cash'),

    T('2026-09-01', 'Income', 'Salary', 'Salary', 'Monthly salary', 8400, 'Bank Account', 'Bank Transfer'),
    T('2026-09-01', 'Debt Payment', 'Salary Deduction', 'Salary Deduction', '', 1666, 'Bank Account', 'Salary Deduction'),
    T('2026-09-05', 'Expense', 'Family Support', 'Parents Ndola', '', 1500, 'Cash', 'Cash'),
    T('2026-09-05', 'Expense', 'Housing', 'Home', '', 2500, 'Cash', 'Cash'),
    T('2026-09-05', 'Expense', 'Transport', 'Work Transport', '', 2000, 'Cash', 'Cash'),
    T('2026-09-05', 'Expense', 'Family Support', 'Leather Square Contribution', '', 500, 'Cash', 'Cash'),

    T('2026-10-01', 'Income', 'Salary', 'Salary', 'Monthly salary', 8400, 'Bank Account', 'Bank Transfer'),
    T('2026-10-01', 'Debt Payment', 'Salary Deduction', 'Salary Deduction', '', 1666, 'Bank Account', 'Salary Deduction'),
    T('2026-10-05', 'Expense', 'Family Support', 'Parents Ndola', '', 1500, 'Cash', 'Cash'),
    T('2026-10-05', 'Expense', 'Housing', 'Home', '', 2500, 'Cash', 'Cash'),
    T('2026-10-05', 'Expense', 'Transport', 'Work Transport', '', 2000, 'Cash', 'Cash'),
    T('2026-10-05', 'Expense', 'Family Support', 'Leather Square Contribution', '', 500, 'Cash', 'Cash'),

    T('2026-11-01', 'Income', 'Salary', 'Salary', 'Monthly salary', 8400, 'Bank Account', 'Bank Transfer'),
    T('2026-11-01', 'Debt Payment', 'Salary Deduction', 'Salary Deduction', '', 1666, 'Bank Account', 'Salary Deduction'),
    T('2026-11-05', 'Expense', 'Family Support', 'Parents Ndola', '', 1500, 'Cash', 'Cash'),
    T('2026-11-05', 'Expense', 'Housing', 'Home', '', 2500, 'Cash', 'Cash'),
    T('2026-11-05', 'Expense', 'Transport', 'Work Transport', '', 2000, 'Cash', 'Cash'),
    T('2026-11-05', 'Expense', 'Family Support', 'Leather Square Contribution', '', 500, 'Cash', 'Cash'),

    T('2026-12-01', 'Income', 'Salary', 'Salary', 'Monthly salary', 8400, 'Bank Account', 'Bank Transfer'),
    T('2026-12-01', 'Debt Payment', 'Salary Deduction', 'Salary Deduction', '', 1666, 'Bank Account', 'Salary Deduction'),
    T('2026-12-05', 'Expense', 'Family Support', 'Parents Ndola', '', 1500, 'Cash', 'Cash'),
    T('2026-12-05', 'Expense', 'Housing', 'Home', '', 2500, 'Cash', 'Cash'),
    T('2026-12-05', 'Expense', 'Transport', 'Work Transport', '', 2000, 'Cash', 'Cash'),
    T('2026-12-05', 'Expense', 'Family Support', 'Leather Square Contribution', '', 500, 'Cash', 'Cash'),
  ];
}

function seedDebts() {
  return [
    { id: uid('debt'), creditor: 'Salary Deduction', original: null, interestRate: 0, minPayment: 1666, plannedPayment: 1666, dueDate: '2026-09-01', startDate: '2026-09-01', priority: 'High' },
    { id: uid('debt'), creditor: 'Unity Finance', original: null, interestRate: 0, minPayment: 1000, plannedPayment: 1000, dueDate: '2026-09-01', startDate: '2026-08-10', priority: 'High' },
    { id: uid('debt'), creditor: 'Leather Square (4 obligations)', original: null, interestRate: 0, minPayment: 500, plannedPayment: 500, dueDate: '2026-09-05', startDate: '2026-08-10', priority: 'Medium' },
    { id: uid('debt'), creditor: 'Wizzie', original: null, interestRate: 0, minPayment: 500, plannedPayment: 500, dueDate: '2026-09-05', startDate: '2026-07-10', priority: 'Medium' },
    { id: uid('debt'), creditor: 'Esther', original: null, interestRate: 0, minPayment: 300, plannedPayment: 300, dueDate: '2026-09-05', startDate: '2026-07-10', priority: 'Low' },
    { id: uid('debt'), creditor: 'James', original: null, interestRate: 0, minPayment: 100, plannedPayment: 100, dueDate: '2026-09-05', startDate: '2026-07-10', priority: 'Low' },
  ];
}

function seedBudget() {
  return {
    'Housing': 2500, 'Food': 1000, 'Transport': 1500, 'Utilities': 500, 'Education': 1000,
    'Healthcare': 300, 'Family Support': 1500, 'Insurance': 750, 'Vehicle': 800, 'Communication': 300,
    'Other Essential': 400, 'Entertainment': 300, 'Clothing': 400, 'Social Events': 400,
    'Dining Out': 300, 'Gifts': 200, 'Recreation': 200, 'Personal Purchases': 300, 'Other': 200,
  };
}

function seedGoals() {
  return [
    { id: uid('goal'), name: 'Emergency Fund', target: 39000, current: 0, monthly: 0, targetDate: '2027-06-01' },
  ];
}

function seedSinkingFunds() {
  return [
    { id: uid('sink'), name: 'Vehicle Maintenance', annualNeed: 6000, saved: 0 },
    { id: uid('sink'), name: 'Insurance & Licence', annualNeed: 3000, saved: 0 },
    { id: uid('sink'), name: 'Education', annualNeed: 12000, saved: 0 },
    { id: uid('sink'), name: 'Medical', annualNeed: 3600, saved: 0 },
  ];
}

function seedAccounts() {
  return [
    { id: uid('acct'), name: 'Cash', openingBalance: 0, actualBalance: null },
    { id: uid('acct'), name: 'Bank Account', openingBalance: 0, actualBalance: null },
    { id: uid('acct'), name: 'Mobile Money', openingBalance: 0, actualBalance: null },
    { id: uid('acct'), name: 'Savings Account', openingBalance: 0, actualBalance: null },
  ];
}

function seedRecurring() {
  return [
    { id: uid('rec'), item: 'Salary', type: 'Income', amount: 8400, frequency: 'Monthly', dayOfMonth: 1, category: 'Salary', dueDate: '2026-09-01' },
    { id: uid('rec'), item: 'Home', type: 'Expense', amount: 2500, frequency: 'Monthly', dayOfMonth: 5, category: 'Housing', dueDate: '2026-09-05' },
    { id: uid('rec'), item: 'Parents Ndola', type: 'Expense', amount: 1500, frequency: 'Monthly', dayOfMonth: 5, category: 'Family Support', dueDate: '2026-09-05' },
    { id: uid('rec'), item: 'Work Transport', type: 'Expense', amount: 2000, frequency: 'Monthly', dayOfMonth: 5, category: 'Transport', dueDate: '2026-09-05' },
    { id: uid('rec'), item: 'Leather Square Contribution', type: 'Expense', amount: 500, frequency: 'Monthly', dayOfMonth: 5, category: 'Family Support', dueDate: '2026-09-05' },
    { id: uid('rec'), item: 'Salary Deduction', type: 'Expense', amount: 1666, frequency: 'Monthly', dayOfMonth: 1, category: 'Salary Deduction', dueDate: '2026-09-01' },
  ];
}

function defaultData() {
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
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    transactions: seedTransactions(),
    debts: seedDebts(),
    budget: seedBudget(),
    goals: seedGoals(),
    recurring: seedRecurring(),
    sinkingFunds: seedSinkingFunds(),
    accounts: seedAccounts(),
  };
}

/* ---------------------------- State / persistence ---------------------------- */

const STORAGE_KEY = 'financeos_data_v1';
const API_BASE = window.FINANCEOS_API_BASE || '';

const state = {
  data: null,
  view: 'dashboard',
  selectedMonth: null,
  backendReady: false,
  backendMode: false,
};

function normalizeData(parsed) {
  if (!parsed) return defaultData();
  const defaults = defaultData();
  parsed.settings = {
    ...defaults.settings,
    ...(parsed.settings || {}),
    healthWeights: {
      ...defaults.settings.healthWeights,
      ...((parsed.settings && parsed.settings.healthWeights) || {}),
    },
  };
  parsed.categories = {
    ...defaults.categories,
    ...(parsed.categories || {}),
  };
  if (!parsed.sinkingFunds) parsed.sinkingFunds = seedSinkingFunds();
  if (!parsed.accounts) parsed.accounts = seedAccounts();
  if (!parsed.recurring) parsed.recurring = seedRecurring();
  if (!parsed.categories.Debt) parsed.categories.Debt = [...DEFAULT_CATEGORIES.Debt];
  parsed.accounts.forEach(a => {
    if (a.openingBalance === undefined || a.openingBalance === null) a.openingBalance = 0;
  });
  parsed.recurring.forEach(r => {
    if (!r.frequency) r.frequency = 'Monthly';
    if (!r.dayOfMonth) {
      r.dayOfMonth = r.dueDate ? (Number(r.dueDate.slice(8, 10)) || 1) : 1;
    }
  });
  return parsed;
}

async function loadData() {
  try {
    const response = await fetch(`${API_BASE}/api/data`, { cache: 'no-store' });
    if (response.ok) {
      const parsed = await response.json();
      state.backendMode = true;
      state.backendReady = true;
      const data = normalizeData(parsed);
      return data;
    }
    console.warn('Backend returned an error; using local data fallback.');
  } catch (e) {
    console.warn('Backend unavailable, falling back to localStorage', e);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeData(parsed);
    }
  } catch (e) { console.warn('Could not read saved data', e); }

  return defaultData();
}

async function saveData() {
  try {
    const payload = JSON.stringify(state.data);
    if (state.backendMode) {
      const response = await fetch(`${API_BASE}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (!response.ok) {
        throw new Error('Backend save failed');
      }
      return;
    }

    localStorage.setItem(STORAGE_KEY, payload);
  } catch (e) {
    console.error('Could not save data', e);
    toast('⚠ Could not save — device storage may be full or the server is unavailable.');
  }
}

/* ---------------------------- Derived data / computations ---------------------------- */

function allMonthKeys() {
  const set = new Set();
  const now = monthKey(todayISO());
  set.add(now);
  if (state.data && state.data.transactions) {
    state.data.transactions.forEach(t => { if (t.date) set.add(monthKey(t.date)); });
  }
  if (state.selectedMonth) set.add(state.selectedMonth);
  return Array.from(set).sort();
}

function currentMonthKey() {
  if (state.selectedMonth) return state.selectedMonth;
  const months = allMonthKeys();
  const now = monthKey(todayISO());
  return months.includes(now) ? now : months[months.length - 1];
}

function txForMonth(key) {
  return state.data.transactions.filter(t => monthKey(t.date) === key);
}

function txThrough(key) {
  return state.data.transactions.filter(t => monthKey(t.date) <= key);
}

function sumTx(list, type) {
  return list.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount || 0), 0);
}

function monthSummary(key) {
  const list = txForMonth(key);
  const income = sumTx(list, 'Income');
  const recurringIncome = list.filter(t => t.type === 'Income' && t.category === 'Salary')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const oneOffIncome = income - recurringIncome;
  const essential = list.filter(t => t.type === 'Expense' && classify(t.category) === 'Essential')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const nonEssential = list.filter(t => t.type === 'Expense' && classify(t.category) === 'Non-Essential')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const debtPay = sumTx(list, 'Debt Payment');
  const savings = sumTx(list, 'Savings');
  const totalExpenses = essential + nonEssential;
  const totalOutflow = totalExpenses + debtPay + savings;
  const netCashFlow = income - totalOutflow;
  return { income, recurringIncome, oneOffIncome, essential, nonEssential, totalExpenses, debtPay, savings, totalOutflow, netCashFlow };
}

function cashFlowSeries() {
  const months = allMonthKeys();
  let running = Number(state.data.settings.openingCash || 0);
  return months.map(key => {
    const s = monthSummary(key);
    const beginning = running;
    running = beginning + s.netCashFlow;
    return { key, beginning, ending: running, ...s };
  });
}

function totalDebtOriginal() {
  return state.data.debts.reduce((s, d) => s + (Number(d.original) || 0), 0);
}

function debtPaidFor(debt) {
  // Exact-match on creditor name against Debt Payment transactions' subcategory/description.
  const name = debt.creditor.toLowerCase();
  // special case: grouped Leather Square obligations
  if (name.startsWith('leather square')) {
    return state.data.transactions
      .filter(t => t.type === 'Debt Payment' && (t.subcategory || '').toLowerCase().includes('leather'))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }
  const key = name.split(' ')[0]; // first token match (Salary Deduction, Unity Finance, Wizzie, Esther, James)
  return state.data.transactions
    .filter(t => t.type === 'Debt Payment' && (
      (t.subcategory || '').toLowerCase().includes(name) ||
      (t.subcategory || '').toLowerCase().includes(key) ||
      (t.description || '').toLowerCase().includes(key)
    ))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
}

function debtStats() {
  const rows = state.data.debts.map(d => {
    const paid = debtPaidFor(d);
    const hasOriginal = d.original !== null && d.original !== undefined && d.original !== '';
    const balance = hasOriginal ? Math.max(Number(d.original) - paid, 0) : null;
    const status = !hasOriginal ? 'unknown' : (balance <= 0 ? 'PAID OFF' : 'ACTIVE');
    return { ...d, paid, balance, hasOriginal, status };
  });
  const totalOriginal = rows.reduce((s, r) => s + (r.hasOriginal ? Number(r.original) : 0), 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalBalance = rows.reduce((s, r) => s + (r.balance || 0), 0);
  const anyMissing = rows.some(r => !r.hasOriginal);
  const totalMinPayment = rows.reduce((s, r) => s + Number(r.minPayment || 0), 0);
  const totalPlanned = rows.reduce((s, r) => s + Number(r.plannedPayment || 0), 0);
  return { rows, totalOriginal, totalPaid, totalBalance, anyMissing, totalMinPayment, totalPlanned };
}

function calculateDebtPayoff(debts, strategy = 'Avalanche') {
  // Simulates monthly payoff of active debts
  const active = debts
    .filter(d => d.balance !== null && d.balance > 0)
    .map(d => ({
      creditor: d.creditor,
      balance: d.balance,
      interestRate: Number(d.interestRate || 0) / 100,
      minPayment: Number(d.minPayment || 0),
      plannedPayment: Number(d.plannedPayment || d.minPayment || 0),
    }));

  if (active.length === 0) {
    return { months: 0, totalInterest: 0, debtFreeDate: 'Debt Free', order: [] };
  }

  const totalMonthlyBudget = active.reduce((s, d) => s + d.plannedPayment, 0);
  if (totalMonthlyBudget <= 0) {
    return { months: null, totalInterest: 0, debtFreeDate: 'Unknown', order: [] };
  }

  // Clone debts for simulation
  const pool = active.map(d => ({ ...d }));
  let monthCount = 0;
  let totalInterest = 0;
  const order = [];
  const maxMonths = 360;

  while (pool.some(d => d.balance > 0.01) && monthCount < maxMonths) {
    monthCount++;
    let availableBudget = totalMonthlyBudget;

    // Apply monthly interest
    pool.forEach(d => {
      if (d.balance > 0.01) {
        const monthlyInt = d.balance * (d.interestRate / 12);
        d.balance += monthlyInt;
        totalInterest += monthlyInt;
      }
    });

    // Pay minimums first
    pool.forEach(d => {
      if (d.balance > 0.01) {
        const pay = Math.min(d.balance, d.minPayment);
        d.balance -= pay;
        availableBudget -= pay;
        if (d.balance <= 0.01 && !order.includes(d.creditor)) {
          order.push(d.creditor);
        }
      }
    });

    // Allocate remaining budget based on strategy
    if (availableBudget > 0) {
      const remainingDebts = pool.filter(d => d.balance > 0.01);
      if (strategy === 'Avalanche') {
        remainingDebts.sort((a, b) => b.interestRate - a.interestRate);
      } else {
        remainingDebts.sort((a, b) => a.balance - b.balance);
      }
      for (const d of remainingDebts) {
        if (availableBudget <= 0) break;
        const extra = Math.min(d.balance, availableBudget);
        d.balance -= extra;
        availableBudget -= extra;
        if (d.balance <= 0.01 && !order.includes(d.creditor)) {
          order.push(d.creditor);
        }
      }
    }
  }

  const now = new Date();
  const debtFreeMonth = new Date(now.getFullYear(), now.getMonth() + monthCount, 1);
  const debtFreeDate = debtFreeMonth.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  return {
    months: monthCount >= maxMonths ? '> 30 yrs' : monthCount,
    totalInterest: Math.round(totalInterest),
    debtFreeDate: monthCount >= maxMonths ? 'Never at current rate' : debtFreeDate,
    order,
  };
}

function recurringIncomeTotal() {
  return state.data.recurring.filter(r => r.type === 'Income').reduce((s, r) => s + Number(r.amount || 0), 0)
    || monthSummary(currentMonthKey()).recurringIncome;
}

function debtToIncome() {
  const income = recurringIncomeTotal();
  const { totalPlanned } = debtStats();
  return income > 0 ? totalPlanned / income : 0;
}

function debtBalanceAsOf(key) {
  // Opening balance across all creditors minus every debt payment made through month `key`.
  const { totalOriginal, anyMissing } = debtStats();
  if (anyMissing && totalOriginal === 0) return null;
  const paid = txThrough(key).filter(t => t.type === 'Debt Payment').reduce((s, t) => s + Number(t.amount || 0), 0);
  return Math.max(totalOriginal - paid, 0);
}

function netWorthSeries() {
  const months = allMonthKeys();
  const cf = cashFlowSeries();
  return months.map((key, i) => {
    const cashEnding = cf[i].ending;
    const savingsToDate = txThrough(key).filter(t => t.type === 'Savings').reduce((s, t) => s + Number(t.amount || 0), 0);
    const debtBal = debtBalanceAsOf(key);
    const assets = cashEnding + savingsToDate;
    const netWorth = debtBal === null ? null : assets - debtBal;
    return { key, assets, savings: savingsToDate, debt: debtBal, netWorth };
  });
}

function savingsTotalSaved() {
  return state.data.transactions.filter(t => t.type === 'Savings').reduce((s, t) => s + Number(t.amount || 0), 0);
}

function budgetVsActual(key) {
  const list = txForMonth(key).filter(t => t.type === 'Expense');
  const catSet = new Set(Object.keys(state.data.budget));
  list.forEach(t => { if (t.category) catSet.add(t.category); });
  const cats = Array.from(catSet).sort();
  return cats.map(cat => {
    const budget = Number(state.data.budget[cat]) || 0;
    const actual = list.filter(t => t.category === cat).reduce((s, t) => s + Number(t.amount || 0), 0);
    const variance = budget - actual;
    const pctUsed = budget > 0 ? actual / budget : (actual > 0 ? Infinity : 0);
    let status = 'under';
    if (pctUsed > 1) status = 'over';
    else if (pctUsed >= state.data.settings.budgetAlertThreshold) status = 'ontrack';
    return { category: cat, budget, actual, variance, pctUsed, status };
  });
}

function financialHealthScore(key) {
  const s = monthSummary(key);
  const w = state.data.settings.healthWeights;
  const { totalBalance } = debtStats();
  const dti = debtToIncome();

  // Cash flow: positive net cash flow relative to income
  const cashFlowScore = s.income > 0 ? Math.max(0, Math.min(1, (s.netCashFlow / s.income) + 0.5)) * w.cashflow : (s.netCashFlow >= 0 ? w.cashflow : 0);

  // Savings: savings rate vs target
  const savingsRate = s.income > 0 ? s.savings / s.income : 0;
  const target = state.data.settings.savingsRateTarget || 0.2;
  const savingsScore = Math.max(0, Math.min(1, savingsRate / target)) * w.savings;

  // Debt: debt-to-income vs threshold
  const dtiThreshold = state.data.settings.debtToIncomeThreshold || 0.3;
  const debtScore = totalBalance === 0 && !debtStats().anyMissing ? w.debt : Math.max(0, (1 - dti / (dtiThreshold * 2))) * w.debt;

  // Spending discipline: budget adherence
  const bva = budgetVsActual(key);
  const withBudget = bva.filter(b => b.budget > 0);
  const overCount = withBudget.filter(b => b.status === 'over').length;
  const disciplineScore = withBudget.length ? Math.max(0, 1 - overCount / withBudget.length) * w.discipline : w.discipline * 0.5;

  // Emergency fund: current emergency goal vs target
  const emergencyGoal = state.data.goals.find(g => g.name.toLowerCase().includes('emergency'));
  const emergencyScore = emergencyGoal && emergencyGoal.target > 0
    ? Math.max(0, Math.min(1, emergencyGoal.current / emergencyGoal.target)) * w.emergency
    : 0;

  const total = cashFlowScore + savingsScore + debtScore + disciplineScore + emergencyScore;
  const totalMax = w.cashflow + w.savings + w.debt + w.discipline + w.emergency;

  let tag = 'Critical', tagClass = 'bad';
  const pct = total / totalMax;
  if (pct >= 0.9) { tag = 'Excellent'; tagClass = 'good'; }
  else if (pct >= 0.75) { tag = 'Good'; tagClass = 'good'; }
  else if (pct >= 0.6) { tag = 'Fair'; tagClass = 'warn'; }
  else if (pct >= 0.4) { tag = 'Needs Attention'; tagClass = 'warn'; }

  return {
    total: Math.round(total * 10) / 10, max: totalMax, tag, tagClass,
    breakdown: [
      { label: 'Cash Flow', score: Math.round(cashFlowScore * 10) / 10, max: w.cashflow },
      { label: 'Savings', score: Math.round(savingsScore * 10) / 10, max: w.savings },
      { label: 'Debt', score: Math.round(debtScore * 10) / 10, max: w.debt },
      { label: 'Spending Discipline', score: Math.round(disciplineScore * 10) / 10, max: w.discipline },
      { label: 'Emergency Fund', score: Math.round(emergencyScore * 10) / 10, max: w.emergency },
    ],
  };
}

function generateAIInsights(key) {
  const insights = [];
  const s = monthSummary(key);
  const months = allMonthKeys();
  const prevKey = months[months.indexOf(key) - 1];
  const prev = prevKey ? monthSummary(prevKey) : null;
  const bva = budgetVsActual(key);

  if (prev && s.totalExpenses > 0) {
    const diff = s.totalExpenses - prev.totalExpenses;
    if (diff > prev.totalExpenses * 0.15) {
      insights.push(`Your overall spending is up <b>${fmtPct(diff / prev.totalExpenses, 0)}</b> compared to last month.`);
    } else if (diff < -prev.totalExpenses * 0.1) {
      insights.push(`Great job! Your spending is down <b>${fmtPct(Math.abs(diff) / prev.totalExpenses, 0)}</b> from last month.`);
    }
  }

  const overBudget = bva.filter(b => b.status === 'over').sort((a, b) => b.variance - a.variance);
  if (overBudget.length > 0) {
    const top = overBudget[0];
    insights.push(`You have exceeded your <b>${escapeHtml(top.category)}</b> budget by ${fmtMoney(Math.abs(top.variance))}. Consider adjusting spending in other areas to compensate.`);
  }

  const nonEssentialPct = s.income > 0 ? s.nonEssential / s.income : 0;
  if (nonEssentialPct > 0.2) {
    insights.push(`Non-essential spending makes up <b>${fmtPct(nonEssentialPct, 0)}</b> of your income this month. Trimming this could accelerate your savings goals.`);
  }

  if (insights.length === 0) {
    insights.push("Your finances are looking stable this month. Keep up the good habits!");
  }

  return insights;
}

function buildAlerts(key) {
  const alerts = [];
  const s = monthSummary(key);
  const cf = cashFlowSeries().find(c => c.key === key);
  const bva = budgetVsActual(key);
  const overBudget = bva.filter(b => b.status === 'over');
  const totalBudget = bva.reduce((a, b) => a + b.budget, 0);
  const totalActual = bva.reduce((a, b) => a + b.actual, 0);

  if (totalActual > totalBudget && totalBudget > 0) {
    alerts.push({ type: 'bad', text: `Over budget — expenses exceeded the plan by ${fmtMoney(totalActual - totalBudget)} this month.` });
  } else if (totalBudget > 0) {
    alerts.push({ type: 'good', text: `Spending is within plan by ${fmtMoney(totalBudget - totalActual)} this month.` });
  }

  alerts.push({ type: s.netCashFlow >= 0 ? 'good' : 'bad', text: `Net cash flow of ${fmtMoney(s.netCashFlow)} this month.` });

  if (cf) {
    const floor = state.data.settings.lowCashFloor || 0;
    alerts.push({
      type: cf.ending >= floor ? 'good' : 'bad',
      text: cf.ending >= floor
        ? `Cash balance of ${fmtMoney(cf.ending)} is above your floor.`
        : `Cash balance of ${fmtMoney(cf.ending)} is below your ${fmtMoney(floor)} floor.`,
    });
  }

  const cap = state.data.settings.nonEssentialCap || 0.15;
  const neRatio = s.income > 0 ? s.nonEssential / s.income : 0;
  alerts.push({
    type: neRatio <= cap ? 'good' : 'warn',
    text: `Non-essential spending is ${fmtPct(neRatio, 0)} of income — ${neRatio <= cap ? 'within the cap' : 'above your ' + fmtPct(cap, 0) + ' cap'}.`,
  });

  const { totalBalance, anyMissing } = debtStats();
  if (anyMissing) {
    alerts.push({ type: 'warn', text: `Enter opening balances on the Debt page for an accurate total-debt figure.` });
  } else if (totalBalance === 0) {
    alerts.push({ type: 'good', text: `No outstanding debt — you are debt-free.` });
  } else {
    alerts.push({ type: 'warn', text: `Outstanding debt of ${fmtMoney(totalBalance)} remains.` });
  }

  if (overBudget.length) {
    alerts.push({ type: 'warn', text: `${overBudget.length} categor${overBudget.length === 1 ? 'y is' : 'ies are'} over budget: ${overBudget.map(b => b.category).join(', ')}.` });
  }

  const emergencyGoal = state.data.goals.find(g => g.name.toLowerCase().includes('emergency'));
  if (!emergencyGoal || emergencyGoal.current <= 0) {
    alerts.push({ type: 'warn', text: `You have not yet built an emergency fund.` });
  }

  return alerts;
}

function forecast(months = 1) {
  const months6 = allMonthKeys().slice(-3);
  const avgIncome = months6.reduce((s, k) => s + monthSummary(k).income, 0) / (months6.length || 1);
  const avgExpense = months6.reduce((s, k) => s + monthSummary(k).totalExpenses, 0) / (months6.length || 1);
  const avgDebt = months6.reduce((s, k) => s + monthSummary(k).debtPay, 0) / (months6.length || 1);
  const netMonthly = avgIncome - avgExpense - avgDebt;
  const cf = cashFlowSeries();
  const lastCash = cf.length ? cf[cf.length - 1].ending : 0;
  return { netMonthly, cashBalance: lastCash + netMonthly * months, income: avgIncome, expense: avgExpense, debt: avgDebt };
}

function dangerZone() {
  const key = currentMonthKey();
  const cf = cashFlowSeries().find(c => c.key === key);
  const floor = state.data.settings.lowCashFloor || 0;
  const upcoming = state.data.debts.reduce((s, d) => s + Number(d.plannedPayment || 0), 0)
    + state.data.recurring.filter(r => r.type === 'Expense' && classify(r.category) !== 'Debt').reduce((s, r) => s + Number(r.amount || 0), 0);
  const available = cf ? cf.ending : 0;
  if (available < floor) return { level: 'critical', text: `Cash is below your floor of ${fmtMoney(floor)}.` };
  if (upcoming > available) return { level: 'warn', text: `Upcoming obligations (${fmtMoney(upcoming)}) exceed available cash (${fmtMoney(available)}).` };
  return { level: 'safe', text: `Upcoming obligations are comfortably covered.` };
}

/* ---------------------------- Account reconciliation ---------------------------- */

function accountBookBalance(accountName) {
  const acct = state.data.accounts.find(a => a.name === accountName);
  let total = Number(acct?.openingBalance || 0);
  state.data.transactions.forEach(t => {
    if (t.type === 'Transfer') {
      if (t.account === accountName) total -= Number(t.amount || 0);
      if (t.toAccount === accountName) total += Number(t.amount || 0);
      return;
    }
    if (t.account !== accountName) return;
    if (t.type === 'Income' || t.type === 'Savings') total += Number(t.amount || 0);
    else total -= Number(t.amount || 0);
  });
  return total;
}

function accountStats() {
  return state.data.accounts.map(a => {
    const book = accountBookBalance(a.name);
    const hasActual = a.actualBalance !== null && a.actualBalance !== undefined && a.actualBalance !== '';
    const diff = hasActual ? Number(a.actualBalance) - book : null;
    return { ...a, book, hasActual, diff, reconciled: hasActual && Math.abs(diff) < 0.01 };
  });
}

/* ---------------------------- Sinking funds ---------------------------- */

function sinkingFundMonthly(fund) {
  return (Number(fund.annualNeed) || 0) / 12;
}

function sinkingFundsStats() {
  const rows = state.data.sinkingFunds.map(f => ({
    ...f, monthly: sinkingFundMonthly(f), pct: f.annualNeed > 0 ? Math.min(1, f.saved / f.annualNeed) : 0,
  }));
  const totalAnnual = rows.reduce((s, r) => s + Number(r.annualNeed || 0), 0);
  const totalMonthly = rows.reduce((s, r) => s + r.monthly, 0);
  const totalSaved = rows.reduce((s, r) => s + Number(r.saved || 0), 0);
  return { rows, totalAnnual, totalMonthly, totalSaved };
}

/* ---------------------------- Emergency fund (auto target) ---------------------------- */

function avgEssentialExpense() {
  const months = allMonthKeys().slice(-3);
  if (!months.length) return 0;
  return months.reduce((s, k) => s + monthSummary(k).essential, 0) / months.length;
}

function emergencyFundTarget() {
  return avgEssentialExpense() * (state.data.settings.emergencyFundMonths || 6);
}

/* ---------------------------- Smart Recurring & Next 30 days ---------------------------- */

function nextOccurrenceDate(item, fromISO = todayISO()) {
  if (item.dueDate && item.dueDate >= fromISO) return item.dueDate;
  const day = Number(item.dayOfMonth) || (item.dueDate ? Number(item.dueDate.slice(8, 10)) : 1) || 1;
  const fromD = new Date(fromISO + 'T00:00:00');
  const y = fromD.getFullYear();
  const m = fromD.getMonth();
  const targetThisMonth = new Date(y, m, day);
  if (targetThisMonth >= fromD) {
    return `${targetThisMonth.getFullYear()}-${String(targetThisMonth.getMonth() + 1).padStart(2, '0')}-${String(targetThisMonth.getDate()).padStart(2, '0')}`;
  }
  const targetNextMonth = new Date(y, m + 1, day);
  return `${targetNextMonth.getFullYear()}-${String(targetNextMonth.getMonth() + 1).padStart(2, '0')}-${String(targetNextMonth.getDate()).padStart(2, '0')}`;
}

function next30Days() {
  const today = new Date(todayISO() + 'T00:00:00');
  const in30 = new Date(today.getTime() + 30 * 86400000);
  const items = [];

  state.data.debts.forEach(d => {
    const nextDate = nextOccurrenceDate(d);
    if (!nextDate) return;
    const due = new Date(nextDate + 'T00:00:00');
    if (due >= today && due <= in30) {
      items.push({
        id: d.id, date: nextDate, name: d.creditor, amount: d.plannedPayment, type: 'Debt',
        category: d.priority === 'High' ? 'Loan Repayment' : 'Informal Debt', creditorId: d.id
      });
    }
  });

  state.data.recurring.forEach(r => {
    if (r.type !== 'Expense') return;
    if (classify(r.category) === 'Debt') return;
    const nextDate = nextOccurrenceDate(r);
    if (!nextDate) return;
    const due = new Date(nextDate + 'T00:00:00');
    if (due >= today && due <= in30) {
      items.push({
        id: r.id, date: nextDate, name: r.item, amount: r.amount,
        type: classify(r.category) === 'Essential' ? 'Essential' : 'Expense',
        category: r.category, recurringId: r.id
      });
    }
  });

  items.sort((a, b) => a.date.localeCompare(b.date));
  const totalDue = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const cf = cashFlowSeries();
  const available = cf.length ? cf[cf.length - 1].ending : 0;
  return { items, totalDue, available, shortfall: totalDue - available };
}

/* ---------------------------- Canvas charts (no external libs, offline-safe) ---------------------------- */

function setupCanvasHiDPI(canvas, cssHeight) {
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = canvas.parentElement.clientWidth;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: cssWidth, h: cssHeight };
}

function drawGroupedBarChart(canvas, labels, series) {
  const { ctx, w, h } = setupCanvasHiDPI(canvas, 220);
  ctx.clearRect(0, 0, w, h);
  const padL = 54, padR = 14, padT = 14, padB = 28;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const allVals = series.flatMap(s => s.data);
  const maxVal = Math.max(100, ...allVals) * 1.15;

  ctx.strokeStyle = '#E3E8EE'; ctx.fillStyle = '#5A6B7B';
  ctx.font = '11px -apple-system, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + chartH - (chartH * i) / gridLines;
    const val = (maxVal * i) / gridLines;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillText(currency() + Math.round(val).toLocaleString(), padL - 8, y);
  }

  const groupW = chartW / labels.length;
  const barGap = 4, groupPad = groupW * 0.18;
  const barW = (groupW - groupPad * 2 - barGap * (series.length - 1)) / series.length;

  labels.forEach((label, i) => {
    const groupX = padL + i * groupW + groupPad;
    series.forEach((s, si) => {
      const val = s.data[i] || 0;
      const barH = (val / maxVal) * chartH;
      const x = groupX + si * (barW + barGap);
      const y = padT + chartH - barH;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      const r = Math.min(4, barW / 2);
      roundRectPath(ctx, x, y, barW, Math.max(barH, 1), r);
      ctx.fill();
    });
    ctx.fillStyle = '#5A6B7B'; ctx.textAlign = 'center'; ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText(label, groupX + (groupW - groupPad * 2) / 2, padT + chartH + 16);
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLineChart(canvas, labels, series) {
  const { ctx, w, h } = setupCanvasHiDPI(canvas, 220);
  ctx.clearRect(0, 0, w, h);
  const padL = 60, padR = 14, padT = 14, padB = 28;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const allVals = series.flatMap(s => s.data);
  const minVal = Math.min(0, ...allVals);
  const maxVal = Math.max(100, ...allVals) * 1.15;
  const range = maxVal - minVal || 1;

  ctx.strokeStyle = '#E3E8EE'; ctx.fillStyle = '#5A6B7B';
  ctx.font = '11px -apple-system, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + chartH - (chartH * i) / gridLines;
    const val = minVal + (range * i) / gridLines;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillText(currency() + Math.round(val).toLocaleString(), padL - 8, y);
  }

  const stepX = labels.length > 1 ? chartW / (labels.length - 1) : 0;
  series.forEach(s => {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    s.data.forEach((val, i) => {
      const x = padL + i * stepX;
      const y = padT + chartH - ((val - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    s.data.forEach((val, i) => {
      const x = padL + i * stepX;
      const y = padT + chartH - ((val - minVal) / range) * chartH;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = s.color; ctx.fill();
    });
  });

  ctx.fillStyle = '#5A6B7B'; ctx.textAlign = 'center'; ctx.font = '11px -apple-system, sans-serif';
  labels.forEach((label, i) => {
    const x = padL + i * stepX;
    ctx.fillText(label, x, padT + chartH + 16);
  });
}

function legendHtml(series) {
  return `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${escapeHtml(s.name)}</span>`).join('')}</div>`;
}

/* ---------------------------- Modal helper ---------------------------- */

function openModal({ title, bodyHtml, onMount, onSubmit, submitLabel = 'Save', wide = false }) {
  const root = $('#modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal" style="${wide ? 'max-width:640px' : ''}">
        <div class="modal-head"><h3>${escapeHtml(title)}</h3>
          <button class="icon-btn" id="modalClose" style="color:var(--slate)">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <form id="modalForm">
          <div class="modal-body">${bodyHtml}</div>
          <div class="modal-foot">
            <button type="button" class="btn" id="modalCancel">Cancel</button>
            <button type="submit" class="btn btn-primary">${escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </div>
    </div>`;
  const close = () => { root.innerHTML = ''; };
  $('#modalClose').onclick = close;
  $('#modalCancel').onclick = close;
  $('#modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') close(); });
  $('#modalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const ok = onSubmit(data, close);
    if (ok !== false) close();
  });
  if (onMount) onMount(root);
}

function confirmDialog(message, onYes) {
  openModal({
    title: 'Please confirm',
    bodyHtml: `<p style="margin:0;color:var(--ink);font-size:13.5px;line-height:1.5;">${escapeHtml(message)}</p>`,
    submitLabel: 'Delete',
    onSubmit: () => { onYes(); toast('Deleted.'); },
  });
}

function selectOptions(list, selected) {
  return list.map(o => `<option value="${escapeHtml(o)}" ${o === selected ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
}

/* ---------------------------- Month Navigation Helpers ---------------------------- */

function renderMonthStepperHtml(key = currentMonthKey()) {
  return `
    <div class="month-stepper" data-stepper-key="${key}">
      <button type="button" data-step-month="-1" title="Previous month" aria-label="Previous month">
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="month-stepper-label" data-open-month-picker title="Click to pick any month">${escapeHtml(monthLabel(key))}</span>
      <button type="button" data-step-month="1" title="Next month" aria-label="Next month">
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>`;
}

function wireMonthStepper(root = document) {
  $$('[data-step-month]', root).forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const offset = parseInt(btn.dataset.stepMonth, 10);
      const curr = currentMonthKey();
      state.selectedMonth = addMonths(curr, offset);
      syncTopbarMonth();
      renderView();
    };
  });
  $$('[data-open-month-picker]', root).forEach(lbl => {
    lbl.onclick = (e) => {
      e.stopPropagation();
      openMonthPickerModal();
    };
  });
}

function openMonthPickerModal() {
  const curr = currentMonthKey();
  const [currY] = curr.split('-').map(Number);
  const allMonths = allMonthKeys();

  let pickYear = currY;

  function renderGrid(y) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <button type="button" class="btn btn-sm" id="pickPrevYear">◀ ${y - 1}</button>
        <b style="font-size:16px;color:var(--navy);">${y}</b>
        <button type="button" class="btn btn-sm" id="pickNextYear">${y + 1} ▶</button>
      </div>
      <div class="month-picker-grid">
        ${months.map((name, i) => {
          const key = `${y}-${String(i + 1).padStart(2, '0')}`;
          const isSelected = key === currentMonthKey();
          const hasData = allMonths.includes(key);
          return `<button type="button" class="month-picker-btn ${isSelected ? 'active' : ''}" data-pick-key="${key}">
            ${name}${hasData ? '<span style="display:block;font-size:9.5px;opacity:.7;">•</span>' : ''}
          </button>`;
        }).join('')}
      </div>
      <div style="text-align:center;margin-top:14px;">
        <button type="button" class="btn btn-sm" id="pickCurrentMonth">Jump to Current (${monthLabelShort(monthKey(todayISO()))} ${todayISO().slice(0, 4)})</button>
      </div>
    `;
  }

  openModal({
    title: 'Select Active Month',
    submitLabel: 'Done',
    bodyHtml: `<div id="monthPickerContainer">${renderGrid(pickYear)}</div>`,
    onMount: (modalRoot) => {
      function attachEvents() {
        const prevBtn = $('#pickPrevYear', modalRoot);
        const nextBtn = $('#pickNextYear', modalRoot);
        const curBtn = $('#pickCurrentMonth', modalRoot);
        if (prevBtn) prevBtn.onclick = () => {
          pickYear--;
          $('#monthPickerContainer', modalRoot).innerHTML = renderGrid(pickYear);
          attachEvents();
        };
        if (nextBtn) nextBtn.onclick = () => {
          pickYear++;
          $('#monthPickerContainer', modalRoot).innerHTML = renderGrid(pickYear);
          attachEvents();
        };
        if (curBtn) curBtn.onclick = () => {
          state.selectedMonth = monthKey(todayISO());
          syncTopbarMonth();
          renderView();
          $('#modalRoot').innerHTML = '';
        };
        $$('[data-pick-key]', modalRoot).forEach(btn => {
          btn.onclick = () => {
            state.selectedMonth = btn.dataset.pickKey;
            syncTopbarMonth();
            renderView();
            $('#modalRoot').innerHTML = '';
          };
        });
      }
      attachEvents();
    },
    onSubmit: () => true,
  });
}

/* ---------------------------- View: Dashboard ---------------------------- */

function renderDashboard(root) {
  const key = currentMonthKey();
  const months = allMonthKeys();
  const idx = months.indexOf(key);
  const prevKey = idx > 0 ? months[idx - 1] : null;
  const s = monthSummary(key);
  const prev = prevKey ? monthSummary(prevKey) : null;
  const cf = cashFlowSeries().find(c => c.key === key);
  const { totalBalance, totalPaid, anyMissing } = debtStats();
  const dti = debtToIncome();
  const health = financialHealthScore(key);
  const alerts = buildAlerts(key);
  const fc = forecast();
  const zone = dangerZone();
  const essentialPct = s.income > 0 ? s.essential / s.income : 0;
  const nonEssentialPct = s.income > 0 ? s.nonEssential / s.income : 0;
  const savingsRate = s.income > 0 ? s.savings / s.income : 0;

  // Monthly expense categories breakdown
  const monthExpenses = txForMonth(key).filter(t => t.type === 'Expense');
  const catTotals = {};
  monthExpenses.forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount || 0);
  });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const totalExpenseAmt = monthExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const delta = (curr, prevVal) => {
    if (prevVal === null || prevVal === undefined) return '';
    const d = curr - prevVal;
    if (Math.abs(d) < 0.5) return `<div class="kpi-delta muted">No change</div>`;
    const cls = d >= 0 ? 'up' : 'down';
    const arrow = d >= 0 ? '▲' : '▼';
    return `<div class="kpi-delta ${cls}">${arrow} ${fmtMoney(Math.abs(d))} vs last month</div>`;
  };

  const n30 = next30Days();

  root.innerHTML = `
    <section class="dashboard-hero">
      <div class="dashboard-hero-copy">
        <div class="eyebrow">Monthly money brief</div>
        <h1 class="view-title">Your money, with a plan.</h1>
        <p class="view-sub">A clear read on ${escapeHtml(monthLabel(key))}, including what is safe to spend and what needs attention.</p>
        <div class="hero-actions">
          ${renderMonthStepperHtml(key)}
          <button class="btn btn-primary" id="qaAddTx"><span aria-hidden="true">+</span> Add transaction</button>
        </div>
      </div>
      <div class="hero-balance">
        <div class="hero-balance-label">Projected month-end cash</div>
        <div class="hero-balance-value">${fmtMoney(cf ? cf.ending : 0)}</div>
        <div class="hero-balance-note ${zone.level}">${zone.level === 'safe' ? 'On a healthy track' : zone.level === 'warn' ? 'Keep an eye on commitments' : 'Action needed this month'}</div>
      </div>
    </section>

    <div class="zone ${zone.level} dashboard-zone">
      <span class="zone-mark" aria-hidden="true">${zone.level === 'safe' ? '✓' : zone.level === 'warn' ? '!' : '×'}</span>
      <span>${escapeHtml(zone.text)}</span>
    </div>

    <div class="metric-heading"><span>Month at a glance</span><span class="metric-heading-period">${escapeHtml(monthLabel(key))}</span></div>
    <div class="grid kpi-grid primary-kpis">
      <div class="card kpi-card accent">
        <div class="kpi-label">Total Income</div>
        <div class="kpi-value">${fmtMoney(s.income)}</div>
        ${prev ? delta(s.income, prev.income) : ''}
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Total Expenses</div>
        <div class="kpi-value">${fmtMoney(s.totalExpenses)}</div>
        ${prev ? delta(s.totalExpenses, prev.totalExpenses) : ''}
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Net Cash Flow</div>
        <div class="kpi-value" style="color:${s.netCashFlow >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtMoney(s.netCashFlow)}</div>
        ${prev ? delta(s.netCashFlow, prev.netCashFlow) : ''}
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Available Cash</div>
        <div class="kpi-value">${fmtMoney(cf ? cf.ending : 0)}</div>
      </div>
    </div>

    <div class="grid kpi-grid secondary-kpis">
      <div class="card kpi-card">
        <div class="kpi-label">Total Debt</div>
        <div class="kpi-value">${anyMissing && totalBalance === 0 ? '—' : fmtMoney(totalBalance)}</div>
        ${anyMissing ? '<div class="kpi-delta muted">Enter balances on Debt page</div>' : ''}
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Savings Rate</div>
        <div class="kpi-value">${fmtPct(savingsRate)}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Debt-to-Income</div>
        <div class="kpi-value">${fmtPct(dti)}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Essential / Non-Essential</div>
        <div class="kpi-value" style="font-size:17px;">${fmtPct(essentialPct, 0)} / ${fmtPct(nonEssentialPct, 0)}</div>
      </div>
    </div>

    <div class="grid two-col" style="margin-top:18px;align-items:start;">
      <div class="card">
        <div class="card-title">Financial Health Score</div>
        <div class="health-wrap">
          <div class="health-ring">
            <svg viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#E3E8EE" stroke-width="10"/>
              <circle cx="56" cy="56" r="48" fill="none" stroke="${health.tagClass === 'good' ? '#1F8A46' : health.tagClass === 'warn' ? '#B7791F' : '#C0392B'}"
                stroke-width="10" stroke-linecap="round"
                stroke-dasharray="${2 * Math.PI * 48}" stroke-dashoffset="${2 * Math.PI * 48 * (1 - health.total / health.max)}"/>
            </svg>
            <div class="health-ring-num"><b>${health.total}</b><span>out of ${health.max}</span></div>
          </div>
          <div class="health-breakdown">
            <span class="health-tag status ${health.tagClass === 'good' ? 'under' : health.tagClass === 'warn' ? 'ontrack' : 'over'}">${health.tag}</span>
            ${health.breakdown.map(b => `
              <div class="hb-row">
                <span class="hb-label">${escapeHtml(b.label)}</span>
                <div class="hb-bar"><div style="width:${Math.min(100, (b.score / b.max) * 100)}%"></div></div>
                <span class="hb-val">${b.score} / ${b.max}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Forecast (Projected)</div>
        <table>
          <thead><tr><th>Period</th><th class="num">Net Cash Flow</th><th class="num">Cash Balance</th></tr></thead>
          <tbody>
            ${[1, 3, 6, 12].map(n => {
              const f = forecast(n);
              return `<tr><td>${n}-Month</td><td class="num">${fmtMoney(f.netMonthly)}</td><td class="num">${fmtMoney(f.cashBalance)}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="field-hint" style="margin-top:8px;">Based on your last 3 months' average — projections, not actual results.</div>
      </div>
    </div>

    <!-- Spending by Category Breakdown -->
    <div class="section-title">Spending by Category — ${escapeHtml(monthLabel(key))}</div>
    <div class="card">
      ${sortedCats.length === 0 ? `<div class="empty" style="padding:20px 0;"><b>No expense transactions recorded in ${escapeHtml(monthLabel(key))}</b>Add transactions to see category distribution.</div>` : `
        <div style="display:grid;gap:10px;">
          ${sortedCats.map(([cat, amt]) => {
            const pct = totalExpenseAmt > 0 ? (amt / totalExpenseAmt) : 0;
            const catType = classify(cat);
            return `
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:13px;">
                  <span>
                    <b>${escapeHtml(cat)}</b>
                    <span class="tag ${catType === 'Essential' ? 'essential' : 'nonessential'}" style="margin-left:6px;font-size:10px;">${catType}</span>
                  </span>
                  <span style="font-family:var(--font-num);font-weight:600;">${fmtMoney(amt)} (${fmtPct(pct, 0)})</span>
                </div>
                <div class="hb-bar" style="height:8px;">
                  <div style="width:${Math.min(100, pct * 100)}%;background:${catType === 'Essential' ? 'var(--navy)' : 'var(--steel)'};"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <div class="section-title">AI Financial Insights</div>
    <div class="card ai-card">
      ${generateAIInsights(key).map(insight => `
        <div class="ai-insight">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <div>${insight}</div>
        </div>
      `).join('')}
    </div>

    <div class="section-title">Financial Alerts &amp; Recommendations</div>
    <div class="alert-list">
      ${alerts.map(a => `<div class="alert ${a.type}">${a.type === 'good' ? '✓' : a.type === 'bad' ? '✕' : '⚠'} <span>${a.text}</span></div>`).join('')}
    </div>

    <div class="section-title">Next 30 Days</div>
    <div class="card">
      ${(() => {
        if (n30.items.length === 0) {
          return `<div class="empty" style="padding:20px 0;"><b>Nothing due in the next 30 days</b>Debt payments and recurring expenses with due dates will show up here.</div>`;
        }
        return `
          <table>
            <thead><tr><th>Date</th><th>Obligation</th><th>Type</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${n30.items.map((i, idx) => `<tr>
                <td>${fmtDate(i.date)}</td><td>${escapeHtml(i.name)}</td>
                <td><span class="tag ${i.type === 'Debt' ? 'debt' : i.type === 'Essential' ? 'essential' : 'nonessential'}">${i.type}</span></td>
                <td class="num">${fmtMoney(i.amount)}</td>
                <td><span class="status ${daysUntil(i.date) <= 3 ? 'over' : 'ontrack'}">${daysUntil(i.date)}d away</span></td>
                <td><button class="quick-pay-btn" data-n30-pay="${idx}">Quick Pay</button></td>
              </tr>`).join('')}
            </tbody>
            <tfoot><tr><td colspan="3">Total commitments due</td><td class="num">${fmtMoney(n30.totalDue)}</td><td colspan="2"></td></tr></tfoot>
          </table>
          <div class="divider"></div>
          <div class="grid kpi-grid">
            <div><div class="kpi-label">Cash Available</div><div class="kpi-value" style="font-size:18px;">${fmtMoney(n30.available)}</div></div>
            <div><div class="kpi-label">${n30.shortfall > 0 ? 'Shortfall' : 'Surplus'}</div><div class="kpi-value" style="font-size:18px;color:${n30.shortfall > 0 ? 'var(--bad)' : 'var(--good)'}">${fmtMoney(Math.abs(n30.shortfall))}</div></div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <a href="#recurring" style="font-size:12.5px;color:var(--steel);font-weight:600;display:inline-flex;align-items:center;gap:4px;">Manage Recurring Obligations →</a>
          </div>`;
      })()}
    </div>

    <div class="section-title">Financial Trends</div>
    <div class="grid two-col">
      <div class="card chart-card">
        <div class="card-title">Income vs Outflows by Month</div>
        <canvas id="chartIncomeOutflow"></canvas>
        ${legendHtml([{ name: 'Income', color: '#0B2545' }, { name: 'Outflows', color: '#3E7CB1' }])}
      </div>
      <div class="card chart-card">
        <div class="card-title">Net Worth Trend</div>
        <canvas id="chartNetWorth"></canvas>
        ${legendHtml([{ name: 'Net Worth', color: '#0B2545' }])}
      </div>
    </div>
  `;

  wireMonthStepper(root);
  $('#qaAddTx').onclick = () => openTransactionModal();

  $$('[data-n30-pay]', root).forEach(btn => {
    btn.onclick = () => {
      const item = n30.items[parseInt(btn.dataset.n30Pay, 10)];
      if (!item) return;
      openTransactionModal({
        date: todayISO(),
        type: item.type === 'Debt' ? 'Debt Payment' : 'Expense',
        category: item.category || (item.type === 'Debt' ? 'Loan Repayment' : 'Housing'),
        subcategory: item.name,
        description: item.name,
        amount: item.amount,
        account: 'Cash',
        method: item.type === 'Debt' ? 'Bank Transfer' : 'Cash',
      });
    };
  });

  const monthsList = allMonthKeys();
  const incomeSeries = monthsList.map(k => monthSummary(k).income);
  const outflowSeries = monthsList.map(k => { const m = monthSummary(k); return m.totalOutflow; });
  drawGroupedBarChart($('#chartIncomeOutflow'), monthsList.map(monthLabelShort), [
    { name: 'Income', color: '#0B2545', data: incomeSeries },
    { name: 'Outflows', color: '#3E7CB1', data: outflowSeries },
  ]);

  const nw = netWorthSeries();
  const nwKnown = nw.every(n => n.netWorth !== null);
  drawLineChart($('#chartNetWorth'), monthsList.map(monthLabelShort), [
    { name: nwKnown ? 'Net Worth' : 'Net Worth (assets only — debt not yet entered)', color: '#0B2545', data: nw.map(n => n.netWorth === null ? n.assets : n.netWorth) },
  ]);
}

/* ---------------------------- View: Transactions ---------------------------- */

function renderTransactions(root) {
  const months = allMonthKeys();
  const filters = state.txFilters || { month: 'all', type: 'all', q: '' };
  state.txFilters = filters;
  const sort = state.txSort || { col: 'date', dir: 'desc' };
  state.txSort = sort;
  const pageSize = state.txPageSize || 25;
  state.txPageSize = pageSize;
  let page = state.txPage || 1;

  let list = [...state.data.transactions];
  if (filters.month !== 'all') list = list.filter(t => monthKey(t.date) === filters.month);
  if (filters.type !== 'all') list = list.filter(t => t.type === filters.type);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(t => `${t.description} ${t.category} ${t.subcategory} ${t.notes} ${t.account}`.toLowerCase().includes(q));
  }

  // Sort list
  list.sort((a, b) => {
    let cmp = 0;
    if (sort.col === 'date') cmp = (a.date || '').localeCompare(b.date || '');
    else if (sort.col === 'amount') cmp = (Number(a.amount) || 0) - (Number(b.amount) || 0);
    else if (sort.col === 'category') cmp = (a.category || '').localeCompare(b.category || '');
    else if (sort.col === 'type') cmp = (a.type || '').localeCompare(b.type || '');
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  const totalIn = sumTx(list, 'Income');
  const totalOut = list.filter(t => t.type !== 'Income' && t.type !== 'Transfer').reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalItems = list.length;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalItems / pageSize) || 1;
  if (page > totalPages) page = totalPages;
  state.txPage = page;

  const pagedList = pageSize === 'all' ? list : list.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = totalItems === 0 ? 0 : (page - 1) * (pageSize === 'all' ? totalItems : pageSize) + 1;
  const endIdx = pageSize === 'all' ? totalItems : Math.min(page * pageSize, totalItems);

  const sortArrow = (col) => {
    if (sort.col !== col) return '';
    return sort.dir === 'asc' ? ' ▲' : ' ▼';
  };

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Transactions</h1>
        <p class="view-sub">Every income, expense, debt payment and savings entry in one place</p>
      </div>
      <div class="view-actions">
        <button class="btn" id="exportBtn">Export CSV</button>
        <button class="btn btn-primary" id="addTxBtn">+ Add Transaction</button>
      </div>
    </div>

    <div class="filter-bar">
      <select id="fMonth"><option value="all">All months</option>${months.map(m => `<option value="${m}" ${filters.month === m ? 'selected' : ''}>${escapeHtml(monthLabel(m))}</option>`).join('')}</select>
      <select id="fType"><option value="all">All types</option>${TX_TYPES.map(t => `<option value="${t}" ${filters.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input type="search" id="fSearch" placeholder="Search description / category…" value="${escapeHtml(filters.q)}" style="min-width:220px;" />
    </div>

    <div class="scroll-hint">⇆ Swipe sideways to see all columns</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="sortable" data-sort="date">Date${sortArrow('date')}</th>
          <th class="sortable" data-sort="type">Type${sortArrow('type')}</th>
          <th class="sortable" data-sort="category">Category${sortArrow('category')}</th>
          <th>Subcategory</th>
          <th>Description</th>
          <th class="num sortable" data-sort="amount">Amount${sortArrow('amount')}</th>
          <th>Account</th>
          <th>Method</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${pagedList.length === 0 ? `<tr><td colspan="9"><div class="empty"><b>No transactions found</b>Try clearing filters or add a new entry.</div></td></tr>` : ''}
          ${pagedList.map(t => `
            <tr>
              <td>${fmtDate(t.date)}</td>
              <td><span class="tag ${t.type === 'Income' ? 'income' : t.type === 'Debt Payment' ? 'debt' : t.type === 'Savings' ? 'savings' : t.type === 'Transfer' ? 'essential' : classify(t.category) === 'Essential' ? 'essential' : 'nonessential'}">${t.type}</span></td>
              <td>${escapeHtml(t.category)}</td>
              <td>${escapeHtml(t.subcategory || '')}</td>
              <td>${escapeHtml(t.description || '')}</td>
              <td class="num">${fmtMoney(t.amount)}</td>
              <td>${t.type === 'Transfer' && t.toAccount ? `${escapeHtml(t.account)} → ${escapeHtml(t.toAccount)}` : escapeHtml(t.account || '')}</td>
              <td>${escapeHtml(t.method || '')}</td>
              <td><div class="row-actions">
                <button data-edit="${t.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
                <button data-del="${t.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
              </div></td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="5">Totals (${list.length} filtered)</td><td class="num">${fmtMoney(totalIn)} in / ${fmtMoney(totalOut)} out</td><td colspan="3"></td></tr>
        </tfoot>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <div>Showing <b>${startIdx}–${endIdx}</b> of <b>${totalItems}</b> transactions</div>
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span>Per page:</span>
          <select id="txPageSize" style="padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:12px;">
            <option value="25" ${pageSize === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
            <option value="all" ${pageSize === 'all' ? 'selected' : ''}>All</option>
          </select>
        </div>
        <div class="pagination-btns">
          <button id="txPrevPage" ${page <= 1 ? 'disabled' : ''}>◀ Prev</button>
          <span>Page ${page} of ${totalPages}</span>
          <button id="txNextPage" ${page >= totalPages ? 'disabled' : ''}>Next ▶</button>
        </div>
      </div>
    </div>
  `;

  $('#fMonth').onchange = (e) => { filters.month = e.target.value; state.txPage = 1; renderView(); };
  $('#fType').onchange = (e) => { filters.type = e.target.value; state.txPage = 1; renderView(); };
  $('#fSearch').oninput = (e) => { filters.q = e.target.value; state.txPage = 1; renderView(); };
  $('#addTxBtn').onclick = () => openTransactionModal();
  $('#exportBtn').onclick = () => exportTransactionsCSV(list);

  $('#txPageSize').onchange = (e) => {
    state.txPageSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
    state.txPage = 1;
    renderView();
  };
  const prevBtn = $('#txPrevPage');
  if (prevBtn) prevBtn.onclick = () => { if (state.txPage > 1) { state.txPage--; renderView(); } };
  const nextBtn = $('#txNextPage');
  if (nextBtn) nextBtn.onclick = () => { if (state.txPage < totalPages) { state.txPage++; renderView(); } };

  $$('th.sortable', root).forEach(th => {
    th.onclick = () => {
      const col = th.dataset.sort;
      if (sort.col === col) {
        sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        sort.col = col;
        sort.dir = 'asc';
      }
      renderView();
    };
  });

  $$('[data-edit]', root).forEach(btn => btn.onclick = () => {
    const tx = state.data.transactions.find(t => t.id === btn.dataset.edit);
    openTransactionModal(tx);
  });
  $$('[data-del]', root).forEach(btn => btn.onclick = () => {
    confirmDialog('Delete this transaction? This cannot be undone.', () => {
      state.data.transactions = state.data.transactions.filter(t => t.id !== btn.dataset.del);
      saveData(); renderView();
    });
  });
}

function autoCategorize(desc, type) {
  desc = (desc || '').toLowerCase();
  const cats = categoryOptionsFor(type);
  if (type === 'Income') {
    if (desc.includes('salary')) return cats.find(c => c.toLowerCase() === 'salary') || cats[0];
    if (desc.includes('bonus')) return cats.find(c => c.toLowerCase() === 'bonus') || cats[0];
  } else if (type === 'Expense') {
    if (desc.includes('food') || desc.includes('grocery') || desc.includes('supermarket') || desc.includes('shoprite')) return cats.find(c => c.toLowerCase() === 'food') || cats[0];
    if (desc.includes('uber') || desc.includes('taxi') || desc.includes('transport') || desc.includes('bus') || desc.includes('fuel')) return cats.find(c => c.toLowerCase() === 'transport') || cats[0];
    if (desc.includes('rent') || desc.includes('house') || desc.includes('water') || desc.includes('electric') || desc.includes('zesco')) return cats.find(c => c.toLowerCase() === 'housing') || cats[0];
    if (desc.includes('eat') || desc.includes('dining') || desc.includes('restaurant') || desc.includes('cafe')) return cats.find(c => c.toLowerCase() === 'dining out') || cats[0];
    if (desc.includes('health') || desc.includes('pharmacy') || desc.includes('hospital') || desc.includes('clinic')) return cats.find(c => c.toLowerCase() === 'healthcare') || cats[0];
    if (desc.includes('school') || desc.includes('tuition') || desc.includes('book')) return cats.find(c => c.toLowerCase() === 'education') || cats[0];
  }
  return null;
}

function openTransactionModal(tx) {
  const isEdit = !!(tx && tx.id);
  const type = tx ? tx.type : 'Expense';
  const accountsList = allAccounts();
  const creditors = allCreditors();

  openModal({
    title: isEdit ? 'Edit Transaction' : 'Add Transaction',
    submitLabel: isEdit ? 'Save Changes' : 'Add Transaction',
    bodyHtml: `
      <div class="field-row">
        <div class="field"><label>Date</label><input type="date" name="date" required value="${tx ? tx.date : todayISO()}"></div>
        <div class="field"><label>Type</label>
          <select name="type" id="txType">${selectOptions(TX_TYPES, type)}</select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Category</label><select name="category" id="txCategory">${selectOptions(categoryOptionsFor(type), tx ? tx.category : '')}</select></div>
        <div class="field"><label>Amount</label><input type="number" step="0.01" min="0" name="amount" required value="${tx ? tx.amount : ''}"></div>
      </div>
      <div class="field" id="creditorSelectWrap" ${type === 'Debt Payment' && creditors.length ? '' : 'hidden'}>
        <label>Creditor (links to Debt Tracker)</label>
        <select id="txCreditorSelect">
          <option value="">-- Choose Creditor or enter below --</option>
          ${creditors.map(c => `<option value="${escapeHtml(c)}" ${tx && (tx.subcategory === c || tx.description === c) ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Subcategory / Who / What</label><input type="text" name="subcategory" id="txSubcategory" value="${tx ? escapeHtml(tx.subcategory || '') : ''}" placeholder="e.g. Housing, Wizzie, School fees"></div>
      <div class="field">
        <label>Description (optional)</label>
        <div style="display:flex;gap:8px;">
          <input type="text" name="description" id="txDescription" value="${tx ? escapeHtml(tx.description || '') : ''}" style="flex:1;">
          <button type="button" class="btn-ai" id="aiCatBtn" title="Auto-categorize based on description">✨ Predict Category</button>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label id="accountLabel">${type === 'Transfer' ? 'From Account' : 'Account'}</label><select name="account">${selectOptions(accountsList, tx ? tx.account : accountsList[0])}</select></div>
        <div class="field" id="toAccountField" ${type === 'Transfer' ? '' : 'hidden'}>
          <label>To Account</label><select name="toAccount">${selectOptions(accountsList, tx ? tx.toAccount : (accountsList[1] || accountsList[0]))}</select>
        </div>
        <div class="field" id="methodField" ${type === 'Transfer' ? 'hidden' : ''}>
          <label>Payment Method</label><select name="method">${selectOptions(PAYMENT_METHODS, tx ? tx.method : 'Cash')}</select>
        </div>
      </div>
      <div class="field"><label>Notes (optional)</label><textarea name="notes" rows="2">${tx ? escapeHtml(tx.notes || '') : ''}</textarea></div>
    `,
    onMount: (mRoot) => {
      $('#txType', mRoot).onchange = (e) => {
        const val = e.target.value;
        $('#txCategory', mRoot).innerHTML = selectOptions(categoryOptionsFor(val), '');
        const isTransfer = val === 'Transfer';
        const isDebt = val === 'Debt Payment';
        $('#toAccountField', mRoot).hidden = !isTransfer;
        $('#methodField', mRoot).hidden = isTransfer;
        $('#accountLabel', mRoot).textContent = isTransfer ? 'From Account' : 'Account';
        const credWrap = $('#creditorSelectWrap', mRoot);
        if (credWrap) credWrap.hidden = !(isDebt && creditors.length);
      };
      const credSelect = $('#txCreditorSelect', mRoot);
      if (credSelect) {
        credSelect.onchange = (e) => {
          if (e.target.value) {
            $('#txSubcategory', mRoot).value = e.target.value;
          }
        };
      }
      const aiBtn = $('#aiCatBtn', mRoot);
      if (aiBtn) {
        aiBtn.onclick = () => {
          const desc = $('#txDescription', mRoot).value || $('#txSubcategory', mRoot).value;
          const type = $('#txType', mRoot).value;
          const guess = autoCategorize(desc, type);
          if (guess) {
            $('#txCategory', mRoot).value = guess;
            toast('✨ Category predicted: ' + guess);
          } else {
            toast('Could not predict category from description.');
          }
        };
      }
    },
    onSubmit: (data) => {
      if (data.type === 'Transfer' && data.account === data.toAccount) {
        toast('⚠ Pick two different accounts for a transfer.');
        return false;
      }
      const payload = {
        date: data.date, type: data.type, category: data.category,
        subcategory: data.subcategory || data.category, description: data.description || '',
        amount: parseFloat(data.amount) || 0, account: data.account,
        toAccount: data.type === 'Transfer' ? data.toAccount : null,
        method: data.type === 'Transfer' ? '' : data.method, notes: data.notes || '',
      };
      if (isEdit) {
        Object.assign(tx, payload);
      } else {
        state.data.transactions.push({ id: uid('tx'), ...payload });
      }
      saveData(); renderView();
      toast(isEdit ? 'Transaction updated.' : 'Transaction added.');
    },
  });
}

function exportTransactionsCSV(list) {
  const headers = ['Date', 'Type', 'Category', 'Subcategory', 'Description', 'Amount', 'Account', 'Method', 'Notes'];
  const rows = list.map(t => [t.date, t.type, t.category, t.subcategory, t.description, t.amount, t.account, t.method, t.notes]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `transactions_${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------------------- View: Budget ---------------------------- */

/* ---------------------------- View: Budget ---------------------------- */

function renderBudget(root) {
  const key = currentMonthKey();
  const rows = budgetVsActual(key);
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const totalVariance = totalBudget - totalActual;
  const totalPct = totalBudget > 0 ? totalActual / totalBudget : 0;

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Budget vs Actual</h1>
        <p class="view-sub">Monthly budget control — ${escapeHtml(monthLabel(key))}</p>
      </div>
      <div class="view-actions">
        ${renderMonthStepperHtml(key)}
        <button class="btn btn-primary" id="addBudgetCatBtn">+ Add Budget Category</button>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Category</th>
          <th class="num">Monthly Budget</th>
          <th class="num">Actual</th>
          <th class="num">Variance</th>
          <th class="num budget-bar-cell">% Used</th>
          <th>Status</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${rows.map(r => {
            const catType = classify(r.category);
            const fillPct = r.pctUsed === Infinity ? 100 : Math.min(100, Math.round((r.pctUsed || 0) * 100));
            const barColor = r.status === 'under' ? 'var(--good)' : r.status === 'ontrack' ? 'var(--warn)' : 'var(--bad)';
            return `
            <tr>
              <td>
                <b>${escapeHtml(r.category)}</b>
                <span class="tag ${catType === 'Essential' ? 'essential' : 'nonessential'}" style="margin-left:6px;font-size:10px;">${catType}</span>
              </td>
              <td class="num"><input type="number" data-budget="${escapeHtml(r.category)}" value="${r.budget}" style="width:90px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:4px 6px;font-family:var(--font-num);"></td>
              <td class="num">${fmtMoney(r.actual)}</td>
              <td class="num" style="color:${r.variance >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtMoney(r.variance)}</td>
              <td class="num budget-bar-cell">
                <div>${r.pctUsed === Infinity ? '∞' : fmtPct(r.pctUsed, 0)}</div>
                <div class="budget-bar-wrap">
                  <div class="budget-bar-fill" style="width:${fillPct}%;background:${barColor};"></div>
                </div>
              </td>
              <td><span class="status ${r.status}">${r.status === 'under' ? 'UNDER BUDGET' : r.status === 'ontrack' ? 'ON TRACK' : 'OVER BUDGET'}</span></td>
              <td>
                ${!(r.category in state.data.budget) ? `<button class="btn btn-sm" data-set-budget="${escapeHtml(r.category)}" title="Add to permanent budget">+ Set Target</button>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td class="num">${fmtMoney(totalBudget)}</td>
            <td class="num">${fmtMoney(totalActual)}</td>
            <td class="num" style="color:${totalVariance >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtMoney(totalVariance)}</td>
            <td class="num">${fmtPct(totalPct, 0)}</td>
            <td colspan="2">${totalActual > totalBudget ? 'OVER BUDGET' : 'ON PLAN'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="field-hint" style="margin-top:10px;">Edit any budget figure directly in the table — it saves automatically.</div>
  `;

  wireMonthStepper(root);

  $$('[data-budget]', root).forEach(inp => {
    inp.onchange = () => {
      state.data.budget[inp.dataset.budget] = parseFloat(inp.value) || 0;
      saveData(); renderView();
    };
  });

  $$('[data-set-budget]', root).forEach(btn => {
    btn.onclick = () => {
      const cat = btn.dataset.setBudget;
      state.data.budget[cat] = 0;
      saveData(); renderView();
    };
  });

  $('#addBudgetCatBtn').onclick = () => {
    const unbudgeted = [...categoryOptionsFor('Expense')].filter(c => !(c in state.data.budget));
    openModal({
      title: 'Add Category to Budget',
      submitLabel: 'Add Category',
      bodyHtml: `
        <div class="field"><label>Category</label>
          ${unbudgeted.length ? `
            <select name="category" id="catPick">
              ${unbudgeted.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
              <option value="__new__">+ Create New Category...</option>
            </select>
            <div id="newCatField" hidden style="margin-top:8px;">
              <input type="text" name="customCat" placeholder="Enter new category name">
            </div>
          ` : `
            <input type="text" name="customCat" required placeholder="Enter new category name">
          `}
        </div>
        <div class="field"><label>Monthly Budget Amount</label><input type="number" step="0.01" min="0" name="amount" required placeholder="0.00"></div>
      `,
      onMount: (mRoot) => {
        const cp = $('#catPick', mRoot);
        if (cp) {
          cp.onchange = () => {
            const nf = $('#newCatField', mRoot);
            if (nf) nf.hidden = cp.value !== '__new__';
          };
        }
      },
      onSubmit: (data) => {
        let cat = data.category;
        if (!cat || cat === '__new__') cat = (data.customCat || '').trim();
        if (!cat) return false;
        state.data.budget[cat] = parseFloat(data.amount) || 0;
        const cats = getCategories();
        if (!cats.Essential.includes(cat) && !cats['Non-Essential'].includes(cat)) {
          cats['Non-Essential'].push(cat);
        }
        saveData(); renderView();
        toast(`Budget for ${cat} added.`);
      },
    });
  };
}

function monthSelectHtml() {
  const months = allMonthKeys();
  const key = currentMonthKey();
  return `<select class="month-select" id="globalMonthSelect">${months.map(m => `<option value="${m}" ${m === key ? 'selected' : ''}>${escapeHtml(monthLabel(m))}</option>`).join('')}</select>`;
}

function wireMonthSelect() {
  const sel = $('#globalMonthSelect');
  if (sel) sel.onchange = (e) => { state.selectedMonth = e.target.value; syncTopbarMonth(); renderView(); };
}

/* ---------------------------- View: Recurring Obligations ---------------------------- */

function renderRecurring(root) {
  const items = [...state.data.recurring].sort((a, b) => {
    const da = nextOccurrenceDate(a);
    const db = nextOccurrenceDate(b);
    return (da || '').localeCompare(db || '');
  });

  const totalIncome = items.filter(r => r.type === 'Income').reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalExpense = items.filter(r => r.type === 'Expense').reduce((s, r) => s + Number(r.amount || 0), 0);
  const netCommitted = totalIncome - totalExpense;

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Recurring Obligations</h1>
        <p class="view-sub">Manage salary schedules, regular bills, subscriptions and loan deductions</p>
      </div>
      <div class="view-actions">
        <button class="btn btn-primary" id="addRecBtn">+ Add Obligation</button>
      </div>
    </div>

    <div class="grid kpi-grid" style="margin-bottom:20px;">
      <div class="card kpi-card"><div class="kpi-label">Recurring Income</div><div class="kpi-value">${fmtMoney(totalIncome)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Fixed Commitments</div><div class="kpi-value">${fmtMoney(totalExpense)}</div></div>
      <div class="card kpi-card accent"><div class="kpi-label">Net Fixed Position</div><div class="kpi-value">${fmtMoney(netCommitted)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Total Obligations</div><div class="kpi-value">${items.length}</div></div>
    </div>

    <div class="scroll-hint">⇆ Swipe sideways to see all columns</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Item</th>
          <th>Type</th>
          <th>Category</th>
          <th>Frequency</th>
          <th>Day of Month</th>
          <th>Next Due</th>
          <th class="num">Amount</th>
          <th>Status</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${items.length === 0 ? `<tr><td colspan="9"><div class="empty"><b>No recurring obligations yet</b>Add your rent, salary, subscriptions or debt repayments here.</div></td></tr>` : ''}
          ${items.map(r => {
            const nextDate = nextOccurrenceDate(r);
            const days = nextDate ? daysUntil(nextDate) : null;
            const catType = classify(r.category);
            return `
            <tr>
              <td><b>${escapeHtml(r.item)}</b></td>
              <td><span class="tag ${r.type === 'Income' ? 'income' : catType === 'Essential' ? 'essential' : 'nonessential'}">${r.type}</span></td>
              <td>${escapeHtml(r.category)}</td>
              <td>${escapeHtml(r.frequency || 'Monthly')}</td>
              <td>${r.dayOfMonth ? `Day ${r.dayOfMonth}` : '—'}</td>
              <td>${nextDate ? fmtDate(nextDate) : '—'}</td>
              <td class="num">${fmtMoney(r.amount)}</td>
              <td>${days !== null ? `<span class="status ${days <= 3 ? 'over' : 'ontrack'}">${days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days}d away`}</span>` : '—'}</td>
              <td>
                <div class="row-actions">
                  <button class="quick-pay-btn" data-post-rec="${r.id}" title="Log this month's transaction">Post</button>
                  <button data-edit-rec="${r.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
                  <button data-del-rec="${r.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6">Net Monthly Commitment</td>
            <td class="num" style="color:${netCommitted >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtMoney(netCommitted)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="field-hint" style="margin-top:10px;">Click <b>Post</b> next to any obligation to quickly log a transaction for the current month.</div>
  `;

  $('#addRecBtn').onclick = () => openRecurringModal();

  $$('[data-post-rec]', root).forEach(btn => {
    btn.onclick = () => {
      const r = state.data.recurring.find(x => x.id === btn.dataset.postRec);
      if (!r) return;
      openTransactionModal({
        date: todayISO(),
        type: r.type,
        category: r.category,
        subcategory: r.item,
        description: r.item,
        amount: r.amount,
        account: r.type === 'Income' ? 'Bank Account' : 'Cash',
        method: r.type === 'Income' ? 'Bank Transfer' : 'Cash',
      });
    };
  });

  $$('[data-edit-rec]', root).forEach(btn => {
    btn.onclick = () => {
      const r = state.data.recurring.find(x => x.id === btn.dataset.editRec);
      openRecurringModal(r);
    };
  });

  $$('[data-del-rec]', root).forEach(btn => {
    btn.onclick = () => {
      confirmDialog('Delete this recurring obligation?', () => {
        state.data.recurring = state.data.recurring.filter(x => x.id !== btn.dataset.delRec);
        saveData(); renderView();
      });
    };
  });
}

function openRecurringModal(rec) {
  const isEdit = !!rec;
  const type = rec ? rec.type : 'Expense';
  openModal({
    title: isEdit ? 'Edit Recurring Obligation' : 'Add Recurring Obligation',
    submitLabel: isEdit ? 'Save Changes' : 'Add Obligation',
    bodyHtml: `
      <div class="field"><label>Obligation / Income Name</label><input type="text" name="item" required value="${rec ? escapeHtml(rec.item) : ''}" placeholder="e.g. Salary, Rent, WiFi, Netflix"></div>
      <div class="field-row">
        <div class="field"><label>Type</label>
          <select name="type" id="recType">
            <option value="Expense" ${type === 'Expense' ? 'selected' : ''}>Expense / Bill</option>
            <option value="Income" ${type === 'Income' ? 'selected' : ''}>Income</option>
          </select>
        </div>
        <div class="field"><label>Category</label><select name="category" id="recCategory">${selectOptions(categoryOptionsFor(type), rec ? rec.category : '')}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Amount</label><input type="number" step="0.01" min="0" name="amount" required value="${rec ? rec.amount : ''}"></div>
        <div class="field"><label>Frequency</label>
          <select name="frequency">
            <option value="Monthly" ${!rec || rec.frequency === 'Monthly' ? 'selected' : ''}>Monthly</option>
            <option value="Bi-weekly" ${rec && rec.frequency === 'Bi-weekly' ? 'selected' : ''}>Bi-weekly</option>
            <option value="Annual" ${rec && rec.frequency === 'Annual' ? 'selected' : ''}>Annual</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Day of Month (1–31)</label><input type="number" min="1" max="31" name="dayOfMonth" value="${rec ? (rec.dayOfMonth || (rec.dueDate ? Number(rec.dueDate.slice(8,10)) : 1)) : 1}"></div>
        <div class="field"><label>Next / Anchor Due Date</label><input type="date" name="dueDate" value="${rec ? rec.dueDate : todayISO()}"></div>
      </div>
    `,
    onMount: (mRoot) => {
      $('#recType', mRoot).onchange = (e) => {
        $('#recCategory', mRoot).innerHTML = selectOptions(categoryOptionsFor(e.target.value), '');
      };
    },
    onSubmit: (data) => {
      const payload = {
        item: data.item,
        type: data.type,
        category: data.category,
        amount: parseFloat(data.amount) || 0,
        frequency: data.frequency,
        dayOfMonth: parseInt(data.dayOfMonth, 10) || 1,
        dueDate: data.dueDate,
      };
      if (isEdit) {
        Object.assign(rec, payload);
      } else {
        state.data.recurring.push({ id: uid('rec'), ...payload });
      }
      saveData(); renderView();
      toast(isEdit ? 'Obligation updated.' : 'Obligation added.');
    },
  });
}

/* ---------------------------- View: Cash Flow ---------------------------- */

function renderCashflow(root) {
  const series = cashFlowSeries();
  const totals = series.reduce((acc, r) => ({
    income: acc.income + r.income, essential: acc.essential + r.essential, nonEssential: acc.nonEssential + r.nonEssential,
    debtPay: acc.debtPay + r.debtPay, savings: acc.savings + r.savings, totalOutflow: acc.totalOutflow + r.totalOutflow,
    netCashFlow: acc.netCashFlow + r.netCashFlow,
  }), { income: 0, essential: 0, nonEssential: 0, debtPay: 0, savings: 0, totalOutflow: 0, netCashFlow: 0 });

  root.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Cash Flow &amp; Projections</h1><p class="view-sub">Monthly cash position across all recorded months</p></div>
    </div>
    <div class="scroll-hint">⇆ Swipe sideways to see all columns</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Month</th><th class="num">Beginning Cash</th><th class="num">Income</th><th class="num">Essential</th>
          <th class="num">Non-Essential</th><th class="num">Debt</th><th class="num">Savings</th>
          <th class="num">Net Cash Flow</th><th class="num">Ending Cash</th>
        </tr></thead>
        <tbody>
          ${series.map(r => `
            <tr>
              <td>${escapeHtml(monthLabel(r.key))}</td>
              <td class="num">${fmtMoney(r.beginning)}</td>
              <td class="num">${fmtMoney(r.income)}</td>
              <td class="num">${fmtMoney(r.essential)}</td>
              <td class="num">${fmtMoney(r.nonEssential)}</td>
              <td class="num">${fmtMoney(r.debtPay)}</td>
              <td class="num">${fmtMoney(r.savings)}</td>
              <td class="num" style="color:${r.netCashFlow >= 0 ? 'var(--good)' : 'var(--bad)'}">${fmtMoney(r.netCashFlow)}</td>
              <td class="num" style="font-weight:700;">${fmtMoney(r.ending)}</td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td><td></td><td class="num">${fmtMoney(totals.income)}</td><td class="num">${fmtMoney(totals.essential)}</td>
            <td class="num">${fmtMoney(totals.nonEssential)}</td><td class="num">${fmtMoney(totals.debtPay)}</td>
            <td class="num">${fmtMoney(totals.savings)}</td><td class="num">${fmtMoney(totals.netCashFlow)}</td>
            <td class="num">${fmtMoney(series.length ? series[series.length - 1].ending : 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

/* ---------------------------- View: Debt ---------------------------- */

function renderDebt(root) {
  const { rows, totalOriginal, totalPaid, totalBalance, anyMissing, totalMinPayment, totalPlanned } = debtStats();
  const pctPaid = totalOriginal > 0 ? totalPaid / totalOriginal : 0;
  const strategy = state.debtStrategy || 'Avalanche';
  state.debtStrategy = strategy;

  const ranked = [...rows].sort((a, b) => {
    if (strategy === 'Avalanche') return (b.interestRate || 0) - (a.interestRate || 0);
    return (a.balance ?? Infinity) - (b.balance ?? Infinity);
  });

  const avalancheProj = calculateDebtPayoff(rows, 'Avalanche');
  const snowballProj = calculateDebtPayoff(rows, 'Snowball');

  root.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Debt Management</h1><p class="view-sub">Tracker, prioritisation &amp; reduction</p></div>
      <div class="view-actions">
        <button class="btn" id="recordPaymentBtn">+ Record Payment</button>
        <button class="btn btn-primary" id="addDebtBtn">+ Add Creditor</button>
      </div>
    </div>

    ${anyMissing ? `<div class="banner warn">⚠ <span>Enter each creditor's <b>Opening Balance</b> (and interest rate) below for an accurate Total Debt figure. Until then, totals reflect only what's known.</span></div>` : ''}

    <div class="grid kpi-grid" style="margin-bottom:20px;">
      <div class="card kpi-card"><div class="kpi-label">Total Debt</div><div class="kpi-value">${fmtMoney(totalBalance)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Debt Paid</div><div class="kpi-value">${fmtMoney(totalPaid)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">% Paid</div><div class="kpi-value">${!anyMissing && totalOriginal > 0 ? fmtPct(pctPaid, 0) : '—'}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Monthly Repayments</div><div class="kpi-value">${fmtMoney(totalPlanned)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Debt-to-Income</div><div class="kpi-value">${fmtPct(debtToIncome())}</div></div>
    </div>

    <!-- Debt Payoff Projection -->
    <div class="section-title">Debt-Free Projection &amp; Strategy Comparison</div>
    <div class="card" style="margin-bottom:20px;">
      <p class="field-hint" style="margin-top:0;">Projections based on your planned payment of <b>${fmtMoney(totalPlanned)}/mo</b> across active debts.</p>
      <div class="payoff-grid">
        <div class="payoff-box ${strategy === 'Avalanche' ? 'highlight' : ''}">
          <div class="payoff-title">Avalanche (Highest Interest First) ${strategy === 'Avalanche' ? '— ACTIVE' : ''}</div>
          <div class="payoff-value">${avalancheProj.debtFreeDate}</div>
          <div class="payoff-sub">${avalancheProj.months} months • Total interest: ${fmtMoney(avalancheProj.totalInterest)}</div>
        </div>
        <div class="payoff-box ${strategy === 'Snowball' ? 'highlight' : ''}">
          <div class="payoff-title">Snowball (Smallest Balance First) ${strategy === 'Snowball' ? '— ACTIVE' : ''}</div>
          <div class="payoff-value">${snowballProj.debtFreeDate}</div>
          <div class="payoff-sub">${snowballProj.months} months • Total interest: ${fmtMoney(snowballProj.totalInterest)}</div>
        </div>
      </div>
      ${avalancheProj.totalInterest < snowballProj.totalInterest ? `
        <div class="field-hint" style="margin-top:10px;color:var(--good);font-weight:600;">
          💡 The Avalanche strategy saves an estimated ${fmtMoney(snowballProj.totalInterest - avalancheProj.totalInterest)} in interest over the life of your debt.
        </div>
      ` : ''}
    </div>

    <div class="scroll-hint">⇆ Swipe sideways to see all columns</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Creditor</th><th class="num">Original Amount</th><th class="num">Current Balance</th><th class="num">Interest</th>
          <th class="num">Min Payment</th><th class="num">Planned Payment</th><th class="num">Paid</th><th>Due</th><th>Priority</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${rows.map(d => `
            <tr>
              <td>${escapeHtml(d.creditor)}</td>
              <td class="num"><input type="number" data-field="original" data-id="${d.id}" value="${d.original ?? ''}" placeholder="Enter…" style="width:90px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:4px 6px;font-family:var(--font-num);"></td>
              <td class="num">${d.balance === null ? '—' : fmtMoney(d.balance)}</td>
              <td class="num"><input type="number" step="0.1" data-field="interestRate" data-id="${d.id}" value="${d.interestRate ?? 0}" style="width:60px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:4px 6px;font-family:var(--font-num);">%</td>
              <td class="num">${fmtMoney(d.minPayment)}</td>
              <td class="num">${fmtMoney(d.plannedPayment)}</td>
              <td class="num">${fmtMoney(d.paid)}</td>
              <td>${fmtDate(d.dueDate)}</td>
              <td>${escapeHtml(d.priority)}</td>
              <td><span class="status ${d.status === 'PAID OFF' ? 'paid' : d.status === 'unknown' ? 'ontrack' : 'active'}">${d.status === 'unknown' ? 'ENTER BALANCE' : d.status}</span></td>
              <td>
                <div class="row-actions">
                  <button class="quick-pay-btn" data-pay-debt="${d.id}" title="Record a payment">Pay</button>
                  <button data-edit-debt="${d.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
                  <button data-del-debt="${d.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td>TOTAL</td><td class="num">${fmtMoney(totalOriginal)}</td><td class="num">${fmtMoney(totalBalance)}</td><td></td>
              <td class="num">${fmtMoney(totalMinPayment)}</td><td class="num">${fmtMoney(totalPlanned)}</td><td class="num">${fmtMoney(totalPaid)}</td>
              <td colspan="4">${totalBalance === 0 && !anyMissing ? 'PAID OFF' : ''}</td></tr>
        </tfoot>
      </table>
    </div>

    <div class="section-title">Debt Prioritisation Strategy</div>
    <div class="card" style="margin-bottom:20px;">
      <div class="field" style="max-width:260px;margin-bottom:14px;">
        <label>Strategy</label>
        <select id="strategySelect">
          <option value="Avalanche" ${strategy === 'Avalanche' ? 'selected' : ''}>Avalanche — highest interest first</option>
          <option value="Snowball" ${strategy === 'Snowball' ? 'selected' : ''}>Snowball — smallest balance first</option>
        </select>
      </div>
      <table>
        <thead><tr><th>Rank</th><th>Creditor</th><th class="num">Balance</th><th class="num">Interest</th><th class="num">Planned Payment</th></tr></thead>
        <tbody>
          ${ranked.map((d, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(d.creditor)}</td><td class="num">${d.balance === null ? '—' : fmtMoney(d.balance)}</td><td class="num">${(d.interestRate || 0).toFixed(1)}%</td><td class="num">${fmtMoney(d.plannedPayment)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="section-title">Monthly Debt Payments</div>
    <div class="card chart-card">
      <canvas id="chartDebtPay"></canvas>
    </div>
  `;

  const months = allMonthKeys();
  drawGroupedBarChart($('#chartDebtPay'), months.map(monthLabelShort), [
    { name: 'Debt Paid', color: '#3E7CB1', data: months.map(k => monthSummary(k).debtPay) },
  ]);

  $('#addDebtBtn').onclick = () => openDebtModal();
  $('#recordPaymentBtn').onclick = () => {
    openTransactionModal({
      date: todayISO(),
      type: 'Debt Payment',
      category: 'Loan Repayment',
      amount: '',
      account: 'Cash',
      method: 'Cash',
    });
  };

  $$('[data-pay-debt]', root).forEach(btn => {
    btn.onclick = () => {
      const d = state.data.debts.find(x => x.id === btn.dataset.payDebt);
      if (!d) return;
      openTransactionModal({
        date: todayISO(),
        type: 'Debt Payment',
        category: d.priority === 'High' ? 'Loan Repayment' : 'Informal Debt',
        subcategory: d.creditor,
        description: `Payment to ${d.creditor}`,
        amount: d.plannedPayment || d.minPayment || '',
        account: 'Cash',
        method: 'Cash',
      });
    };
  });

  $('#strategySelect').onchange = (e) => { state.debtStrategy = e.target.value; renderView(); };
  $$('[data-field]', root).forEach(inp => {
    inp.onchange = () => {
      const d = state.data.debts.find(x => x.id === inp.dataset.id);
      const val = inp.value === '' ? null : parseFloat(inp.value);
      d[inp.dataset.field] = val;
      saveData(); renderView();
    };
  });
  $$('[data-edit-debt]', root).forEach(btn => btn.onclick = () => {
    openDebtModal(state.data.debts.find(d => d.id === btn.dataset.editDebt));
  });
  $$('[data-del-debt]', root).forEach(btn => btn.onclick = () => {
    confirmDialog('Remove this creditor from the debt register?', () => {
      state.data.debts = state.data.debts.filter(d => d.id !== btn.dataset.delDebt);
      saveData(); renderView();
    });
  });
}

function openDebtModal(debt) {
  const isEdit = !!debt;
  openModal({
    title: isEdit ? 'Edit Creditor' : 'Add Creditor',
    submitLabel: isEdit ? 'Save Changes' : 'Add Creditor',
    bodyHtml: `
      <div class="field"><label>Creditor Name</label><input type="text" name="creditor" required value="${debt ? escapeHtml(debt.creditor) : ''}"></div>
      <div class="field-row">
        <div class="field"><label>Original / Opening Balance</label><input type="number" step="0.01" name="original" value="${debt && debt.original !== null ? debt.original : ''}" placeholder="Leave blank if unknown"></div>
        <div class="field"><label>Interest Rate (%)</label><input type="number" step="0.1" name="interestRate" value="${debt ? debt.interestRate || 0 : 0}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Minimum Payment</label><input type="number" step="0.01" name="minPayment" value="${debt ? debt.minPayment : ''}"></div>
        <div class="field"><label>Planned Payment</label><input type="number" step="0.01" name="plannedPayment" value="${debt ? debt.plannedPayment : ''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Due Date</label><input type="date" name="dueDate" value="${debt ? debt.dueDate : todayISO()}"></div>
        <div class="field"><label>Priority</label><select name="priority">${selectOptions(['High', 'Medium', 'Low'], debt ? debt.priority : 'Medium')}</select></div>
      </div>
    `,
    onSubmit: (data) => {
      const payload = {
        creditor: data.creditor,
        original: data.original === '' ? null : parseFloat(data.original),
        interestRate: parseFloat(data.interestRate) || 0,
        minPayment: parseFloat(data.minPayment) || 0,
        plannedPayment: parseFloat(data.plannedPayment) || 0,
        dueDate: data.dueDate, startDate: debt ? debt.startDate : todayISO(), priority: data.priority,
      };
      if (isEdit) Object.assign(debt, payload);
      else state.data.debts.push({ id: uid('debt'), ...payload });
      saveData(); renderView();
      toast(isEdit ? 'Creditor updated.' : 'Creditor added.');
    },
  });
}

/* ---------------------------- View: Savings ---------------------------- */

function renderSavings(root) {
  const goals = state.data.goals;
  const totalTarget = goals.reduce((s, g) => s + Number(g.target || 0), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.current || 0), 0);

  root.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Savings Goals</h1><p class="view-sub">What you're saving toward, and how close you are</p></div>
      <div class="view-actions"><button class="btn btn-primary" id="addGoalBtn">+ Add Goal</button></div>
    </div>

    <div class="grid kpi-grid" style="margin-bottom:20px;">
      <div class="card kpi-card"><div class="kpi-label">Total Target</div><div class="kpi-value">${fmtMoney(totalTarget)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Total Saved</div><div class="kpi-value">${fmtMoney(totalCurrent)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Remaining</div><div class="kpi-value">${fmtMoney(totalTarget - totalCurrent)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Overall Complete</div><div class="kpi-value">${totalTarget > 0 ? fmtPct(totalCurrent / totalTarget, 0) : '—'}</div></div>
    </div>

    ${goals.length === 0 ? `<div class="empty card"><b>No savings goals yet</b>Add one — Emergency Fund is a great place to start.</div>` : ''}

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));">
      ${goals.map(g => {
        const pct = g.target > 0 ? Math.min(1, g.current / g.target) : 0;
        const remaining = Math.max(0, g.target - g.current);
        const monthsLeft = g.targetDate ? Math.max(1, Math.round((new Date(g.targetDate) - new Date()) / (30 * 86400000))) : null;
        const requiredMonthly = monthsLeft ? remaining / monthsLeft : null;
        const isEmergency = g.name.toLowerCase().includes('emergency');
        const recommended = isEmergency ? emergencyFundTarget() : null;
        const outOfSync = recommended !== null && Math.abs(recommended - g.target) > 1;
        return `
        <div class="card goal-card">
          <div class="goal-top"><span class="goal-name">${escapeHtml(g.name)}</span><span class="goal-pct">${fmtPct(pct, 0)}</span></div>
          <div class="progress"><div style="width:${pct * 100}%"></div></div>
          <div class="goal-meta"><span>${fmtMoney(g.current)} / ${fmtMoney(g.target)}</span><span>${g.targetDate ? fmtDate(g.targetDate) : 'No target date'}</span></div>
          ${requiredMonthly !== null ? `<div class="field-hint" style="margin-top:8px;">Needs ~${fmtMoney(requiredMonthly)}/mo to reach goal on time.</div>` : ''}
          ${isEmergency ? `<div class="field-hint" style="margin-top:4px;">Recommended target: ${fmtMoney(recommended)} (${state.data.settings.emergencyFundMonths} × avg essential expenses).${outOfSync ? ` <a href="#" data-sync-emergency="${g.id}" style="color:var(--steel);font-weight:700;">Use this →</a>` : ''}</div>` : ''}
          <div class="row-actions" style="margin-top:12px;justify-content:flex-end;">
            <button data-add-funds="${g.id}" class="btn btn-sm">+ Add Funds</button>
            <button data-withdraw-goal="${g.id}" class="btn btn-sm">Withdraw</button>
            <button data-edit-goal="${g.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
            <button data-del-goal="${g.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;

  $('#addGoalBtn').onclick = () => openGoalModal();
  $$('[data-edit-goal]', root).forEach(btn => btn.onclick = () => openGoalModal(goals.find(g => g.id === btn.dataset.editGoal)));
  $$('[data-sync-emergency]', root).forEach(a => a.onclick = (e) => {
    e.preventDefault();
    const g = goals.find(x => x.id === a.dataset.syncEmergency);
    g.target = Math.round(emergencyFundTarget());
    saveData(); renderView();
    toast('Emergency Fund target updated.');
  });
  $$('[data-del-goal]', root).forEach(btn => btn.onclick = () => {
    confirmDialog('Delete this savings goal?', () => {
      state.data.goals = state.data.goals.filter(g => g.id !== btn.dataset.delGoal);
      saveData(); renderView();
    });
  });
  $$('[data-add-funds]', root).forEach(btn => btn.onclick = () => {
    const g = goals.find(x => x.id === btn.dataset.addFunds);
    const accts = allAccounts();
    openModal({
      title: `Add Funds — ${g.name}`,
      submitLabel: 'Add Funds',
      bodyHtml: `
        <div class="field"><label>Amount</label><input type="number" step="0.01" min="0.01" name="amount" required></div>
        <div class="field"><label>Date</label><input type="date" name="date" value="${todayISO()}"></div>
        <div class="field"><label>Source Account</label><select name="account">${selectOptions(accts, 'Bank Account')}</select></div>
      `,
      onSubmit: (data) => {
        const amt = parseFloat(data.amount) || 0;
        g.current = Number(g.current || 0) + amt;
        state.data.transactions.push({
          id: uid('tx'), date: data.date, type: 'Savings', category: 'Savings Contribution',
          subcategory: g.name, description: `Savings: ${g.name}`, amount: amt, account: data.account, method: 'Bank Transfer', notes: '',
        });
        saveData(); renderView();
        toast(`Added ${fmtMoney(amt)} to ${g.name}.`);
      },
    });
  });
  $$('[data-withdraw-goal]', root).forEach(btn => btn.onclick = () => {
    const g = goals.find(x => x.id === btn.dataset.withdrawGoal);
    const accts = allAccounts();
    openModal({
      title: `Withdraw Funds — ${g.name}`,
      submitLabel: 'Withdraw',
      bodyHtml: `
        <div class="field"><label>Amount (Current balance: ${fmtMoney(g.current)})</label><input type="number" step="0.01" min="0.01" max="${g.current}" name="amount" required></div>
        <div class="field"><label>Date</label><input type="date" name="date" value="${todayISO()}"></div>
        <div class="field"><label>Destination Account</label><select name="account">${selectOptions(accts, accts[0])}</select></div>
        <div class="field"><label>Reason / Description</label><input type="text" name="desc" placeholder="e.g. Emergency medical, home repair"></div>
      `,
      onSubmit: (data) => {
        const amt = parseFloat(data.amount) || 0;
        if (amt > g.current) {
          toast('⚠ Amount exceeds current saved funds.');
          return false;
        }
        g.current = Math.max(0, Number(g.current || 0) - amt);
        state.data.transactions.push({
          id: uid('tx'), date: data.date, type: 'Transfer', category: 'Savings Withdrawal',
          subcategory: g.name, description: data.desc || `Withdrawal from ${g.name}`,
          amount: amt, account: 'Savings Account', toAccount: data.account, method: '', notes: '',
        });
        saveData(); renderView();
        toast(`Withdrew ${fmtMoney(amt)} from ${g.name}.`);
      },
    });
  });
}

function openGoalModal(goal) {
  const isEdit = !!goal;
  openModal({
    title: isEdit ? 'Edit Goal' : 'Add Savings Goal',
    submitLabel: isEdit ? 'Save Changes' : 'Add Goal',
    bodyHtml: `
      <div class="field"><label>Goal Name</label><input type="text" name="name" required value="${goal ? escapeHtml(goal.name) : ''}" placeholder="e.g. Emergency Fund, House, Vehicle"></div>
      <div class="field-row">
        <div class="field"><label>Target Amount</label><input type="number" step="0.01" name="target" required value="${goal ? goal.target : ''}"></div>
        <div class="field"><label>Current Amount</label><input type="number" step="0.01" name="current" value="${goal ? goal.current : 0}"></div>
      </div>
      <div class="field"><label>Target Date</label><input type="date" name="targetDate" value="${goal ? goal.targetDate || '' : ''}"></div>
    `,
    onSubmit: (data) => {
      const payload = { name: data.name, target: parseFloat(data.target) || 0, current: parseFloat(data.current) || 0, targetDate: data.targetDate || null, monthly: 0 };
      if (isEdit) Object.assign(goal, payload);
      else state.data.goals.push({ id: uid('goal'), ...payload });
      saveData(); renderView();
      toast(isEdit ? 'Goal updated.' : 'Goal added.');
    },
  });
}

/* ---------------------------- View: Net Worth ---------------------------- */

function renderNetWorth(root) {
  const series = netWorthSeries();
  const last = series[series.length - 1];
  const first = series[0];
  const change = last && first && last.netWorth !== null && first.netWorth !== null ? last.netWorth - first.netWorth : null;

  root.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Net Worth Tracker</h1><p class="view-sub">Assets (cash + savings) less liabilities, tracked month by month</p></div>
    </div>

    <div class="grid kpi-grid" style="margin-bottom:20px;">
      <div class="card kpi-card"><div class="kpi-label">Total Assets</div><div class="kpi-value">${fmtMoney(last ? last.assets : 0)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Total Debt</div><div class="kpi-value">${last && last.debt !== null ? fmtMoney(last.debt) : '—'}</div></div>
      <div class="card kpi-card accent"><div class="kpi-label">Net Worth</div><div class="kpi-value">${last && last.netWorth !== null ? fmtMoney(last.netWorth) : '—'}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Change (period)</div><div class="kpi-value" style="color:${change >= 0 ? 'var(--good)' : 'var(--bad)'}">${change !== null ? fmtMoney(change) : '—'}</div></div>
    </div>

    <div class="card chart-card" style="margin-bottom:20px;">
      <div class="card-title">Net Worth Trend</div>
      <canvas id="chartNW2"></canvas>
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr><th>Month</th><th class="num">Cash</th><th class="num">Savings</th><th class="num">Total Assets</th><th class="num">Liabilities</th><th class="num">Net Worth</th></tr></thead>
        <tbody>
          ${series.map((r, i) => {
            return `<tr>
              <td>${escapeHtml(monthLabel(r.key))}</td>
              <td class="num">${fmtMoney(r.assets - r.savings)}</td>
              <td class="num">${fmtMoney(r.savings)}</td>
              <td class="num">${fmtMoney(r.assets)}</td>
              <td class="num">${r.debt === null ? '—' : fmtMoney(r.debt)}</td>
              <td class="num" style="font-weight:700;">${r.netWorth === null ? '—' : fmtMoney(r.netWorth)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  const nw2Known = series.every(r => r.netWorth !== null);
  drawLineChart($('#chartNW2'), series.map(r => monthLabelShort(r.key)), [
    { name: nw2Known ? 'Net Worth' : 'Net Worth (assets only — debt not yet entered)', color: '#0B2545', data: series.map(r => r.netWorth === null ? r.assets : r.netWorth) },
  ]);
}

/* ---------------------------- View: Sinking Funds ---------------------------- */

function renderSinkingFunds(root) {
  const { rows, totalAnnual, totalMonthly, totalSaved } = sinkingFundsStats();
  const accts = allAccounts();

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Sinking Funds</h1>
        <p class="view-sub">Set money aside monthly for predictable but irregular expenses, so they never blow up your budget</p>
      </div>
      <div class="view-actions"><button class="btn btn-primary" id="addSinkBtn">+ Add Fund</button></div>
    </div>

    <div class="grid kpi-grid" style="margin-bottom:20px;">
      <div class="card kpi-card"><div class="kpi-label">Total Annual Need</div><div class="kpi-value">${fmtMoney(totalAnnual)}</div></div>
      <div class="card kpi-card accent"><div class="kpi-label">Required Monthly Provision</div><div class="kpi-value">${fmtMoney(totalMonthly)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Saved So Far</div><div class="kpi-value">${fmtMoney(totalSaved)}</div></div>
    </div>

    ${rows.length === 0 ? `<div class="empty card"><b>No sinking funds yet</b>Add one for vehicle costs, insurance, education, or medical expenses.</div>` : ''}

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));">
      ${rows.map(f => `
        <div class="card goal-card">
          <div class="goal-top"><span class="goal-name">${escapeHtml(f.name)}</span><span class="goal-pct">${fmtPct(f.pct, 0)}</span></div>
          <div class="progress"><div style="width:${f.pct * 100}%"></div></div>
          <div class="goal-meta"><span>${fmtMoney(f.saved)} saved</span><span>${fmtMoney(f.annualNeed)}/yr need</span></div>
          <div class="field-hint" style="margin-top:8px;">Set aside ~${fmtMoney(f.monthly)}/month to stay fully funded.</div>
          <div class="row-actions" style="margin-top:12px;justify-content:flex-end;">
            <button data-add-sink="${f.id}" class="btn btn-sm">+ Add</button>
            <button data-spend-sink="${f.id}" class="btn btn-sm" style="color:var(--bad);">Spend</button>
            <button data-edit-sink="${f.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
            <button data-del-sink="${f.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
          </div>
        </div>`).join('')}
    </div>
  `;

  $('#addSinkBtn').onclick = () => openSinkingFundModal();
  $$('[data-edit-sink]', root).forEach(btn => btn.onclick = () => openSinkingFundModal(state.data.sinkingFunds.find(f => f.id === btn.dataset.editSink)));
  $$('[data-del-sink]', root).forEach(btn => btn.onclick = () => {
    confirmDialog('Delete this sinking fund?', () => {
      state.data.sinkingFunds = state.data.sinkingFunds.filter(f => f.id !== btn.dataset.delSink);
      saveData(); renderView();
    });
  });

  $$('[data-add-sink]', root).forEach(btn => btn.onclick = () => {
    const f = state.data.sinkingFunds.find(x => x.id === btn.dataset.addSink);
    openModal({
      title: `Add to Fund — ${f.name}`,
      submitLabel: 'Add Funds',
      bodyHtml: `
        <div class="field"><label>Amount</label><input type="number" step="0.01" min="0.01" name="amount" required></div>
        <div class="field"><label>Date</label><input type="date" name="date" value="${todayISO()}"></div>
        <div class="field"><label>Source Account</label><select name="account">${selectOptions(accts, 'Bank Account')}</select></div>
      `,
      onSubmit: (data) => {
        const amt = parseFloat(data.amount) || 0;
        f.saved = Number(f.saved || 0) + amt;
        state.data.transactions.push({
          id: uid('tx'), date: data.date, type: 'Savings', category: 'Sinking Fund',
          subcategory: f.name, description: `Provision for ${f.name}`, amount: amt,
          account: data.account, method: 'Bank Transfer', notes: '',
        });
        saveData(); renderView();
        toast(`Added ${fmtMoney(amt)} to ${f.name}.`);
      },
    });
  });

  $$('[data-spend-sink]', root).forEach(btn => btn.onclick = () => {
    const f = state.data.sinkingFunds.find(x => x.id === btn.dataset.spendSink);
    const expCats = categoryOptionsFor('Expense');
    // find default matching category
    let matchCat = expCats.find(c => f.name.toLowerCase().includes(c.toLowerCase())) || 'Other Essential';
    openModal({
      title: `Spend from Fund — ${f.name}`,
      submitLabel: 'Record Expense',
      bodyHtml: `
        <div class="field"><label>Amount (Saved: ${fmtMoney(f.saved)})</label><input type="number" step="0.01" min="0.01" name="amount" required></div>
        <div class="field"><label>Date</label><input type="date" name="date" value="${todayISO()}"></div>
        <div class="field"><label>Expense Category</label><select name="category">${selectOptions(expCats, matchCat)}</select></div>
        <div class="field"><label>Paid From Account</label><select name="account">${selectOptions(accts, 'Cash')}</select></div>
        <div class="field"><label>Description / Vendor</label><input type="text" name="desc" placeholder="e.g. Mechanic repair, school term fee"></div>
      `,
      onSubmit: (data) => {
        const amt = parseFloat(data.amount) || 0;
        f.saved = Math.max(0, Number(f.saved || 0) - amt);
        state.data.transactions.push({
          id: uid('tx'), date: data.date, type: 'Expense', category: data.category,
          subcategory: f.name, description: data.desc || `Spent from ${f.name}`, amount: amt,
          account: data.account, method: 'Cash', notes: `Funded by ${f.name} sinking fund`,
        });
        saveData(); renderView();
        toast(`Recorded ${fmtMoney(amt)} spent from ${f.name}.`);
      },
    });
  });
}

function openSinkingFundModal(fund) {
  const isEdit = !!fund;
  openModal({
    title: isEdit ? 'Edit Sinking Fund' : 'Add Sinking Fund',
    submitLabel: isEdit ? 'Save Changes' : 'Add Fund',
    bodyHtml: `
      <div class="field"><label>Fund Name</label><input type="text" name="name" required value="${fund ? escapeHtml(fund.name) : ''}" placeholder="e.g. Vehicle Maintenance, Christmas"></div>
      <div class="field-row">
        <div class="field"><label>Annual Need</label><input type="number" step="0.01" name="annualNeed" required value="${fund ? fund.annualNeed : ''}"></div>
        <div class="field"><label>Already Saved</label><input type="number" step="0.01" name="saved" value="${fund ? fund.saved : 0}"></div>
      </div>
    `,
    onSubmit: (data) => {
      const payload = { name: data.name, annualNeed: parseFloat(data.annualNeed) || 0, saved: parseFloat(data.saved) || 0 };
      if (isEdit) Object.assign(fund, payload);
      else state.data.sinkingFunds.push({ id: uid('sink'), ...payload });
      saveData(); renderView();
      toast(isEdit ? 'Fund updated.' : 'Fund added.');
    },
  });
}

/* ---------------------------- View: Accounts ---------------------------- */

function renderAccounts(root) {
  const rows = accountStats();
  const totalOpening = rows.reduce((s, a) => s + Number(a.openingBalance || 0), 0);
  const totalBook = rows.reduce((s, a) => s + a.book, 0);
  const totalActual = rows.reduce((s, a) => s + (a.hasActual ? Number(a.actualBalance) : a.book), 0);
  const anyUnreconciled = rows.some(a => a.hasActual && !a.reconciled);

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Account Reconciliation</h1>
        <p class="view-sub">Book balance (derived from transactions) vs your actual cash/bank/mobile money balance</p>
      </div>
      <div class="view-actions"><button class="btn btn-primary" id="addAcctBtn">+ Add Account</button></div>
    </div>

    ${anyUnreconciled ? `<div class="banner warn">⚠ <span>One or more accounts don't match — enter transactions you may have missed, check opening balance, or correct actual balance.</span></div>` : ''}

    <div class="grid kpi-grid" style="margin-bottom:20px;">
      <div class="card kpi-card"><div class="kpi-label">Total Opening</div><div class="kpi-value">${fmtMoney(totalOpening)}</div></div>
      <div class="card kpi-card"><div class="kpi-label">Total Book Balance</div><div class="kpi-value">${fmtMoney(totalBook)}</div></div>
      <div class="card kpi-card accent"><div class="kpi-label">Total Actual Balance</div><div class="kpi-value">${fmtMoney(totalActual)}</div></div>
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Account</th>
          <th class="num">Opening Balance</th>
          <th class="num">Book Balance</th>
          <th class="num">Actual Balance</th>
          <th class="num">Difference</th>
          <th>Status</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${rows.map(a => `
            <tr>
              <td><b>${escapeHtml(a.name)}</b></td>
              <td class="num"><input type="number" step="0.01" data-acct-opening="${a.id}" value="${a.openingBalance ?? 0}" style="width:90px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:4px 6px;font-family:var(--font-num);"></td>
              <td class="num">${fmtMoney(a.book)}</td>
              <td class="num"><input type="number" step="0.01" data-acct-actual="${a.id}" value="${a.hasActual ? a.actualBalance : ''}" placeholder="Enter…" style="width:100px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:4px 6px;font-family:var(--font-num);"></td>
              <td class="num" style="color:${!a.hasActual ? 'var(--slate)' : a.reconciled ? 'var(--good)' : 'var(--bad)'}">${a.hasActual ? fmtMoney(a.diff) : '—'}</td>
              <td><span class="status ${!a.hasActual ? 'active' : a.reconciled ? 'under' : 'over'}">${!a.hasActual ? 'NOT CHECKED' : a.reconciled ? 'RECONCILED' : 'UNRECONCILED'}</span></td>
              <td><div class="row-actions"><button data-del-acct="${a.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button></div></td>
            </tr>`).join('')}
        </tbody>
        <tfoot><tr><td>TOTAL</td><td class="num">${fmtMoney(totalOpening)}</td><td class="num">${fmtMoney(totalBook)}</td><td class="num">${fmtMoney(totalActual)}</td><td colspan="3"></td></tr></tfoot>
      </table>
    </div>
    <div class="field-hint" style="margin-top:10px;">Book balance formula: <b>Opening Balance + Inflows - Outflows</b>. Transfers move money between accounts without altering income or expenses.</div>
  `;

  $('#addAcctBtn').onclick = () => {
    openModal({
      title: 'Add Account', submitLabel: 'Add',
      bodyHtml: `
        <div class="field"><label>Account Name</label><input type="text" name="name" required placeholder="e.g. Airtel Money"></div>
        <div class="field"><label>Opening Balance</label><input type="number" step="0.01" name="openingBalance" value="0"></div>
      `,
      onSubmit: (data) => {
        state.data.accounts.push({
          id: uid('acct'),
          name: data.name,
          openingBalance: parseFloat(data.openingBalance) || 0,
          actualBalance: null,
        });
        saveData(); renderView();
      },
    });
  };
  $$('[data-acct-opening]', root).forEach(inp => {
    inp.onchange = () => {
      const a = state.data.accounts.find(x => x.id === inp.dataset.acctOpening);
      a.openingBalance = parseFloat(inp.value) || 0;
      saveData(); renderView();
    };
  });
  $$('[data-acct-actual]', root).forEach(inp => {
    inp.onchange = () => {
      const a = state.data.accounts.find(x => x.id === inp.dataset.acctActual);
      a.actualBalance = inp.value === '' ? null : parseFloat(inp.value);
      saveData(); renderView();
    };
  });
  $$('[data-del-acct]', root).forEach(btn => btn.onclick = () => {
    confirmDialog('Remove this account?', () => {
      state.data.accounts = state.data.accounts.filter(a => a.id !== btn.dataset.delAcct);
      saveData(); renderView();
    });
  });
}

/* ---------------------------- View: Settings ---------------------------- */

function renderSettings(root) {
  const s = state.data.settings;
  const cats = getCategories();

  root.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Settings</h1><p class="view-sub">Configure targets, thresholds and manage your categories &amp; data</p></div>
    </div>

    <div class="section-title mt-0">General</div>
    <div class="card">
      <form id="settingsForm" class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
        <div class="field"><label>Currency Symbol</label><input type="text" name="currency" maxlength="3" value="${escapeHtml(s.currency)}"></div>
        <div class="field"><label>Opening Cash Balance</label><input type="number" step="0.01" name="openingCash" value="${s.openingCash}"></div>
        <div class="field"><label>Savings Rate Target</label><input type="number" step="1" name="savingsRateTarget" value="${Math.round(s.savingsRateTarget * 100)}"><span class="field-hint">% of income</span></div>
        <div class="field"><label>Emergency Fund (months of expenses)</label><input type="number" step="1" name="emergencyFundMonths" value="${s.emergencyFundMonths}"></div>
        <div class="field"><label>Budget Alert Threshold</label><input type="number" step="1" name="budgetAlertThreshold" value="${Math.round(s.budgetAlertThreshold * 100)}"><span class="field-hint">% of budget → "on track" warning</span></div>
        <div class="field"><label>Low Cash Floor</label><input type="number" step="0.01" name="lowCashFloor" value="${s.lowCashFloor}"></div>
        <div class="field"><label>Non-Essential Spending Cap</label><input type="number" step="1" name="nonEssentialCap" value="${Math.round(s.nonEssentialCap * 100)}"><span class="field-hint">% of income</span></div>
        <div class="field"><label>Debt-to-Income Threshold</label><input type="number" step="1" name="debtToIncomeThreshold" value="${Math.round(s.debtToIncomeThreshold * 100)}"><span class="field-hint">%</span></div>
      </form>
      <button class="btn btn-primary" id="saveSettingsBtn" style="margin-top:16px;">Save Settings</button>
    </div>

    <div class="section-title">Category Management</div>
    <div class="card">
      <p class="field-hint" style="margin-top:0;">Manage categories across Essential Needs, Non-Essential Wants, Income, and Debt payments. Categories persist permanently in your data.</p>
      
      <div style="margin-bottom:16px;">
        <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--steel);">Essential Categories</h4>
        <div class="cat-pill-list">
          ${cats.Essential.map(c => `
            <span class="cat-pill">
              <span>${escapeHtml(c)}</span>
              <button data-del-cat="Essential" data-name="${escapeHtml(c)}" title="Delete category">✕</button>
            </span>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--gold);">Non-Essential Categories</h4>
        <div class="cat-pill-list">
          ${cats['Non-Essential'].map(c => `
            <span class="cat-pill">
              <span>${escapeHtml(c)}</span>
              <button data-del-cat="Non-Essential" data-name="${escapeHtml(c)}" title="Delete category">✕</button>
            </span>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--good);">Income Categories</h4>
        <div class="cat-pill-list">
          ${cats.Income.map(c => `
            <span class="cat-pill">
              <span>${escapeHtml(c)}</span>
              <button data-del-cat="Income" data-name="${escapeHtml(c)}" title="Delete category">✕</button>
            </span>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--debt);">Debt Categories</h4>
        <div class="cat-pill-list">
          ${cats.Debt.map(c => `
            <span class="cat-pill">
              <span>${escapeHtml(c)}</span>
              <button data-del-cat="Debt" data-name="${escapeHtml(c)}" title="Delete category">✕</button>
            </span>
          `).join('')}
        </div>
      </div>

      <div class="divider"></div>
      <h4 style="font-size:13px;font-weight:700;margin-bottom:10px;">Add New Category</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <input type="text" id="newCatName" placeholder="New category name" style="flex:1;min-width:180px;border:1px solid var(--line);border-radius:9px;padding:8px 11px;">
        <select id="newCatType" style="min-width:140px;border:1px solid var(--line);border-radius:9px;padding:8px 11px;">
          <option value="Essential">Essential</option>
          <option value="Non-Essential">Non-Essential</option>
          <option value="Income">Income</option>
          <option value="Debt">Debt</option>
        </select>
        <button class="btn btn-primary" id="addCatBtn">+ Add Category</button>
      </div>
    </div>

    <div class="section-title">Data</div>
    <div class="card">
      <p class="field-hint mt-0">Everything is stored only in this browser (localStorage) — nothing is sent anywhere. Back up regularly.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn" id="exportJsonBtn">Export Backup (JSON)</button>
        <label class="btn" style="cursor:pointer;">Import Backup<input type="file" id="importJsonInput" accept="application/json" hidden></label>
        <button class="btn btn-danger" id="resetDataBtn">Reset All Data</button>
      </div>
    </div>

    <div class="section-title">About</div>
    <div class="card field-hint">
      FinanceOS runs entirely offline once installed. Install it from the sidebar (or your browser's "Add to Home Screen" / "Install App" option) for the best experience.
    </div>
  `;

  $('#saveSettingsBtn').onclick = () => {
    const fd = new FormData($('#settingsForm'));
    const d = Object.fromEntries(fd.entries());
    Object.assign(state.data.settings, {
      currency: d.currency || 'K',
      openingCash: parseFloat(d.openingCash) || 0,
      savingsRateTarget: (parseFloat(d.savingsRateTarget) || 0) / 100,
      emergencyFundMonths: parseFloat(d.emergencyFundMonths) || 6,
      budgetAlertThreshold: (parseFloat(d.budgetAlertThreshold) || 90) / 100,
      lowCashFloor: parseFloat(d.lowCashFloor) || 0,
      nonEssentialCap: (parseFloat(d.nonEssentialCap) || 15) / 100,
      debtToIncomeThreshold: (parseFloat(d.debtToIncomeThreshold) || 30) / 100,
    });
    saveData(); toast('Settings saved.'); renderView();
  };

  $('#addCatBtn').onclick = () => {
    const name = $('#newCatName').value.trim();
    const type = $('#newCatType').value;
    if (!name) return;
    const catData = getCategories();
    if (catData[type] && !catData[type].includes(name)) {
      catData[type].push(name);
    }
    if ((type === 'Essential' || type === 'Non-Essential') && !(name in state.data.budget)) {
      state.data.budget[name] = 0;
    }
    saveData(); toast(`Category "${name}" added to ${type}.`);
    renderView();
  };

  $$('[data-del-cat]', root).forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.delCat;
      const name = btn.dataset.name;
      const inUse = state.data.transactions.filter(t => t.category === name).length;
      const msg = inUse > 0
        ? `"${name}" is used in ${inUse} transaction(s). Remove this category? (Transactions will keep their current category text).`
        : `Remove category "${name}"?`;
      confirmDialog(msg, () => {
        const catData = getCategories();
        if (catData[type]) {
          catData[type] = catData[type].filter(c => c !== name);
        }
        delete state.data.budget[name];
        saveData(); renderView();
        toast(`Category "${name}" removed.`);
      });
    };
  });

  $('#exportJsonBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `financeos_backup_${todayISO()}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  $('#importJsonInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.transactions) throw new Error('Not a valid backup file.');
        state.data = parsed;
        saveData(); toast('Backup imported.'); renderView();
      } catch (err) {
        toast('⚠ Could not read that file — is it a FinanceOS backup?');
      }
    };
    reader.readAsText(file);
  };

  $('#resetDataBtn').onclick = () => {
    confirmDialog('Reset all data on this device? This deletes every transaction, debt, goal and setting. This cannot be undone.', () => {
      state.data = defaultData();
      state.selectedMonth = null;
      saveData(); renderView();
      toast('All data has been reset.');
    });
  };
}

/* ---------------------------- Router ---------------------------- */

const VIEWS = {
  dashboard: { label: 'Dashboard', render: renderDashboard },
  transactions: { label: 'Transactions', render: renderTransactions },
  budget: { label: 'Budget', render: renderBudget },
  recurring: { label: 'Recurring', render: renderRecurring },
  cashflow: { label: 'Cash Flow', render: renderCashflow },
  debt: { label: 'Debt', render: renderDebt },
  savings: { label: 'Savings', render: renderSavings },
  sinking: { label: 'Sinking Funds', render: renderSinkingFunds },
  accounts: { label: 'Accounts', render: renderAccounts },
  networth: { label: 'Net Worth', render: renderNetWorth },
  settings: { label: 'Settings', render: renderSettings },
};

function renderView() {
  const view = VIEWS[state.view] || VIEWS.dashboard;
  $('#view-root').innerHTML = '';
  view.render($('#view-root'));
  $('#topbarLabel').textContent = view.label;
  $$('.nav-list a').forEach(a => a.classList.toggle('active', a.dataset.view === state.view));
  syncTopbarMonth();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function syncTopbarMonth() {
  const btn = $('#topbarMonth');
  if (btn) btn.textContent = monthLabelShort(currentMonthKey()) + ' ' + currentMonthKey().slice(0, 4);
}

function navigate(view) {
  state.view = VIEWS[view] ? view : 'dashboard';
  location.hash = state.view;
  renderView();
  closeSidebar();
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#scrim').classList.remove('show');
}

/* ---------------------------- Boot ---------------------------- */

async function init() {
  state.data = await loadData();

  const statusEl = document.getElementById('storageNote');
  if (statusEl) {
    statusEl.textContent = state.backendMode ? 'Data stored in the app database' : 'Data stored on this device only';
  }

  $$('.nav-list a').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); navigate(a.dataset.view); });
  });

  $('#menuBtn').addEventListener('click', () => {
    $('#sidebar').classList.add('open');
    $('#scrim').classList.add('show');
  });
  $('#scrim').addEventListener('click', closeSidebar);

  $('#monthBtn').addEventListener('click', () => {
    openMonthPickerModal();
  });

  const fab = $('#fabAddTx');
  if (fab) {
    fab.addEventListener('click', () => {
      openTransactionModal();
    });
  }

  const initial = location.hash.replace('#', '');
  state.view = VIEWS[initial] ? initial : 'dashboard';
  renderView();

  window.addEventListener('resize', () => renderView());

  // PWA install prompt
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('#installBtn').hidden = false;
  });
  $('#installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('#installBtn').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; toast('App installed.'); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW registration failed', err));
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
