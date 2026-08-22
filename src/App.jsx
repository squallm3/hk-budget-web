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
  ReconcileCategoryForm,
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
  const [reconcileCategoryModal, setReconcileCategoryModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [xpToast, setXpToast] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mostrarXpToast = () => {
    setXpToast(true);
    setTimeout(() => setXpToast(false), 2200);
  };

  // ---- carga de datos (reutilizable: login inicial, cambio de pantalla, y despues de cada accion) ----
  const cargarDatosPrincipales = async () => {
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
  };

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

  const cargarPersonaje = async () => {
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
  };

  // Refresca todo lo que puede haber cambiado, en paralelo.
  const refrescarTodo = () =>
    Promise.all([cargarDatosPrincipales(), cargarPresupuesto(mes), cargarPersonaje()]);

  useEffect(() => {
    const unsubscribe = suscribirseAUsuario((u) => {
      setUsuario(u);
      setCargandoAuth(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!usuario) return;
    cargarDatosPrincipales();
    cargarPersonaje();
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    cargarPresupuesto(mes);
  }, [usuario, mes]);

  // Cambiar de pantalla siempre trae los datos mas frescos, sin necesidad de F5.
  const irA = (viewKey) => {
    setView(viewKey);
    setMobileMenuOpen(false);
    refrescarTodo();
  };

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
        await api.editarCuenta(data.id, { nombre: data.nombre, tipo: data.tipo, saldoInicial: data.monto });
      } else {
        await api.crearCuenta({ nombre: data.nombre, tipo: data.tipo, saldoInicial: data.monto });
        api.sumarXp(111).catch((err) => console.error('No se pudo sumar XP', err));
        mostrarXpToast();
      }
      setAccountModal(null);
      await refrescarTodo();
    });

  const guardarCategoria = (data) =>
    withSaving(async () => {
      if (data.id) {
        await api.editarCategoria(data.id, data);
      } else {
        await api.crearCategoria(data);
        api.sumarXp(111).catch((err) => console.error('No se pudo sumar XP', err));
        mostrarXpToast();
      }
      setCategoryModal(null);
      await refrescarTodo();
    });

  const guardarTransaccion = (data) =>
    withSaving(async () => {
      if (data.id) {
        await api.editarTransaccion(data.id, data);
      } else {
        await api.crearTransaccion(data);
        api.sumarXp(111).catch((err) => console.error('No se pudo sumar XP', err));
        mostrarXpToast();
      }
      setTxModal(null);
      await refrescarTodo();
    });

  const guardarTransferencia = (data) =>
    withSaving(async () => {
      await api.transferir(data);
      setTransferModal(false);
      await refrescarTodo();
    });

  const guardarConciliacion = (data) =>
    withSaving(async () => {
      if (data.diferencia !== 0) {
        await api.crearTransaccion({
          cuentaId: data.cuentaId,
          categoriaId: null,
          fecha: new Date().toISOString().slice(0, 10),
          descripcion: 'Ajuste de conciliación',
          monto: data.diferencia,
          nota: `Saldo real ingresado: ${data.saldoReal}`,
        });
      }
      setReconcileModal(null);
      await refrescarTodo();
    });

  const guardarConciliacionCategoria = (data) =>
    withSaving(async () => {
      await api.crearTransaccion({
        cuentaId: data.cuentaId,
        categoriaId: data.categoriaId,
        fecha: new Date().toISOString().slice(0, 10),
        descripcion: 'Gasto no registrado (conciliación)',
        monto: -Math.abs(data.monto),
        nota: '',
      });
      setReconcileCategoryModal(null);
      await refrescarTodo();
    });

  const asignarPresupuesto = (categoriaId, montoAsignado) =>
    withSaving(async () => {
      await api.asignarPresupuesto(categoriaId, mes, montoAsignado);
      await refrescarTodo();
    });

  const confirmarEliminar = () =>
    withSaving(async () => {
      const { type, id } = confirmDelete;
      if (type === 'cuenta') await api.eliminarCuenta(id);
      if (type === 'categoria') await api.eliminarCategoria(id);
      if (type === 'transaccion') await api.eliminarTransaccion(id);
      setConfirmDelete(null);
      await refrescarTodo();
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
            <button key={key} className={view === key ? 'active' : ''} onClick={() => irA(key)}>
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
                onVerDetallesPersonaje={() => irA('personaje')}
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
                cuentas={cuentas}
                onReconcileCategory={(p) => setReconcileCategoryModal(p)}
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
                  onClick={() => irA(key)}
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
      {reconcileCategoryModal && (
        <ReconcileCategoryForm
          presupuestoItem={reconcileCategoryModal}
          cuentas={cuentas}
          onCancel={() => setReconcileCategoryModal(null)}
          onSave={guardarConciliacionCategoria}
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