'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus, Wallet, Plane, CheckCircle, XCircle, Clock, RefreshCw,
  Upload, FileText, Trash2, ChevronDown, X, Filter, Search,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
type ExpenseType = 'PETTY_CASH' | 'TRAVEL';
type Status      = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';

interface Expense {
  id: number;
  expenseType: ExpenseType;
  category: string | null;
  description: string;
  amount: string;
  currency: string;
  date: string;
  receiptFileName: string | null;
  receiptUrl: string | null;
  status: Status;
  destination: string | null;
  purpose: string | null;
  departureDate: string | null;
  returnDate: string | null;
  notes: string | null;
  submittedBy: { id: number; name: string; email: string };
  approvedBy:  { id: number; name: string; email: string } | null;
}

interface Summary {
  pettyCash: { approvedThisPeriod: number; monthlyBreakdown: { month: string; total: number }[] };
  travel:    { pendingReimbursement: number; reimbursedThisPeriod: number };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PETTY_CASH_CATEGORIES = ['Office Supplies', 'Meals & Refreshments', 'Transport', 'Postage', 'Utilities', 'Miscellaneous'];
const TRAVEL_CATEGORIES     = ['Flights', 'Accommodation', 'Meals', 'Transport', 'Visa & Insurance', 'Conference Fees', 'Other'];

const STATUS_COLORS: Record<Status, string> = {
  PENDING:     'bg-yellow-500/20 text-yellow-400',
  APPROVED:    'bg-green-500/20  text-green-400',
  REJECTED:    'bg-red-500/20    text-red-400',
  REIMBURSED:  'bg-blue-500/20   text-blue-400',
};

const STATUS_ICON: Record<Status, React.ReactNode> = {
  PENDING:    <Clock    className="w-3 h-3" />,
  APPROVED:   <CheckCircle className="w-3 h-3" />,
  REJECTED:   <XCircle  className="w-3 h-3" />,
  REIMBURSED: <RefreshCw className="w-3 h-3" />,
};

function fmt(n: number | string, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(n));
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Empty form state ──────────────────────────────────────────────────────────
const emptyForm = () => ({
  expenseType:   'PETTY_CASH' as ExpenseType,
  category:      '',
  description:   '',
  amount:        '',
  currency:      'EUR',
  date:          new Date().toISOString().split('T')[0],
  destination:   '',
  purpose:       '',
  departureDate: '',
  returnDate:    '',
  notes:         '',
});

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'ADMIN';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<ExpenseType>('PETTY_CASH');
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState<Expense | null>(null);
  const [form,      setForm]          = useState(emptyForm());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [expRes, sumRes] = await Promise.all([
        api.get('/expenses', { params: { expenseType: tab, status: statusFilter || undefined } }),
        api.get('/expenses/summary', { params: { year: now.getFullYear(), month: now.getMonth() + 1 } }),
      ]);
      setExpenses(expRes.data);
      setSummary(sumRes.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [tab, statusFilter]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = expenses.filter(e => {
    const q = search.toLowerCase();
    return !q || e.description.toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q) ||
      (e.submittedBy?.name || '').toLowerCase().includes(q);
  });

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const openNew = () => {
    setEditTarget(null);
    setForm({ ...emptyForm(), expenseType: tab });
    setReceiptFile(null);
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditTarget(e);
    setForm({
      expenseType:   e.expenseType,
      category:      e.category      || '',
      description:   e.description,
      amount:        e.amount,
      currency:      e.currency,
      date:          e.date.split('T')[0],
      destination:   e.destination   || '',
      purpose:       e.purpose       || '',
      departureDate: e.departureDate ? e.departureDate.split('T')[0] : '',
      returnDate:    e.returnDate    ? e.returnDate.split('T')[0]    : '',
      notes:         e.notes         || '',
    });
    setReceiptFile(null);
    setShowModal(true);
  };

