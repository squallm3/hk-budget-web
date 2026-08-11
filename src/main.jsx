import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker desactivado: desregistramos cualquiera que haya quedado
// instalado de versiones anteriores y limpiamos su cache.
// Todo envuelto en try/catch para que un fallo de limpieza nunca rompa la app.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registraciones) => {
      registraciones.forEach((registracion) => {
        registracion.unregister();
      });
    })
    .catch(() => {});
}

if (typeof caches !== 'undefined') {
  caches
    .keys()
    .then((keys) => {
      keys.forEach((k) => {
        caches.delete(k);
      });
    })
    .catch(() => {});
}