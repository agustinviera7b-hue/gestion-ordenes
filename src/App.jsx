import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LogIn, LogOut, Plus, Edit2, Trash2, Download, Search, FileText, Users, BarChart3, Settings, CheckCircle, XCircle, Clock, DollarSign, AlertTriangle, Eye, EyeOff, Save, X, Loader2, Car, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';

const PAGE_SIZE = 50;

// ============== CONVERSIONES DB <-> APP ==============
const fromDB = (o) => o ? ({
  id: o.id,
  orderNumber: o.order_number,
  claimNumber: o.claim_number,
  date: o.date,
  advisor: o.advisor,
  branch: o.branch,
  vehicleModel: o.vehicle_model,
  sparePart: o.spare_part,
  partsAmount: o.parts_amount,
  laborDescription: o.labor_description,
  laborCost: o.labor_cost,
  thirdPartyDescription: o.third_party_description,
  thirdPartyCost: o.third_party_cost,
  notes: o.notes,
  status: o.status,
  paidParts: o.paid_parts,
  paidLabor: o.paid_labor,
  paidThirdParty: o.paid_third_party,
}) : null;

const toDB = (o) => ({
  order_number: o.orderNumber,
  claim_number: o.claimNumber || null,
  date: o.date || null,
  advisor: o.advisor || null,
  branch: o.branch || null,
  vehicle_model: o.vehicleModel || null,
  spare_part: o.sparePart || null,
  parts_amount: o.partsAmount ? Number(o.partsAmount) : null,
  labor_description: o.laborDescription || null,
  labor_cost: o.laborCost ? Number(o.laborCost) : null,
  third_party_description: o.thirdPartyDescription || null,
  third_party_cost: o.thirdPartyCost ? Number(o.thirdPartyCost) : null,
  notes: o.notes || null,
  status: o.status || 'initiated',
  paid_parts: o.paidParts ? Number(o.paidParts) : null,
  paid_labor: o.paidLabor ? Number(o.paidLabor) : null,
  paid_third_party: o.paidThirdParty ? Number(o.paidThirdParty) : null,
});

// ============== LOGIN ==============
function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        onLogin(data);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (e) {
      setError('Error de conexión: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Sistema de Gestión</h1>
          <p className="text-slate-500 mt-1">Seguimiento de Órdenes de Trabajo</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" disabled={loading} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== APP PRINCIPAL ==============
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [advisors, setAdvisors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Carga catálogos (sin cargar todas las órdenes - eso se hace bajo demanda)
  const loadMetadata = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [aRes, bRes, vRes, uRes] = await Promise.all([
        supabase.from('advisors').select('*').order('name'),
        supabase.from('branches').select('*').order('name'),
        supabase.from('vehicle_models').select('*').order('name'),
        supabase.from('app_users').select('*').order('username'),
      ]);
      setAdvisors((aRes.data || []).map(a => a.name));
      setBranches((bRes.data || []).map(b => b.name));
      setVehicleModels((vRes.data || []).map(v => v.name));
      setUsers(uRes.data || []);
    } catch (e) {
      console.error('Error cargando catálogos:', e);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) loadMetadata();
  }, [currentUser, loadMetadata]);

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard / KPIs', icon: BarChart3 },
    { id: 'orders', label: 'Cargar Orden', icon: Plus },
    { id: 'tracking', label: 'Seguimiento', icon: CheckCircle },
    { id: 'reports', label: 'Detalles por Estado', icon: FileText },
    { id: 'analysis', label: 'Análisis Costo/Cobro', icon: AlertTriangle },
    { id: 'config', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm md:text-base">Gestión de Órdenes</h1>
              <p className="text-xs text-slate-500 hidden md:block">Sistema de Seguimiento</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1 justify-end">
                {currentUser.name}
                {currentUser.is_super_admin && <Crown className="w-3.5 h-3.5 text-amber-500" />}
              </p>
              <p className="text-xs text-slate-500 capitalize">{currentUser.is_super_admin ? 'Super Admin' : currentUser.role}</p>
            </div>
            <button onClick={() => setCurrentUser(null)} className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /><span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-[57px] z-30">
        <div className="max-w-7xl mx-auto px-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4">
        {activeTab === 'dashboard' && <Dashboard branches={branches} />}
        {activeTab === 'orders' && <OrderForm advisors={advisors} branches={branches} vehicleModels={vehicleModels} />}
        {activeTab === 'tracking' && <Tracking advisors={advisors} branches={branches} vehicleModels={vehicleModels} />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'analysis' && <CostAnalysis />}
        {activeTab === 'config' && <Config advisors={advisors} branches={branches} vehicleModels={vehicleModels} users={users} reloadAll={loadMetadata} currentUser={currentUser} />}
      </main>
    </div>
  );
}

