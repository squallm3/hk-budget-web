import { useEffect, useMemo, useState } from 'react';
import { loginConGoogle, logout, suscribirseAUsuario } from './firebase.js';
import * as api from './api.js';
import {
  Dashboard,
  AccountsView,
  AccountForm,
  CategoriesView,
  CategoryForm,
  TransactionsView,
  TransactionForm,
  Modal,
} from './views.jsx';

const NAV = [
  { key: 'dashboard', label: 'Panel' },
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'transacciones', label: 'Transacciones' },
];

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState('');
  const [view, setView] = useState('dashboard');

  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [transacciones, setTransacciones] = useState([]);

  const [accountModal, setAccountModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [txModal, setTxModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [xpToast, setXpToast] = useState(false);

  const mostrarXpToast = () => {
    setXpToast(true);
    setTimeout(() => setXpToast(false), 2200);
  };

  useEffect(() => {
    const unsubscribe = suscribirseAUsuario((u) => {
      setUsuario(u);
      setCargandoAuth(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      setCargandoDatos(true);
      setErrorGlobal('');
      try {
        const [c, cg, t] = await Promise.all([
          api.listarCuentas(),
          api.listarCategorias(),
          api.listarTransacciones(),
        ]);
        setCuentas(c);
        setCategorias(cg);
        setTransacciones(t);
      } catch (err) {
        setErrorGlobal(err.message);
      } finally {
        setCargandoDatos(false);
      }
    })();
  }, [usuario]);

  const balanceOf = (cuentaId) => {
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    if (!cuenta) return 0;
    const suma = transacciones
      .filter((t) => t.cuentaId === cuentaId)
      .reduce((s, t) => s + Number(t.monto), 0);
    return Number(cuenta.saldoInicial) + suma;
  };

  const totalBalance = useMemo(() => cuentas.reduce((s, c) => s + balanceOf(c.id), 0), [cuentas, transacciones]);

  const categorySpent = (categoriaId) =>
    transacciones
      .filter((t) => t.categoriaId === categoriaId && Number(t.monto) < 0)
      .reduce((s, t) => s + Math.abs(Number(t.monto)), 0);

  // ---- handlers ----
  const withSaving = async (fn) => {
    setSaving(true);
    setErrorGlobal('');
    try {
      await fn();
    } catch (err) {
      setErrorGlobal(err.message);
    } finally {
      setSaving(false);
    }
  };

  const guardarCuenta = (data) =>
    withSaving(async () => {
      if (data.id) {
        const actualizada = await api.editarCuenta(data.id, data);
        setCuentas((prev) => prev.map((c) => (c.id === data.id ? actualizada : c)));
      } else {
        const nueva = await api.crearCuenta(data);
        setCuentas((prev) => [...prev, nueva]);
        api.sumarXp(111).catch((err) => console.error('No se pudo sumar XP', err));
        mostrarXpToast();
      }
      setAccountModal(null);
    });

  const guardarCategoria = (data) =>
    withSaving(async () => {
      if (data.id) {
        const actualizada = await api.editarCategoria(data.id, data);
        setCategorias((prev) => prev.map((c) => (c.id === data.id ? actualizada : c)));
      } else {
        const nueva = await api.crearCategoria(data);
        setCategorias((prev) => [...prev, nueva]);
        api.sumarXp(111).catch((err) => console.error('No se pudo sumar XP', err));
        mostrarXpToast();
      }
      setCategoryModal(null);
    });

  const guardarTransaccion = (data) =>
    withSaving(async () => {
      if (data.id) {
        const actualizada = await api.editarTransaccion(data.id, data);
        setTransacciones((prev) => prev.map((t) => (t.id === data.id ? actualizada : t)));
      } else {
        const nueva = await api.crearTransaccion(data);
        setTransacciones((prev) => [nueva, ...prev]);
        api.sumarXp(111).catch((err) => console.error('No se pudo sumar XP', err));
        mostrarXpToast();
      }
      setTxModal(null);
    });

  const confirmarEliminar = () =>
    withSaving(async () => {
      const { type, id } = confirmDelete;
      if (type === 'cuenta') {
        await api.eliminarCuenta(id);
        setCuentas((prev) => prev.filter((c) => c.id !== id));
        setTransacciones((prev) => prev.filter((t) => t.cuentaId !== id));
      }
      if (type === 'categoria') {
        await api.eliminarCategoria(id);
        setCategorias((prev) => prev.filter((c) => c.id !== id));
        setTransacciones((prev) => prev.map((t) => (t.categoriaId === id ? { ...t, categoriaId: null } : t)));
      }
      if (type === 'transaccion') {
        await api.eliminarTransaccion(id);
        setTransacciones((prev) => prev.filter((t) => t.id !== id));
      }
      setConfirmDelete(null);
    });

  // ---- pantallas de auth ----
  if (cargandoAuth) {
    return <div className="app-shell centered"><p>Cargando sesión...</p></div>;
  }

  if (!usuario) {
    return (
      <div className="app-shell centered">
        <div className="card login-card">
          <h1 className="titulo">hk-budget-web</h1>
          <p className="subtitulo">Cada peso, un destino</p>
          <button className="btn" onClick={() => loginConGoogle().catch((e) => setErrorGlobal(e.message))}>
            Conectar con Google
          </button>
          {errorGlobal && <p className="error">{errorGlobal}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <h1>hk-budget-web</h1>
          <p>{usuario.email}</p>
        </div>
        <nav>
          {NAV.map(({ key, label }) => (
            <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="saldo">
          <p>Saldo total</p>
          <p className="mono">{cargandoDatos ? '...' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(totalBalance)}</p>
        </div>
        <button className="btn ghost logout" onClick={logout}>Cerrar sesión</button>
      </aside>

      <main>
        {errorGlobal && <p className="error banner">{errorGlobal}</p>}
        {cargandoDatos ? (
          <p>Cargando datos...</p>
        ) : (
          <>
            {view === 'dashboard' && (
              <Dashboard
                cuentas={cuentas}
                categorias={categorias}
                transacciones={transacciones}
                balanceOf={balanceOf}
                categorySpent={categorySpent}
                totalBalance={totalBalance}
              />
            )}
            {view === 'cuentas' && (
              <AccountsView
                cuentas={cuentas}
                balanceOf={balanceOf}
                onAdd={() => setAccountModal('new')}
                onEdit={(c) => setAccountModal(c)}
                onDelete={(c) => setConfirmDelete({ type: 'cuenta', id: c.id, label: c.nombre })}
              />
            )}
            {view === 'categorias' && (
              <CategoriesView
                categorias={categorias}
                categorySpent={categorySpent}
                onAdd={() => setCategoryModal('new')}
                onEdit={(c) => setCategoryModal(c)}
                onDelete={(c) => setConfirmDelete({ type: 'categoria', id: c.id, label: c.nombre })}
              />
            )}
            {view === 'transacciones' && (
              <TransactionsView
                transacciones={transacciones}
                cuentas={cuentas}
                onAdd={() => setTxModal('new')}
                onEdit={(t) => setTxModal(t)}
                onDelete={(t) => setConfirmDelete({ type: 'transaccion', id: t.id, label: t.descripcion || 'movimiento' })}
              />
            )}
          </>
        )}
      </main>

      {/* mobile nav */}
      <nav className="mobile-nav">
        {NAV.map(({ key, label }) => (
          <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>
            {label}
          </button>
        ))}
      </nav>

      {xpToast && (
        <div className="xp-toast">+111 XP</div>
      )}

      {accountModal && (
        <AccountForm
          initial={accountModal === 'new' ? null : accountModal}
          onCancel={() => setAccountModal(null)}
          onSave={guardarCuenta}
          saving={saving}
        />
      )}
      {categoryModal && (
        <CategoryForm
          initial={categoryModal === 'new' ? null : categoryModal}
          onCancel={() => setCategoryModal(null)}
          onSave={guardarCategoria}
          saving={saving}
        />
      )}
      {txModal && (
        <TransactionForm
          initial={txModal === 'new' ? null : txModal}
          cuentas={cuentas}
          categorias={categorias}
          onCancel={() => setTxModal(null)}
          onSave={guardarTransaccion}
          saving={saving}
        />
      )}
      {confirmDelete && (
        <Modal title="Confirmar eliminación" onClose={() => setConfirmDelete(null)}>
          <p>¿Eliminar <strong>{confirmDelete.label}</strong>? Esta acción no se puede deshacer.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
            <button className="btn danger" onClick={confirmarEliminar} disabled={saving}>
              {saving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
