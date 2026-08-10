import { auth } from './firebase.js';

const API_URL = import.meta.env.VITE_API_URL;

async function authFetch(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión activa');
  const token = await user.getIdToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const data = await res.json();
      mensaje = data.error || mensaje;
    } catch (_) {}
    throw new Error(mensaje);
  }
  if (res.status === 204) return null;
  return res.json();
}

// XP / niveles (compartido con las demás apps del RPG)
export const sumarXp = (delta) =>
  authFetch('/api/personajes/mio/sumar-xp', { method: 'PUT', body: JSON.stringify({ delta }) });

// Cuentas
export const listarCuentas = () => authFetch('/api/cuentas');
export const crearCuenta = (data) => authFetch('/api/cuentas', { method: 'POST', body: JSON.stringify(data) });
export const editarCuenta = (id, data) => authFetch(`/api/cuentas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const eliminarCuenta = (id) => authFetch(`/api/cuentas/${id}`, { method: 'DELETE' });

// Categorías de gasto
export const listarCategorias = () => authFetch('/api/categorias-gasto');
export const crearCategoria = (data) => authFetch('/api/categorias-gasto', { method: 'POST', body: JSON.stringify(data) });
export const editarCategoria = (id, data) => authFetch(`/api/categorias-gasto/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const eliminarCategoria = (id) => authFetch(`/api/categorias-gasto/${id}`, { method: 'DELETE' });

// Transacciones
export const listarTransacciones = () => authFetch('/api/transacciones');
export const crearTransaccion = (data) => authFetch('/api/transacciones', { method: 'POST', body: JSON.stringify(data) });
export const editarTransaccion = (id, data) => authFetch(`/api/transacciones/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const eliminarTransaccion = (id) => authFetch(`/api/transacciones/${id}`, { method: 'DELETE' });

// Presupuesto por categoría y mes
export const listarPresupuesto = (mes) => authFetch(`/api/presupuesto?mes=${mes}`);
export const asignarPresupuesto = (categoriaId, mes, montoAsignado) =>
  authFetch('/api/presupuesto', { method: 'POST', body: JSON.stringify({ categoriaId, mes, montoAsignado }) });