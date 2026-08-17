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
  TransferForm,
  ReconcileForm,
  BudgetView,
  PersonajeView,
  mesActualISO,
  Modal,
} from './views.jsx';

const NAV = [
  { key: 'dashboard', label: 'Panel' },
  { key: 'presupuesto', label: 'Presupuesto' },
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'transacciones', label: 'Transacciones' },
  { key: 'personaje', label: 'Mi Personaje' },
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

  const [mes, setMes] = useState(mesActualISO());
  const [presupuesto, setPresupuesto] = useState([]);
  const [cargandoPresupuesto, setCargandoPresupuesto] = useState(false);

  const [personaje, setPersonaje] = useState(null);
  const [cargandoPersonaje, setCargandoPersonaje] = useState(false);
  const [niveles, setNiveles] = useState([]);

  const [accountModal, setAccountModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [txModal, setTxModal] = useState(null);
  const [transferModal, setTransferModal] = useState(false);
  const [reconcileModal, setReconcileModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [xpToast, setXpToast] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      setCargandoPersonaje(true);
      try {
        const [p, nv] = await Promise.all([api.obtenerPersonaje(), api.listarNiveles()]);
        setPersonaje(p);
        setNiveles(nv);
      } catch (err) {
        console.error('No se pudo cargar el personaje', err);
      } finally {
        setCargandoPersonaje(false);
      }
    })();
  }, [usuario]);

  const cargarPresupuesto = async (mesAConsultar) => {
    setCargandoPresupuesto(true);
    setErrorGlobal('');
    try {
      const p = await api.listarPresupuesto(mesAConsultar);
      setPresupuesto(p);
    } catch (err) {
      setErrorGlobal(err.message);
    } finally {
      setCargandoPresupuesto(false);
    }
  };

  useEffect(() => {
    if (!usuario) return;
    cargarPresupuesto(mes);
  }, [usuario, mes]);

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
        const sumaTransacciones = transacciones
          .filter((t) => t.cuentaId === data.id)
          .reduce((s, t) => s + Number(t.monto), 0);
        const nuevoSaldoInicial = data.monto - sumaTransacciones;
        const actualizada = await api.editarCuenta(data.id, { nombre: data.nombre, tipo: data.tipo, saldoInicial: nuevoSaldoInicial });
        setCuentas((prev) => prev.map((c) => (c.id === data.id ? actualizada : c)));
      } else {
        const nueva = await api.crearCuenta({ nombre: data.nombre, tipo: data.tipo, saldoInicial: data.monto });
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
        cargarPresupuesto(mes);
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
      // el gasto recién cargado puede afectar el "gastado" del mes actual, refrescamos
      if (mes === (data.fecha || '').slice(0, 7)) {
        cargarPresupuesto(mes);
      }
    });

  const guardarTransferencia = (data) =>
    withSaving(async () => {
      const resultado = await api.transferir(data);
      setTransacciones((prev) => [resultado.entrada, resultado.salida, ...prev]);
      setTransferModal(false);
    });

  const guardarConciliacion = (data) =>
    withSaving(async () => {
      if (data.diferencia !== 0) {
        const nueva = await api.crearTransaccion({
          cuentaId: data.cuentaId,
          categoriaId: null,
          fecha: new Date().toISOString().slice(0, 10),
          descripcion: 'Ajuste de conciliación',
          monto: data.diferencia,
          nota: `Saldo real ingresado: ${data.saldoReal}`,
        });
        setTransacciones((prev) => [nueva, ...prev]);
      }
      setReconcileModal(null);
    });

  const asignarPresupuesto = (categoriaId, montoAsignado) =>
    withSaving(async () => {
      await api.asignarPresupuesto(categoriaId, mes, montoAsignado);
      setPresupuesto((prev) =>
        prev.map((p) => (p.categoriaId === categoriaId ? { ...p, montoAsignado } : p))
      );
    });

  const confirmarEliminar = () =>
    withSaving(async () => {
      const { type, id } = confirmDelete;
      if (type === 'cuenta') {
        await api.eliminarCuenta(id);
        setCuentas((prev) => prev.filter((c) => c.id !== id));
        setTransacciones((prev) => prev.filter((t) => t.cuentaId !== id));
        cargarPresupuesto(mes);
      }
      if (type === 'categoria') {
        await api.eliminarCategoria(id);
        setCategorias((prev) => prev.filter((c) => c.id !== id));
        setTransacciones((prev) => prev.map((t) => (t.categoriaId === id ? { ...t, categoriaId: null } : t)));
        cargarPresupuesto(mes);
      }
      if (type === 'transaccion') {
        await api.eliminarTransaccion(id);
        setTransacciones((prev) => prev.filter((t) => t.id !== id));
        cargarPresupuesto(mes);
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
      <header className="mobile-header">
        <span className="mobile-header-title">hk-budget-web</span>
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú">☰</button>
      </header>

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
          <p className="mono">{cargandoDatos ? '...' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBalance)}</p>
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
                presupuesto={presupuesto}
                personaje={personaje}
                niveles={niveles}
                onVerDetallesPersonaje={() => setView('personaje')}
                onCerrarSesion={logout}
              />
            )}
            {view === 'presupuesto' && (
              <BudgetView
                presupuesto={presupuesto}
                mes={mes}
                onCambiarMes={setMes}
                onAsignar={asignarPresupuesto}
                categorias={categorias}
                saving={saving || cargandoPresupuesto}
                totalBalance={totalBalance}
              />
            )}
            {view === 'cuentas' && (
              <AccountsView
                cuentas={cuentas}
                balanceOf={balanceOf}
                onAdd={() => setAccountModal('new')}
                onEdit={(c) => setAccountModal({ ...c, saldoActual: balanceOf(c.id) })}
                onDelete={(c) => setConfirmDelete({ type: 'cuenta', id: c.id, label: c.nombre })}
                onTransfer={() => setTransferModal(true)}
                onReconcile={(c) => setReconcileModal({ ...c, saldoActual: balanceOf(c.id) })}
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
            {view === 'personaje' && (
              <PersonajeView personaje={personaje} cargando={cargandoPersonaje} />
            )}
          </>
        )}
      </main>

      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <p className="mobile-menu-email">{usuario.email}</p>
              <button className="icon-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú">✕</button>
            </div>
            <nav>
              {NAV.map(({ key, label }) => (
                <button
                  key={key}
                  className={view === key ? 'active' : ''}
                  onClick={() => {
                    setView(key);
                    setMobileMenuOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="saldo">
              <p>Saldo total</p>
              <p className="mono">
                {cargandoDatos
                  ? '...'
                  : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBalance)}
              </p>
            </div>
            <button className="btn ghost logout" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      )}

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
      {transferModal && (
        <TransferForm
          cuentas={cuentas}
          onCancel={() => setTransferModal(false)}
          onSave={guardarTransferencia}
          saving={saving}
        />
      )}
      {reconcileModal && (
        <ReconcileForm
          cuenta={reconcileModal}
          saldoActual={reconcileModal.saldoActual}
          onCancel={() => setReconcileModal(null)}
          onSave={guardarConciliacion}
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