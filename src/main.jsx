import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker desactivado: nos aseguramos de desregistrar cualquiera
// que haya quedado instalado de versiones anteriores y de limpiar su cache.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registraciones) => {
    registraciones.forEach((registracion) => registracion.unregister());
  });
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}