  const saveExpense = async () => {
    if (!form.description || !form.amount || !form.date) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (receiptFile) fd.append('receipt', receiptFile);

      if (editTarget) {
        await api.put(`/expenses/${editTarget.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/expenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowModal(false);
      fetchAll();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: Status) => {
    try {
      await api.put(`/expenses/${id}/status`, { status });
      fetchAll();
    } catch { /* ignore */ }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchAll();
    } catch { /* ignore */ }
  };

  // ── Summary cards ───────────────────────────────────────────────────────────
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-gray-400 mt-0.5">Petty cash &amp; travel expense tracking</p>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Expense
          </button>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-400">Petty Cash Spent ({currentMonth})</p>
            <p className="text-2xl font-bold text-white">{fmt(summary.pettyCash.approvedThisPeriod)}</p>
            <p className="text-xs text-gray-500">approved expenses</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-400">Travel Pending Reimbursement</p>
            <p className="text-2xl font-bold text-yellow-400">{fmt(summary.travel.pendingReimbursement)}</p>
            <p className="text-xs text-gray-500">approved, awaiting payout</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-400">Travel Reimbursed ({currentMonth})</p>
            <p className="text-2xl font-bold text-green-400">{fmt(summary.travel.reimbursedThisPeriod)}</p>
            <p className="text-xs text-gray-500">paid out this month</p>
          </div>
        </div>
      )}

      {/* Petty Cash monthly bar chart */}
      {summary && summary.pettyCash.monthlyBreakdown.length > 0 && tab === 'PETTY_CASH' && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-300 mb-3">Monthly Spend (Petty Cash)</p>
          <div className="flex items-end gap-2 h-24">
            {(() => {
              const max = Math.max(...summary.pettyCash.monthlyBreakdown.map(m => m.total), 1);
              return summary.pettyCash.monthlyBreakdown.map(m => (
                <div key={m.month} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div
                    className="w-full bg-blue-600 rounded-t"
                    style={{ height: `${Math.round((m.total / max) * 80)}px` }}
                    title={fmt(m.total)}
                  />
                  <span className="text-[10px] text-gray-500 truncate w-full text-center">
                    {m.month.slice(5)}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-gray-800 rounded-lg p-1">
          {(['PETTY_CASH', 'TRAVEL'] as ExpenseType[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setStatusFilter(''); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'PETTY_CASH' ? <Wallet className="w-4 h-4" /> : <Plane className="w-4 h-4" />}
              {t === 'PETTY_CASH' ? 'Petty Cash' : 'Travel'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            {tab === 'TRAVEL' && <option value="REIMBURSED">Reimbursed</option>}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No expenses found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Category</th>
                {tab === 'TRAVEL' && <th className="text-left px-4 py-3">Destination</th>}
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Receipt</th>
                <th className="text-left px-4 py-3">Submitted By</th>
                {isAdmin && <th className="text-center px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr
                  key={e.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}
                >
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate" title={e.description}>{e.description}</td>
                  <td className="px-4 py-3 text-gray-400">{e.category || '—'}</td>
                  {tab === 'TRAVEL' && (
                    <td className="px-4 py-3 text-gray-400">{e.destination || '—'}</td>
                  )}
                  <td className="px-4 py-3 text-right font-medium text-white whitespace-nowrap">
                    {fmt(e.amount, e.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[e.status]}`}>
                      {STATUS_ICON[e.status]}
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e.receiptUrl ? (
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${e.receiptUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {e.receiptFileName || 'View'}
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{e.submittedBy?.name || e.submittedBy?.email}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {e.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => updateStatus(e.id, 'APPROVED')}
                              className="px-2 py-1 rounded text-xs bg-green-600/20 text-green-400 hover:bg-green-600/40 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateStatus(e.id, 'REJECTED')}
                              className="px-2 py-1 rounded text-xs bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {tab === 'TRAVEL' && e.status === 'APPROVED' && (
                          <button
                            onClick={() => updateStatus(e.id, 'REIMBURSED')}
                            className="px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors"
                          >
                            Reimburse
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(e)}
                          className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteExpense(e.id)}
                          className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {editTarget ? 'Edit Expense' : 'New Expense'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Expense Type</label>
                <div className="flex gap-2">
                  {(['PETTY_CASH', 'TRAVEL'] as ExpenseType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, expenseType: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.expenseType === t
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {t === 'PETTY_CASH' ? 'Petty Cash' : 'Travel'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select category…</option>
                  {(form.expenseType === 'PETTY_CASH' ? PETTY_CASH_CATEGORIES : TRAVEL_CATEGORIES).map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What was this expense for?"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Amount + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Amount *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Currency</label>
                  <select
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  >
                    {['EUR', 'USD', 'GBP', 'INR', 'RON'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Travel-specific fields */}
              {form.expenseType === 'TRAVEL' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Destination</label>
                    <input
                      value={form.destination}
                      onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                      placeholder="City, Country"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Purpose of Trip</label>
                    <input
                      value={form.purpose}
                      onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                      placeholder="Client meeting, Conference…"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Departure Date</label>
                      <input
                        type="date"
                        value={form.departureDate}
                        onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Return Date</label>
                      <input
                        type="date"
                        value={form.returnDate}
                        onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes…"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Receipt upload */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Receipt (image or PDF)</label>
                <div
                  className="border-2 border-dashed border-gray-700 rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-5 h-5 text-gray-500" />
                  {receiptFile ? (
                    <span className="text-xs text-blue-400">{receiptFile.name}</span>
                  ) : editTarget?.receiptFileName ? (
                    <span className="text-xs text-gray-400">Current: {editTarget.receiptFileName} — click to replace</span>
                  ) : (
                    <span className="text-xs text-gray-500">Click to upload receipt</span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveExpense}
                disabled={saving || !form.description || !form.amount || !form.date}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
