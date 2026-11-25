'use strict';
// Funciones compartidas para las pantallas privadas. Se cargan antes de admin.js o reportes.js.
window.SolonSesion = (() => {
  let csrfToken = '';
  let usuario = '';

  async function verificar() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (!data.autenticado || !data.csrfToken) {
        location.replace(`/login.html?next=${encodeURIComponent(location.pathname)}`);
        return false;
      }
      csrfToken = data.csrfToken;
      usuario = data.usuario?.nombre || 'Administrador';
      return true;
    } catch (_) {
      location.replace('/login.html');
      return false;
    }
  }

  async function salir() {
    const r = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'x-csrf-token': csrfToken }
    });
    if (!r.ok) throw new Error('No fue posible cerrar la sesión.');
    location.replace('/login.html');
  }

  function ponerBoton() {
    const barra = document.querySelector('.top-right');
    if (!barra || barra.querySelector('#logout-btn')) return;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.id = 'logout-btn';
    boton.className = 'btn btn-outline';
    boton.textContent = 'Cerrar sesión';
    boton.title = `Sesión: ${usuario}`;
    boton.style.cssText = 'font-size:12px;padding:8px 12px;margin-left:8px;';
    boton.addEventListener('click', async () => {
      boton.disabled = true;
      try { await salir(); }
      catch (error) { alert(error.message); boton.disabled = false; }
    });
    barra.append(boton);
  }

  return { verificar, ponerBoton, get csrfToken() { return csrfToken; } };
})();
