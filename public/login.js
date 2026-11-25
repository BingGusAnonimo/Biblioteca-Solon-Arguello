'use strict';
(() => {
  const form = document.querySelector('#login-form');
  const mensaje = document.querySelector('#mensaje');
  const boton = document.querySelector('#login-btn');
  const privado = new Set(['/admin.html', '/libros.html', '/ejemplares.html', '/lectores.html', '/prestamos.html', '/reportes.html']);
  const solicitado = new URLSearchParams(location.search).get('next');
  const destino = privado.has(solicitado) ? solicitado : '/admin.html';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    mensaje.textContent = '';
    boton.disabled = true;
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ usuario: document.querySelector('#usuario').value.trim(), contrasena: document.querySelector('#contrasena').value })
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'No se pudo iniciar sesión.');
      location.replace(destino);
    } catch (error) {
      mensaje.textContent = error.message;
    } finally { boton.disabled = false; }
  });
})();