// ============== DASHBOARD (consultas optimizadas) ==============
function Dashboard({ branches }) {
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({ total: 0, initiated: 0, claimed: 0, cancelled: 0, paid: 0, claimedAmount: 0, initiatedAmount: 0, cancelledAmount: 0, paidAmount: 0, paidCostAmount: 0 });
  const [branchData, setBranchData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Aplica filtros de fecha a una query
  const applyDateFilter = (query) => {
    if (filterPeriod === 'monthly') {
      const m = String(filterMonth).padStart(2, '0');
      const y = filterYear;
      const lastDay = new Date(y, filterMonth, 0).getDate();
      query = query.gte('date', `${y}-${m}-01`).lte('date', `${y}-${m}-${lastDay}`);
    } else if (filterPeriod === 'yearly') {
      query = query.gte('date', `${filterYear}-01-01`).lte('date', `${filterYear}-12-31`);
    }
    return query;
  };

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // Solo trae las columnas necesarias para los KPIs - mucho más liviano
      let q = supabase.from('orders').select('status, branch, parts_amount, labor_cost, third_party_cost, paid_parts, paid_labor, paid_third_party');
      if (filterBranch !== 'all') q = q.eq('branch', filterBranch);
      q = applyDateFilter(q);

      const { data, error } = await q;
      if (error) throw error;

      const all = data || [];
      const cost = (o) => (Number(o.parts_amount) || 0) + (Number(o.labor_cost) || 0) + (Number(o.third_party_cost) || 0);
      const paid = (o) => (Number(o.paid_parts) || 0) + (Number(o.paid_labor) || 0) + (Number(o.paid_third_party) || 0);
      const initiated = all.filter(o => o.status === 'initiated');
      const claimed = all.filter(o => o.status === 'claimed');
      const cancelled = all.filter(o => o.status === 'cancelled');
      const paidArr = all.filter(o => o.status === 'paid');

      setStats({
        total: all.length,
        initiated: initiated.length, claimed: claimed.length, cancelled: cancelled.length, paid: paidArr.length,
        claimedAmount: claimed.reduce((s, o) => s + cost(o), 0),
        initiatedAmount: initiated.reduce((s, o) => s + cost(o), 0),
        cancelledAmount: cancelled.reduce((s, o) => s + cost(o), 0),
        paidAmount: paidArr.reduce((s, o) => s + paid(o), 0),
        paidCostAmount: paidArr.reduce((s, o) => s + cost(o), 0),
      });

      // Por sucursal
      setBranchData(branches.map(b => {
        const bo = all.filter(o => o.branch === b);
        return {
          name: b.length > 15 ? b.substring(0, 15) + '...' : b,
          Reclamado: bo.filter(o => o.status === 'claimed').reduce((s, o) => s + cost(o), 0),
          Pagado: bo.filter(o => o.status === 'paid').reduce((s, o) => s + paid(o), 0),
          Anulado: bo.filter(o => o.status === 'cancelled').reduce((s, o) => s + cost(o), 0),
        };
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterBranch, filterPeriod, filterMonth, filterYear, branches]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const difference = stats.paidCostAmount - stats.paidAmount;
  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statusData = [
    { name: 'Iniciado', value: stats.initiated, color: '#3b82f6' },
    { name: 'Reclamado', value: stats.claimed, color: '#f59e0b' },
    { name: 'Anulado', value: stats.cancelled, color: '#ef4444' },
    { name: 'Pagado', value: stats.paid, color: '#10b981' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700 text-sm">Filtros</h3>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sucursal</label>
            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="input">
              <option value="all">Todas (Global)</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Período</label>
            <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="input">
              <option value="all">Todo</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          {filterPeriod === 'monthly' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Mes</label>
              <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="input">
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
          )}
          {(filterPeriod === 'monthly' || filterPeriod === 'yearly') && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Año</label>
              <input type="number" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="input" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Órdenes" value={stats.total} icon={FileText} color="slate" />
        <KPICard title="Iniciadas" value={stats.initiated} subtitle={fmt(stats.initiatedAmount)} icon={Clock} color="blue" />
        <KPICard title="Reclamadas" value={stats.claimed} subtitle={fmt(stats.claimedAmount)} icon={AlertTriangle} color="amber" />
        <KPICard title="Anuladas" value={stats.cancelled} subtitle={fmt(stats.cancelledAmount)} icon={XCircle} color="red" />
        <KPICard title="Pagadas (cobrado)" value={stats.paid} subtitle={fmt(stats.paidAmount)} icon={CheckCircle} color="emerald" />
        <KPICard title="Pendiente Reclamo" value="" subtitle={fmt(stats.initiatedAmount)} icon={Clock} color="orange" />
        <KPICard title="Diferencia Costo - Cobro" value="" subtitle={fmt(difference)} icon={DollarSign} color={difference > 0 ? 'red' : 'emerald'} />
        <KPICard title="Total Reclamado + Pagado" value="" subtitle={fmt(stats.claimedAmount + stats.paidCostAmount)} icon={DollarSign} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Montos por Sucursal</h3>
          {branchData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="Reclamado" fill="#f59e0b" />
                <Bar dataKey="Pagado" fill="#10b981" />
                <Bar dataKey="Anulado" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-center py-12">Sin datos</p>}
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Distribución por Estado</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={(e) => `${e.name}: ${e.value}`}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-center py-12">Sin datos</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-3">Análisis: Reclamado vs Pagado por Fábrica</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <p className="text-xs text-amber-700 font-medium">Costo de Órdenes Pagadas</p>
            <p className="text-xl font-bold text-amber-900 mt-1">{fmt(stats.paidCostAmount)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
            <p className="text-xs text-emerald-700 font-medium">Cobrado por Fábrica</p>
            <p className="text-xl font-bold text-emerald-900 mt-1">{fmt(stats.paidAmount)}</p>
          </div>
          <div className={`${difference > 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border p-3 rounded-lg`}>
            <p className={`text-xs font-medium ${difference > 0 ? 'text-red-700' : 'text-blue-700'}`}>Diferencia (Pérdida si +)</p>
            <p className={`text-xl font-bold mt-1 ${difference > 0 ? 'text-red-900' : 'text-blue-900'}`}>{fmt(difference)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, color }) {
  const colors = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium opacity-80">{title}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      {value !== '' && <p className="text-2xl font-bold">{value}</p>}
      {subtitle && <p className="text-xs font-semibold mt-0.5 opacity-90">{subtitle}</p>}
    </div>
  );
}

// ============== ORDER FORM ==============
function OrderForm({ advisors, branches, vehicleModels }) {
  const empty = {
    orderNumber: '', claimNumber: '', date: new Date().toISOString().split('T')[0],
    advisor: '', branch: '', vehicleModel: '', sparePart: '', partsAmount: '',
    laborDescription: '', laborCost: '', thirdPartyDescription: '', thirdPartyCost: '',
    notes: '', status: 'initiated',
  };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.orderNumber.trim()) { setMessage('El número de orden es obligatorio'); return; }
    setSaving(true);
    try {
      // Verificar duplicado en DB
      const { data: existing } = await supabase.from('orders').select('id').eq('order_number', form.orderNumber).maybeSingle();
      if (existing) { setMessage('Ya existe una orden con ese número'); setSaving(false); return; }

      const { error } = await supabase.from('orders').insert([toDB(form)]);
      if (error) throw error;
      setForm(empty);
      setMessage('Orden cargada correctamente ✓');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-blue-600" /> Cargar Nueva Orden
      </h2>
      {message && <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.includes('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Número de Orden *">
          <input type="text" value={form.orderNumber} onChange={e => setForm({...form, orderNumber: e.target.value})} className="input" placeholder="Ej: 12345" />
        </Field>
        <Field label="Número de Reclamo">
          <input type="text" value={form.claimNumber} onChange={e => setForm({...form, claimNumber: e.target.value})} className="input" placeholder="Ej: REC-2025-001" />
        </Field>
        <Field label="Fecha">
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="input" />
        </Field>
        <Field label="Modelo de Vehículo">
          <select value={form.vehicleModel} onChange={e => setForm({...form, vehicleModel: e.target.value})} className="input">
            <option value="">-- Seleccionar --</option>
            {vehicleModels.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Asesor">
          <select value={form.advisor} onChange={e => setForm({...form, advisor: e.target.value})} className="input">
            <option value="">-- Seleccionar --</option>
            {advisors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Sucursal">
          <select value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} className="input">
            <option value="">-- Seleccionar --</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Pieza de Repuesto">
          <input type="text" value={form.sparePart} onChange={e => setForm({...form, sparePart: e.target.value})} className="input" />
        </Field>
        <Field label="Monto Total Repuesto ($)">
          <input type="number" step="0.01" value={form.partsAmount} onChange={e => setForm({...form, partsAmount: e.target.value})} className="input" />
        </Field>
        <Field label="Descripción Mano de Obra">
          <input type="text" value={form.laborDescription} onChange={e => setForm({...form, laborDescription: e.target.value})} className="input" />
        </Field>
        <Field label="Costo Mano de Obra ($)">
          <input type="number" step="0.01" value={form.laborCost} onChange={e => setForm({...form, laborCost: e.target.value})} className="input" />
        </Field>
        <Field label="Descripción Trabajo de Tercero">
          <input type="text" value={form.thirdPartyDescription} onChange={e => setForm({...form, thirdPartyDescription: e.target.value})} className="input" />
        </Field>
        <Field label="Costo Trabajo de Tercero ($)">
          <input type="number" step="0.01" value={form.thirdPartyCost} onChange={e => setForm({...form, thirdPartyCost: e.target.value})} className="input" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Observaciones">
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input" rows="2" />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex gap-2 justify-end">
        <button onClick={() => setForm(empty)} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2">
          <X className="w-4 h-4" /> Limpiar
        </button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar Orden'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>{children}</div>;
}

// ============== TRACKING (con paginación y búsqueda en servidor) ==============
function Tracking({ advisors, branches, vehicleModels }) {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [page, setPage] = useState(0);
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('orders').select('*', { count: 'exact' });
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (filterBranch !== 'all') q = q.eq('branch', filterBranch);
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`order_number.ilike.%${s}%,claim_number.ilike.%${s}%,advisor.ilike.%${s}%,branch.ilike.%${s}%,spare_part.ilike.%${s}%,vehicle_model.ilike.%${s}%`);
      }
      q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      setOrders((data || []).map(fromDB));
      setTotalCount(count || 0);
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterBranch, search, page]);

  useEffect(() => { loadPage(); }, [loadPage]);

  // Cuando cambian filtros, vuelve a página 0
  useEffect(() => { setPage(0); }, [filterStatus, filterBranch, search]);

  const updateStatus = async (id, status) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
      await loadPage();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const deleteOrder = async (id) => {
    if (!confirm('¿Eliminar esta orden?')) return;
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      await loadPage();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const saveEdit = async (updated) => {
    try {
      const { error } = await supabase.from('orders').update(toDB(updated)).eq('id', updated.id);
      if (error) throw error;
      setEditing(null);
      await loadPage();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const exportAll = async () => {
    setLoading(true);
    try {
      let q = supabase.from('orders').select('*');
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (filterBranch !== 'all') q = q.eq('branch', filterBranch);
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`order_number.ilike.%${s}%,claim_number.ilike.%${s}%,advisor.ilike.%${s}%,branch.ilike.%${s}%,spare_part.ilike.%${s}%,vehicle_model.ilike.%${s}%`);
      }
      q = q.order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      exportToExcel((data || []).map(fromDB), 'seguimiento');
    } catch (e) { alert('Error al exportar: ' + e.message); }
    finally { setLoading(false); }
  };

  const statusBadge = (status) => {
    const config = {
      initiated: { label: 'Iniciado', class: 'bg-blue-100 text-blue-700 border-blue-300' },
      claimed: { label: 'Reclamado', class: 'bg-amber-100 text-amber-700 border-amber-300' },
      cancelled: { label: 'Anulado', class: 'bg-red-100 text-red-700 border-red-300' },
      paid: { label: 'Pagado', class: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    };
    const c = config[status] || config.initiated;
    return <span className={`text-xs px-2 py-0.5 rounded-full border ${c.class}`}>{c.label}</span>;
  };

  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch md:items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por N° orden, N° reclamo, modelo..." value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => setSearch(searchInput)} className="md:col-span-1 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-800 text-white rounded-lg">Buscar</button>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="md:col-span-2 input">
            <option value="all">Todos los estados</option>
            <option value="initiated">Iniciados</option>
            <option value="claimed">Reclamados</option>
            <option value="cancelled">Anulados</option>
            <option value="paid">Pagados</option>
          </select>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="md:col-span-2 input">
            <option value="all">Todas sucursales</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button onClick={exportAll} disabled={loading} className="md:col-span-2 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 justify-center disabled:opacity-50">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Mostrando {orders.length} de {totalCount} órdenes — Página {page + 1} de {Math.max(1, totalPages)}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">N° Orden</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">N° Reclamo</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Sucursal</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Modelo</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Asesor</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Costo</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Cobrado</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600">Estado</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr><td colSpan="10" className="text-center py-8 text-slate-400">{loading ? 'Cargando...' : 'No hay órdenes'}</td></tr>
              ) : orders.map(o => {
                const cost = (Number(o.partsAmount) || 0) + (Number(o.laborCost) || 0) + (Number(o.thirdPartyCost) || 0);
                const paid = (Number(o.paidParts) || 0) + (Number(o.paidLabor) || 0) + (Number(o.paidThirdParty) || 0);
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{o.orderNumber}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.claimNumber || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.date}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.branch || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.vehicleModel || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.advisor || '-'}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmt(cost)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-emerald-700">{fmt(paid)}</td>
                    <td className="px-3 py-2 text-center">{statusBadge(o.status)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} className="text-xs border border-slate-300 rounded px-1.5 py-0.5 outline-none">
                          <option value="initiated">Iniciado</option>
                          <option value="claimed">Reclamado</option>
                          <option value="cancelled">Anulado</option>
                          <option value="paid">Pagado</option>
                        </select>
                        <button onClick={() => setEditing(o)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteOrder(o.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading} className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg flex items-center gap-1 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="text-sm text-slate-600">Página {page + 1} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading} className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg flex items-center gap-1 disabled:opacity-50">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {editing && <EditModal order={editing} onSave={saveEdit} onClose={() => setEditing(null)} advisors={advisors} branches={branches} vehicleModels={vehicleModels} />}
    </div>
  );
}

// ============== EDIT MODAL ==============
function EditModal({ order, onSave, onClose, advisors, branches, vehicleModels }) {
  const [form, setForm] = useState(order);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-4">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
          <h3 className="font-bold text-slate-800">Editar Orden #{order.orderNumber}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="N° Orden"><input type="text" value={form.orderNumber} onChange={e => setForm({...form, orderNumber: e.target.value})} className="input" /></Field>
          <Field label="N° Reclamo"><input type="text" value={form.claimNumber || ''} onChange={e => setForm({...form, claimNumber: e.target.value})} className="input" /></Field>
          <Field label="Fecha"><input type="date" value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} className="input" /></Field>
          <Field label="Modelo Vehículo">
            <select value={form.vehicleModel || ''} onChange={e => setForm({...form, vehicleModel: e.target.value})} className="input">
              <option value="">-- Sin modelo --</option>
              {vehicleModels.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Asesor">
            <select value={form.advisor || ''} onChange={e => setForm({...form, advisor: e.target.value})} className="input">
              <option value="">-- Sin asesor --</option>
              {advisors.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Sucursal">
            <select value={form.branch || ''} onChange={e => setForm({...form, branch: e.target.value})} className="input">
              <option value="">-- Sin sucursal --</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Pieza"><input type="text" value={form.sparePart || ''} onChange={e => setForm({...form, sparePart: e.target.value})} className="input" /></Field>
          <Field label="Monto Repuesto ($)"><input type="number" step="0.01" value={form.partsAmount || ''} onChange={e => setForm({...form, partsAmount: e.target.value})} className="input" /></Field>
          <Field label="Descripción M. Obra"><input type="text" value={form.laborDescription || ''} onChange={e => setForm({...form, laborDescription: e.target.value})} className="input" /></Field>
          <Field label="Costo M. Obra ($)"><input type="number" step="0.01" value={form.laborCost || ''} onChange={e => setForm({...form, laborCost: e.target.value})} className="input" /></Field>
          <Field label="Descripción Tercero"><input type="text" value={form.thirdPartyDescription || ''} onChange={e => setForm({...form, thirdPartyDescription: e.target.value})} className="input" /></Field>
          <Field label="Costo Tercero ($)"><input type="number" step="0.01" value={form.thirdPartyCost || ''} onChange={e => setForm({...form, thirdPartyCost: e.target.value})} className="input" /></Field>
          <Field label="Estado">
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input">
              <option value="initiated">Iniciado</option>
              <option value="claimed">Reclamado</option>
              <option value="cancelled">Anulado</option>
              <option value="paid">Pagado por Fábrica</option>
            </select>
          </Field>
          <div></div>
          {form.status === 'paid' && (
            <>
              <div className="md:col-span-2 -mb-2"><h4 className="text-sm font-semibold text-emerald-700 mt-2">Montos Pagados por Fábrica</h4></div>
              <Field label="Pagado Repuestos ($)"><input type="number" step="0.01" value={form.paidParts || ''} onChange={e => setForm({...form, paidParts: e.target.value})} className="input" /></Field>
              <Field label="Pagado M. Obra ($)"><input type="number" step="0.01" value={form.paidLabor || ''} onChange={e => setForm({...form, paidLabor: e.target.value})} className="input" /></Field>
              <Field label="Pagado Tercero ($)"><input type="number" step="0.01" value={form.paidThirdParty || ''} onChange={e => setForm({...form, paidThirdParty: e.target.value})} className="input" /></Field>
            </>
          )}
          <div className="md:col-span-2"><Field label="Observaciones"><textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} className="input" rows="2" /></Field></div>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">Cancelar</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ============== REPORTS (paginado en servidor) ==============
function Reports() {
  const [activeStatus, setActiveStatus] = useState('initiated');
  const [page, setPage] = useState(0);
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ initiated: 0, claimed: 0, cancelled: 0, paid: 0 });
  const [totals, setTotals] = useState({ parts: 0, labor: 0, thirdParty: 0, paidParts: 0, paidLabor: 0, paidThirdParty: 0 });
  const [loading, setLoading] = useState(false);

  // Cargar conteos por estado
  useEffect(() => {
    (async () => {
      const statuses = ['initiated', 'claimed', 'cancelled', 'paid'];
      const results = await Promise.all(statuses.map(s =>
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', s)
      ));
      setCounts({
        initiated: results[0].count || 0,
        claimed: results[1].count || 0,
        cancelled: results[2].count || 0,
        paid: results[3].count || 0,
      });
    })();
  }, [orders]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('status', activeStatus)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      setOrders((data || []).map(fromDB));
      setTotalCount(count || 0);

      // Totales (todas las órdenes del estado)
      const { data: allData } = await supabase
        .from('orders')
        .select('parts_amount, labor_cost, third_party_cost, paid_parts, paid_labor, paid_third_party')
        .eq('status', activeStatus);
      const all = allData || [];
      setTotals({
        parts: all.reduce((s, o) => s + (Number(o.parts_amount) || 0), 0),
        labor: all.reduce((s, o) => s + (Number(o.labor_cost) || 0), 0),
        thirdParty: all.reduce((s, o) => s + (Number(o.third_party_cost) || 0), 0),
        paidParts: all.reduce((s, o) => s + (Number(o.paid_parts) || 0), 0),
        paidLabor: all.reduce((s, o) => s + (Number(o.paid_labor) || 0), 0),
        paidThirdParty: all.reduce((s, o) => s + (Number(o.paid_third_party) || 0), 0),
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeStatus, page]);

  useEffect(() => { loadPage(); }, [loadPage]);
  useEffect(() => { setPage(0); }, [activeStatus]);

  const exportAll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('orders').select('*').eq('status', activeStatus).order('created_at', { ascending: false });
      if (error) throw error;
      exportToExcel((data || []).map(fromDB), `ordenes_${activeStatus}`);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'initiated', label: 'Iniciados', icon: Clock, color: '#2563eb' },
    { id: 'claimed', label: 'Reclamados', icon: AlertTriangle, color: '#d97706' },
    { id: 'cancelled', label: 'Anulados', icon: XCircle, color: '#dc2626' },
    { id: 'paid', label: 'Pagados', icon: CheckCircle, color: '#059669' },
  ];

  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 flex flex-wrap gap-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveStatus(t.id)} className="flex-1 min-w-[150px] px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2 justify-center" style={activeStatus === t.id ? { backgroundColor: t.color, color: 'white' } : { color: '#475569' }}>
              <Icon className="w-4 h-4" /> {t.label} ({counts[t.id]})
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">Detalle: {tabs.find(t => t.id === activeStatus).label}</h3>
          <button onClick={exportAll} disabled={loading} className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" /> Exportar</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200"><p className="text-xs text-slate-600">Total Repuestos</p><p className="font-bold text-slate-800">{fmt(totals.parts)}</p></div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200"><p className="text-xs text-slate-600">Total M. Obra</p><p className="font-bold text-slate-800">{fmt(totals.labor)}</p></div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200"><p className="text-xs text-slate-600">Total Tercero</p><p className="font-bold text-slate-800">{fmt(totals.thirdParty)}</p></div>
          {activeStatus === 'paid' && (
            <>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200"><p className="text-xs text-emerald-700">Pagado Repuestos</p><p className="font-bold text-emerald-900">{fmt(totals.paidParts)}</p></div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200"><p className="text-xs text-emerald-700">Pagado M. Obra</p><p className="font-bold text-emerald-900">{fmt(totals.paidLabor)}</p></div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200"><p className="text-xs text-emerald-700">Pagado Tercero</p><p className="font-bold text-emerald-900">{fmt(totals.paidThirdParty)}</p></div>
            </>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">N° Orden</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">N° Reclamo</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Sucursal</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Modelo</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Asesor</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Repuesto $</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">M. Obra $</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Tercero $</th>
                {activeStatus === 'paid' && <th className="px-3 py-2 text-right font-semibold text-emerald-700">Pagado</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr><td colSpan={activeStatus === 'paid' ? 10 : 9} className="text-center py-8 text-slate-400">{loading ? 'Cargando...' : 'Sin órdenes'}</td></tr>
              ) : orders.map(o => {
                const paid = (Number(o.paidParts) || 0) + (Number(o.paidLabor) || 0) + (Number(o.paidThirdParty) || 0);
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{o.orderNumber}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.claimNumber || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.date}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.branch || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.vehicleModel || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 text-xs">{o.advisor || '-'}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmt(o.partsAmount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmt(o.laborCost)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmt(o.thirdPartyCost)}</td>
                    {activeStatus === 'paid' && <td className="px-3 py-2 text-right font-mono text-xs text-emerald-700 font-semibold">{fmt(paid)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading} className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg flex items-center gap-1 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /> Anterior</button>
            <span className="text-sm text-slate-600">Página {page + 1} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading} className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg flex items-center gap-1 disabled:opacity-50">Siguiente <ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============== COST ANALYSIS ==============
function CostAnalysis() {
  const [lossOrders, setLossOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Trae solo las pagadas (no debería ser un universo enorme normalmente)
        const { data, error } = await supabase.from('orders').select('*').eq('status', 'paid');
        if (error) throw error;
        const filtered = (data || []).map(fromDB).map(o => {
          const cost = (Number(o.partsAmount) || 0) + (Number(o.laborCost) || 0) + (Number(o.thirdPartyCost) || 0);
          const paid = (Number(o.paidParts) || 0) + (Number(o.paidLabor) || 0) + (Number(o.paidThirdParty) || 0);
          return { ...o, totalCost: cost, totalPaid: paid, difference: cost - paid };
        }).filter(o => o.totalCost > o.totalPaid).sort((a, b) => b.difference - a.difference);
        setLossOrders(filtered);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalLoss = lossOrders.reduce((s, o) => s + o.difference, 0);
  const totalPages = Math.ceil(lossOrders.length / PAGE_SIZE);
  const pageItems = lossOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-red-900">Análisis de Órdenes con Pérdida</h3>
            <p className="text-sm text-red-700 mt-1">Órdenes pagadas donde el costo supera lo cobrado</p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div><p className="text-xs text-red-700">Cantidad con pérdida</p><p className="text-2xl font-bold text-red-900">{lossOrders.length}</p></div>
              <div><p className="text-xs text-red-700">Pérdida total</p><p className="text-2xl font-bold text-red-900">{fmt(totalLoss)}</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">Detalle</h3>
          <button onClick={() => exportToExcel(lossOrders, 'ordenes_con_perdida')} className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2"><Download className="w-4 h-4" /> Exportar</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">N° Orden</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">N° Reclamo</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Fecha</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Sucursal</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Modelo</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Costo</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Cobrado</th>
                <th className="px-3 py-2 text-right font-semibold text-red-700">Pérdida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-slate-400">{loading ? 'Cargando...' : 'Sin pérdidas ✓'}</td></tr>
              ) : pageItems.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{o.orderNumber}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{o.claimNumber || '-'}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{o.date}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{o.branch || '-'}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs">{o.vehicleModel || '-'}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{fmt(o.totalCost)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-emerald-700">{fmt(o.totalPaid)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-red-700 font-bold">{fmt(o.difference)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 mt-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg flex items-center gap-1 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /> Anterior</button>
            <span className="text-sm text-slate-600">Página {page + 1} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg flex items-center gap-1 disabled:opacity-50">Siguiente <ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============== CONFIG ==============
function Config({ advisors, branches, vehicleModels, users, reloadAll, currentUser }) {
  const [section, setSection] = useState('advisors');
  const [newItem, setNewItem] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'user' });
  const [editingUser, setEditingUser] = useState(null);

  const isSuperAdmin = currentUser.is_super_admin === true;

  // ABM genérico para asesores/sucursales/modelos
  const tableMap = { advisors: 'advisors', branches: 'branches', models: 'vehicle_models' };
  const dataMap = { advisors, branches, models: vehicleModels };
  const labelMap = { advisors: 'Asesores', branches: 'Sucursales', models: 'Modelos de Vehículo' };

  const addItem = async () => {
    if (!newItem.trim()) return;
    try {
      const { error } = await supabase.from(tableMap[section]).insert([{ name: newItem.trim() }]);
      if (error) throw error;
      setNewItem('');
      await reloadAll();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const deleteItem = async (name) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      const { error } = await supabase.from(tableMap[section]).delete().eq('name', name);
      if (error) throw error;
      await reloadAll();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const updateItem = async (oldName, newName) => {
    if (!newName.trim() || newName.trim() === oldName) { setEditingItem(null); return; }
    try {
      const { error } = await supabase.from(tableMap[section]).update({ name: newName.trim() }).eq('name', oldName);
      if (error) throw error;
      setEditingItem(null);
      await reloadAll();
    } catch (e) { alert('Error: ' + e.message); }
  };

  // Usuarios
  const addUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) { alert('Completá todos los campos'); return; }
    // Solo super admin puede crear administradores
    const role = (newUser.role === 'admin' && !isSuperAdmin) ? 'user' : newUser.role;
    try {
      const { error } = await supabase.from('app_users').insert([{ ...newUser, role, is_super_admin: false }]);
      if (error) throw error;
      setNewUser({ username: '', password: '', name: '', role: 'user' });
      await reloadAll();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const deleteUser = async (user) => {
    if (user.username === currentUser.username) { alert('No puede eliminar su propio usuario'); return; }
    if (user.is_super_admin) { alert('No se puede eliminar al Super Administrador'); return; }
    if (!confirm(`¿Eliminar usuario "${user.username}"?`)) return;
    try {
      const { error } = await supabase.from('app_users').delete().eq('username', user.username);
      if (error) throw error;
      await reloadAll();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const updateUser = async (username, data, originalUser) => {
    // Si NO es super admin y está intentando cambiar el rol, lo bloqueamos
    if (!isSuperAdmin && data.role !== originalUser.role) {
      alert('Solo el Super Administrador puede cambiar el rol de un usuario');
      return;
    }
    try {
      const { error } = await supabase.from('app_users').update(data).eq('username', username);
      if (error) throw error;
      setEditingUser(null);
      await reloadAll();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const sectionsList = [
    { id: 'advisors', label: 'Asesores', icon: Users },
    { id: 'branches', label: 'Sucursales', icon: FileText },
    { id: 'models', label: 'Modelos', icon: Car },
    { id: 'users', label: 'Usuarios', icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 flex flex-wrap gap-1">
        {sectionsList.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => { setSection(s.id); setEditingItem(null); }} className={`flex-1 min-w-[120px] px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2 justify-center ${section === s.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {(section === 'advisors' || section === 'branches' || section === 'models') && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3">Gestión de {labelMap[section]}</h3>
          <div className="flex gap-2 mb-4">
            <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder={`Nombre`} className="flex-1 input" />
            <button onClick={addItem} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Agregar</button>
          </div>
          <div className="space-y-2">
            {dataMap[section].length === 0 && <p className="text-sm text-slate-400 text-center py-4">No hay registros</p>}
            {dataMap[section].map(item => (
              <div key={item} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                {editingItem === item ? (
                  <input type="text" value={editingValue} onChange={e => setEditingValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') updateItem(item, editingValue); if (e.key === 'Escape') setEditingItem(null); }} autoFocus className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded mr-2" />
                ) : (
                  <span className="text-sm text-slate-700">{item}</span>
                )}
                <div className="flex gap-1">
                  {editingItem === item ? (
                    <>
                      <button onClick={() => updateItem(item, editingValue)} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingItem(null)} className="p-1 text-slate-600 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingItem(item); setEditingValue(item); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteItem(item)} className="p-1 text-red-600 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'users' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            Gestión de Usuarios
            {isSuperAdmin && <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full"><Crown className="w-3 h-3" /> Super Admin</span>}
          </h3>

          {!isSuperAdmin && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              ℹ️ Podés crear y editar usuarios, pero solo el Super Administrador puede asignar/cambiar el rol de "Administrador". Los usuarios que crees serán siempre del tipo "Usuario".
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="Usuario" className="input" />
            <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Nombre completo" className="input" />
            <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Contraseña" className="input" />
            {isSuperAdmin ? (
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="input">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            ) : (
              <input type="text" value="Usuario" disabled className="input bg-slate-50 text-slate-500" />
            )}
          </div>
          <button onClick={addUser} className="mb-4 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Agregar Usuario</button>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Usuario</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Rol</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.username} className="hover:bg-slate-50">
                    {editingUser === u.username ? (
                      <UserEditRow user={u} isSuperAdmin={isSuperAdmin} onSave={(data) => updateUser(u.username, data, u)} onCancel={() => setEditingUser(null)} />
                    ) : (
                      <>
                        <td className="px-3 py-2 font-medium flex items-center gap-1">{u.username} {u.is_super_admin && <Crown className="w-3.5 h-3.5 text-amber-500" />}</td>
                        <td className="px-3 py-2 text-slate-600">{u.name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_super_admin ? 'bg-amber-100 text-amber-700' : u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                            {u.is_super_admin ? 'Super Admin' : u.role === 'admin' ? 'Administrador' : 'Usuario'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => setEditingUser(u.username)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" disabled={u.is_super_admin && !isSuperAdmin} title={u.is_super_admin && !isSuperAdmin ? 'No autorizado' : 'Editar'}>
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteUser(u)} className="p-1 text-red-600 hover:bg-red-100 rounded" disabled={u.is_super_admin || u.username === currentUser.username} title={u.is_super_admin ? 'Super Admin no se puede eliminar' : 'Eliminar'}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function UserEditRow({ user, isSuperAdmin, onSave, onCancel }) {
  const [data, setData] = useState({ name: user.name, password: user.password, role: user.role });
  return (
    <>
      <td className="px-3 py-2 font-medium">{user.username}</td>
      <td className="px-3 py-2"><input type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full px-2 py-1 text-sm border border-blue-300 rounded" /></td>
      <td className="px-3 py-2">
        {isSuperAdmin && !user.is_super_admin ? (
          <select value={data.role} onChange={e => setData({...data, role: e.target.value})} className="w-full px-2 py-1 text-sm border border-blue-300 rounded">
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        ) : (
          <span className="text-xs text-slate-500 italic">{user.is_super_admin ? 'Super Admin' : (user.role === 'admin' ? 'Administrador' : 'Usuario')} (solo Super Admin)</span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1 justify-center">
          <input type="text" value={data.password} onChange={e => setData({...data, password: e.target.value})} placeholder="Pass" className="w-20 px-2 py-1 text-xs border border-blue-300 rounded" />
          <button onClick={() => onSave(data)} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"><Save className="w-4 h-4" /></button>
          <button onClick={onCancel} className="p-1 text-red-600 hover:bg-red-100 rounded"><X className="w-4 h-4" /></button>
        </div>
      </td>
    </>
  );
}

// ============== EXCEL EXPORT ==============
function exportToExcel(orders, filename = 'ordenes') {
  if (!orders || orders.length === 0) { alert('No hay datos para exportar'); return; }
  const statusLabels = { initiated: 'Iniciado', claimed: 'Reclamado', cancelled: 'Anulado', paid: 'Pagado por Fábrica' };
  const data = orders.map(o => ({
    'N° Orden': o.orderNumber || '',
    'N° Reclamo': o.claimNumber || '',
    'Fecha': o.date || '',
    'Sucursal': o.branch || '',
    'Modelo Vehículo': o.vehicleModel || '',
    'Asesor': o.advisor || '',
    'Pieza Repuesto': o.sparePart || '',
    'Monto Repuesto': Number(o.partsAmount) || 0,
    'Mano de Obra (Desc)': o.laborDescription || '',
    'Costo Mano de Obra': Number(o.laborCost) || 0,
    'Trabajo Tercero (Desc)': o.thirdPartyDescription || '',
    'Costo Tercero': Number(o.thirdPartyCost) || 0,
    'Costo Total': (Number(o.partsAmount) || 0) + (Number(o.laborCost) || 0) + (Number(o.thirdPartyCost) || 0),
    'Estado': statusLabels[o.status] || o.status,
    'Pagado Repuestos': Number(o.paidParts) || 0,
    'Pagado Mano de Obra': Number(o.paidLabor) || 0,
    'Pagado Tercero': Number(o.paidThirdParty) || 0,
    'Total Cobrado': (Number(o.paidParts) || 0) + (Number(o.paidLabor) || 0) + (Number(o.paidThirdParty) || 0),
    'Diferencia (Costo-Cobrado)': ((Number(o.partsAmount) || 0) + (Number(o.laborCost) || 0) + (Number(o.thirdPartyCost) || 0)) - ((Number(o.paidParts) || 0) + (Number(o.paidLabor) || 0) + (Number(o.paidThirdParty) || 0)),
    'Observaciones': o.notes || ''
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ordenes');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
