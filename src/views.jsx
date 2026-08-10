import { useState } from 'react';

export const currency = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Cuenta corriente' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'credit', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

// ---------- atoms ----------
export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ title, hint, action }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      <p className="empty-hint">{hint}</p>
      {action}
    </div>
  );
}

// ---------- Dashboard ----------
export function Dashboard({ cuentas, categorias, transacciones, balanceOf, categorySpent, totalBalance }) {
  const recientes = [...transacciones].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 5);
  const topCategorias = categorias
    .map((c) => ({ ...c, gastado: categorySpent(c.id) }))
    .filter((c) => c.gastado > 0)
    .sort((a, b) => b.gastado - a.gastado)
    .slice(0, 5);

  return (
    <div>
      <h2 className="view-title">Panel</h2>
      <p className="view-sub">Un vistazo rápido a tu plata.</p>

      <div className="cards-row">
        <div className="card total">
          <p className="label">Saldo total</p>
          <p className="value">{currency(totalBalance)}</p>
        </div>
        {cuentas.slice(0, 3).map((c) => (
          <div key={c.id} className="card">
            <p className="label">{c.nombre}</p>
            <p className="value">{currency(balanceOf(c.id))}</p>
          </div>
        ))}
      </div>

      {cuentas.length === 0 && (
        <EmptyState title="Todavía no tenés cuentas" hint="Creá tu primera cuenta para empezar a registrar movimientos." />
      )}

      {topCategorias.length > 0 && (
        <div className="section">
          <p className="section-title">Categorías con más gasto</p>
          <div className="bar-list">
            {topCategorias.map((c) => (
              <div key={c.id} className="bar-row">
                <span className="bar-label">{c.nombre}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.min(100, (c.gastado / topCategorias[0].gastado) * 100)}%` }} />
                </div>
                <span className="bar-value">{currency(c.gastado)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <p className="section-title">Últimos movimientos</p>
        {recientes.length === 0 ? (
          <EmptyState title="Sin movimientos aún" hint="Registrá tu primera transacción para verla acá." />
        ) : (
          <div className="list-box">
            {recientes.map((t) => (
              <TxRow key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TxRow({ t }) {
  const positive = Number(t.monto) >= 0;
  return (
    <div className="list-row">
      <div className="desc">
        <p>{t.descripcion || 'Sin descripción'}</p>
        <p className="muted">
          {t.fecha} · {t.cuentaNombre || 'Cuenta'} {t.categoriaNombre ? `· ${t.categoriaNombre}` : ''}
        </p>
      </div>
      <p className={`amount ${positive ? 'pos' : 'neg'}`}>
        {positive ? '+' : '-'} {currency(Math.abs(t.monto))}
      </p>
    </div>
  );
}

// ---------- Cuentas ----------
export function AccountsView({ cuentas, balanceOf, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div className="top-bar">
        <div>
          <h2 className="view-title">Cuentas</h2>
          <p className="view-sub">Dónde vive tu plata.</p>
        </div>
        <button className="btn" onClick={onAdd}>+ Nueva cuenta</button>
      </div>
      {cuentas.length === 0 ? (
        <EmptyState
          title="Todavía no tenés cuentas"
          hint="Agregá tu cuenta corriente, caja de ahorro, tarjeta o efectivo."
          action={<button className="btn mt" onClick={onAdd}>+ Crear cuenta</button>}
        />
      ) : (
        <div className="grid-3">
          {cuentas.map((c) => (
            <div key={c.id} className="tile">
              <p className="tipo">{ACCOUNT_TYPES.find((t) => t.value === c.tipo)?.label || c.tipo}</p>
              <p className="nombre">{c.nombre}</p>
              <p className="saldo-tile">{currency(balanceOf(c.id))}</p>
              <div className="tile-actions">
                <button className="icon-btn" onClick={() => onEdit(c)}>✎</button>
                <button className="icon-btn danger" onClick={() => onDelete(c)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccountForm({ initial, onCancel, onSave, saving }) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [tipo, setTipo] = useState(initial?.tipo || 'checking');
  const [saldoInicial, setSaldoInicial] = useState(initial?.saldoInicial ?? 0);

  const submit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onSave({ id: initial?.id, nombre: nombre.trim(), tipo, saldoInicial: Number(saldoInicial) || 0 });
  };

  return (
    <Modal title={initial ? 'Editar cuenta' : 'Nueva cuenta'} onClose={onCancel}>
      <form onSubmit={submit}>
        <Field label="Nombre">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Banco Nación" autoFocus />
        </Field>
        <Field label="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Saldo inicial">
          <input type="number" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Categorías ----------
export function CategoriesView({ categorias, categorySpent, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div className="top-bar">
        <div>
          <h2 className="view-title">Categorías</h2>
          <p className="view-sub">Un destino para cada gasto.</p>
        </div>
        <button className="btn" onClick={onAdd}>+ Nueva categoría</button>
      </div>
      {categorias.length === 0 ? (
        <EmptyState
          title="Todavía no tenés categorías"
          hint="Creá categorías como Comida, Transporte o Alquiler."
          action={<button className="btn mt" onClick={onAdd}>+ Crear categoría</button>}
        />
      ) : (
        <div className="grid-3">
          {categorias.map((c) => (
            <div key={c.id} className="tile">
              <p className="nombre">{c.nombre}</p>
              <p className="tipo">Gastado en total</p>
              <p className="saldo-tile coral">{currency(categorySpent(c.id))}</p>
              <div className="tile-actions">
                <button className="icon-btn" onClick={() => onEdit(c)}>✎</button>
                <button className="icon-btn danger" onClick={() => onDelete(c)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryForm({ initial, onCancel, onSave, saving }) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const submit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onSave({ id: initial?.id, nombre: nombre.trim() });
  };
  return (
    <Modal title={initial ? 'Editar categoría' : 'Nueva categoría'} onClose={onCancel}>
      <form onSubmit={submit}>
        <Field label="Nombre">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Comida" autoFocus />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Transacciones ----------
export function TransactionsView({ transacciones, cuentas, onAdd, onEdit, onDelete }) {
  const ordenadas = [...transacciones].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return (
    <div>
      <div className="top-bar">
        <div>
          <h2 className="view-title">Transacciones</h2>
          <p className="view-sub">El registro de cada movimiento.</p>
        </div>
        <button className="btn" onClick={onAdd} disabled={cuentas.length === 0}>+ Nueva</button>
      </div>
      {cuentas.length === 0 ? (
        <EmptyState title="Creá una cuenta primero" hint="Necesitás al menos una cuenta para registrar movimientos." />
      ) : ordenadas.length === 0 ? (
        <EmptyState
          title="Sin movimientos aún"
          hint="Registrá un ingreso o un gasto para empezar tu historial."
          action={<button className="btn mt" onClick={onAdd}>+ Registrar movimiento</button>}
        />
      ) : (
        <div className="list-box">
          {ordenadas.map((t) => {
            const positive = Number(t.monto) >= 0;
            return (
              <div key={t.id} className="list-row group">
                <div className="desc">
                  <p>
                    <span className="mono muted small">{t.fecha}</span> {t.descripcion || 'Sin descripción'}
                  </p>
                  <p className="muted">{t.cuentaNombre} {t.categoriaNombre ? `· ${t.categoriaNombre}` : ''}</p>
                </div>
                <div className="row-actions">
                  <span className={`amount ${positive ? 'pos' : 'neg'}`}>
                    {positive ? '+' : '-'} {currency(Math.abs(t.monto))}
                  </span>
                  <button className="icon-btn" onClick={() => onEdit(t)}>✎</button>
                  <button className="icon-btn danger" onClick={() => onDelete(t)}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TransactionForm({ initial, cuentas, categorias, onCancel, onSave, saving }) {
  const [fecha, setFecha] = useState(initial?.fecha?.slice(0, 10) || todayISO());
  const [descripcion, setDescripcion] = useState(initial?.descripcion || '');
  const [cuentaId, setCuentaId] = useState(initial?.cuentaId || cuentas[0]?.id || '');
  const [categoriaId, setCategoriaId] = useState(initial?.categoriaId || '');
  const [tipo, setTipo] = useState(initial ? (Number(initial.monto) >= 0 ? 'in' : 'out') : 'out');
  const [monto, setMonto] = useState(initial ? Math.abs(initial.monto) : '');
  const [nota, setNota] = useState(initial?.nota || '');

  const submit = (e) => {
    e.preventDefault();
    if (!cuentaId || !monto) return;
    const montoFinal = tipo === 'out' ? -Math.abs(Number(monto)) : Math.abs(Number(monto));
    onSave({
      id: initial?.id,
      cuentaId: Number(cuentaId),
      categoriaId: categoriaId ? Number(categoriaId) : null,
      fecha,
      descripcion: descripcion.trim(),
      monto: montoFinal,
      nota: nota.trim(),
    });
  };

  return (
    <Modal title={initial ? 'Editar transacción' : 'Nueva transacción'} onClose={onCancel}>
      <form onSubmit={submit}>
        <div className="toggle-row">
          <button type="button" className={`toggle-btn ${tipo === 'out' ? 'active-neg' : ''}`} onClick={() => setTipo('out')}>Gasto</button>
          <button type="button" className={`toggle-btn ${tipo === 'in' ? 'active-pos' : ''}`} onClick={() => setTipo('in')}>Ingreso</button>
        </div>
        <Field label="Monto">
          <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus />
        </Field>
        <Field label="Descripción">
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Supermercado" />
        </Field>
        <div className="field-row">
          <Field label="Cuenta">
            <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Categoría">
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field label="Nota (opcional)">
          <input value={nota} onChange={(e) => setNota(e.target.value)} />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Presupuesto (asignación por categoría y mes) ----------
export function mesActualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function nombreMes(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, 1);
  const nombre = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

function sumarMes(mesISO, delta) {
  const [anio, mes] = mesISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1 + delta, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export function BudgetView({ presupuesto, mes, onCambiarMes, onAsignar, categorias, saving, totalBalance }) {
  const totalAsignado = presupuesto.reduce((s, p) => s + Number(p.montoAsignado), 0);
  const totalGastado = presupuesto.reduce((s, p) => s + Number(p.gastado), 0);
  const totalDisponibleAcumulado = presupuesto.reduce((s, p) => s + Number(p.disponible), 0);
  const sinAsignar = totalBalance - totalDisponibleAcumulado;

  return (
    <div>
      <div className="top-bar">
        <div>
          <h2 className="view-title">Presupuesto</h2>
          <p className="view-sub">Asignale un destino a cada peso, mes a mes.</p>
        </div>
        <div className="month-switch">
          <button className="icon-btn" onClick={() => onCambiarMes(sumarMes(mes, -1))}>◀</button>
          <span className="month-label">{nombreMes(mes)}</span>
          <button className="icon-btn" onClick={() => onCambiarMes(sumarMes(mes, 1))}>▶</button>
        </div>
      </div>

      <div className={`sin-asignar-banner ${sinAsignar < 0 ? 'sobregirado' : sinAsignar === 0 ? 'completo' : ''}`}>
        <p className="sin-asignar-label">
          {sinAsignar < 0 ? 'Asignaste de más' : sinAsignar === 0 ? 'Todo asignado' : 'Sin asignar'}
        </p>
        <p className="sin-asignar-value">{currency(Math.abs(sinAsignar))}</p>
        <p className="sin-asignar-hint">
          {sinAsignar < 0
            ? 'Sacale plata a alguna categoría para volver a cuadrar.'
            : sinAsignar === 0
            ? 'Le diste un destino a cada peso que tenés.'
            : 'Esta plata todavía no tiene un destino — asignala a alguna categoría de abajo.'}
        </p>
      </div>

      <div className="cards-row">
        <div className="card">
          <p className="label">Asignado</p>
          <p className="value">{currency(totalAsignado)}</p>
        </div>
        <div className="card">
          <p className="label">Gastado</p>
          <p className="value" style={{ color: 'var(--coral)' }}>{currency(totalGastado)}</p>
        </div>
        <div className="card total">
          <p className="label">Disponible</p>
          <p className="value">{currency(totalDisponibleAcumulado)}</p>
        </div>
      </div>

      {categorias.length === 0 ? (
        <EmptyState
          title="Todavía no tenés categorías"
          hint="Creá categorías en la sección Categorías antes de asignarles presupuesto."
        />
      ) : (
        <div className="list-box">
          {presupuesto.map((p) => {
            const disponible = Number(p.disponible);
            return (
              <div key={p.categoriaId} className="budget-row">
                <span className="budget-nombre">{p.categoriaNombre}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="budget-input"
                  defaultValue={p.montoAsignado}
                  onBlur={(e) => {
                    const valor = Number(e.target.value) || 0;
                    if (valor !== Number(p.montoAsignado)) onAsignar(p.categoriaId, valor);
                  }}
                  disabled={saving}
                />
                <span className="budget-gastado">{currency(p.gastado)}</span>
                <span className={`budget-disponible ${disponible < 0 ? 'neg' : ''}`}>
                  {currency(disponible)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}