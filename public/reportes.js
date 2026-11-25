'use strict';

// Visualización de solo lectura. No realiza Mutations ni modifica documentos.
(() => {
  const U = window.ReportesUtil;
  const $ = id => document.getElementById(id);
  const state = { reportes: [], seleccionado: null, filas: [], cargado: false, requestId: 0, abortController: null };

  async function graphql(query, signal) {
    const r = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }), signal
    });
    let json;
    try { json = await r.json(); } catch (_) { throw new Error('La respuesta del servidor no es JSON válido.'); }
    if (!r.ok || (json.errors && json.errors.length)) {
      throw new Error((json.errors || []).map(e => e.message).join(' · ') || `HTTP ${r.status}`);
    }
    if (!json.data) throw new Error('GraphQL no devolvió datos.');
    return json.data;
  }
  const estado = (texto, tipo = '') => {
    $('report-status').textContent = texto;
    $('report-status').className = 'report-status ' + tipo;
  };
  function conexion(ok) {
    $('connection-pill').className = ok ? 'connection' : 'connection offline';
    $('connection-pill').textContent = ok ? '● Atlas conectado' : '● Sin conexión';
  }
  function rellenarSelector() {
    const area = $('area-select').value;
    const previo = $('report-select').value || state.seleccionado?.campo;
    const reportes = state.reportes.filter(r => area === 'TODOS' || r.area === area);
    const select = $('report-select');
    select.replaceChildren();
    for (const r of reportes) {
      const opt = document.createElement('option');
      opt.value = r.campo;
      opt.textContent = `${r.codigo} · ${r.nombre}`;
      select.append(opt);
    }
    if (reportes.some(r => r.campo === previo)) select.value = previo;
    $('report-count').textContent = `${reportes.length} de ${state.reportes.length} reportes`;
  }
  function limpiaVista(mensaje) {
    $('kpi-rows').textContent = '—'; $('kpi-total').textContent = '—'; $('kpi-time').textContent = '—';
    $('table-count').textContent = '0 filas';
    $('result-body').replaceChildren();
    const tr = document.createElement('tr'); const td = document.createElement('td');
    td.colSpan = 6; td.className = 'empty'; td.textContent = mensaje;
    tr.append(td); $('result-body').append(tr);
    $('chart-area').replaceChildren();
    const empty = document.createElement('div'); empty.className = 'report-empty'; empty.textContent = mensaje; $('chart-area').append(empty);
    $('chart-foot').textContent = 'No hay datos para representar.';
    $('measure-select').disabled = true; $('csv-btn').disabled = true; $('json-btn').disabled = true;
  }
  function tabla(filas) {
    const tbody = $('result-body'); tbody.replaceChildren();
    if (!filas.length) { limpiaVista('Esta consulta no encontró resultados con los datos actuales.'); return; }
    const frag = document.createDocumentFragment();
    for (const fila of filas) {
      const tr = document.createElement('tr');
      for (const campo of U.COLUMNAS) {
        const td = document.createElement('td');
        td.textContent = campo === 'etiqueta' || campo === 'detalle' ? (fila[campo] ?? '—') : U.formatear(fila[campo], campo);
        if (campo === 'etiqueta') td.title = fila.etiqueta;
        tr.append(td);
      }
      frag.append(tr);
    }
    tbody.append(frag);
    $('table-count').textContent = `${filas.length} filas`;
  }
  function grafica() {
    const area = $('chart-area'); area.replaceChildren();
    const medida = $('measure-select').value;
    $('chart-subtitle').textContent = `Comparación por ${U.MEDIDAS[medida].toLowerCase()}`;
    const datos = U.datosGrafica(state.filas, medida, 15);
    if (!datos.length) {
      const d = document.createElement('div'); d.className = 'report-empty'; d.textContent = 'No hay valores de esta medida para graficar.'; area.append(d);
      return;
    }
    for (const dato of datos) {
      const row = document.createElement('div'); row.className = 'report-bar';
      const label = document.createElement('span'); label.className = 'bar-label'; label.textContent = dato.etiqueta; label.title = dato.etiqueta;
      const track = document.createElement('div'); track.className = 'bar-track';
      const fill = document.createElement('div'); fill.className = 'bar-fill'; fill.style.width = `${dato.porcentajeBarra}%`;
      track.title = `${dato.etiqueta}: ${U.formatear(dato.valor, medida)}`; track.append(fill);
      const v = document.createElement('span'); v.className = 'bar-value'; v.textContent = U.formatear(dato.valor, medida);
      row.append(label, track, v); area.append(row);
    }
    $('chart-foot').textContent = `Mostrando ${datos.length} de ${state.filas.length} filas. ` +
      (medida === 'porcentaje' ? 'Escala porcentual con referencia de 100%. ' : 'Longitudes relativas al valor máximo mostrado. ') +
      'Las cifras provienen de GraphQL y pueden representar métricas diferentes según el reporte.';
  }
  function actualizarMedidas(filas) {
    const disponibles = U.medidasDisponibles(filas);
    const select = $('measure-select'); const anterior = select.value;
    select.replaceChildren();
    for (const medida of disponibles) {
      const opt = document.createElement('option'); opt.value = medida; opt.textContent = U.MEDIDAS[medida]; select.append(opt);
    }
    if (disponibles.includes(anterior)) select.value = anterior;
    select.disabled = !disponibles.length;
  }
  function descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nombre;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function metadataSeleccionada() {
    return state.reportes.find(r => r.campo === $('report-select').value) || null;
  }
  async function ejecutar() {
    const reporte = metadataSeleccionada();
    if (!reporte) return estado('Selecciona un reporte disponible.', 'error');
    state.seleccionado = reporte; state.cargado = false; state.filas = [];
    state.requestId += 1;
    const id = state.requestId;
    state.abortController?.abort(); state.abortController = new AbortController();
    $('run-btn').disabled = true; $('refresh-btn').disabled = true;
    $('report-code').textContent = reporte.codigo;
    $('report-title').textContent = reporte.nombre;
    const responsable = reporte.area === 'LIBROS' ? 'Juan Ángel · Libros e inventario' :
      reporte.area === 'LECTORES' ? 'Samuel Aarón · Lectores y actividad' : 'Sebastián Emiliano · Préstamos';
    $('report-description').textContent = responsable;
    $('copy-query-btn').disabled = false;
    limpiaVista('Consultando MongoDB Atlas…'); estado(`Ejecutando ${reporte.codigo} (${reporte.campo})…`);
    try {
      const data = await graphql(U.queryReporte(reporte.campo), state.abortController.signal);
      if (id !== state.requestId) return;
      if (!Array.isArray(data[reporte.campo])) throw new Error('La API no devolvió una lista para este reporte.');
      const filas = data[reporte.campo].map(U.normalizarFila);
      state.filas = filas; state.cargado = true;
      conexion(true);
      $('kpi-rows').textContent = U.formatear(filas.length);
      $('kpi-total').textContent = U.formatear(filas.reduce((sum, f) => sum + f.cantidad, 0));
      $('kpi-time').textContent = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      if (!filas.length) {
        limpiaVista('Esta consulta no encontró resultados con los datos actuales.');
        $('kpi-rows').textContent = '0'; $('kpi-total').textContent = '0';
        $('kpi-time').textContent = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      } else {
        tabla(filas); actualizarMedidas(filas); grafica();
      }
      $('csv-btn').disabled = !filas.length; $('json-btn').disabled = !filas.length;
      estado(`Reporte ${reporte.codigo} consultado correctamente: ${filas.length} filas.`, 'success');
      try { history.replaceState(null, '', `?reporte=${encodeURIComponent(reporte.codigo)}`); } catch (_) { /* opcional */ }
    } catch (error) {
      if (id !== state.requestId || error.name === 'AbortError') return;
      conexion(false); limpiaVista('No se pudo consultar el reporte.');
      estado(`Error en ${reporte.codigo}: ${error.message}. Revisa la consola y Apollo Sandbox.`, 'error');
    } finally {
      if (id === state.requestId) { $('run-btn').disabled = false; $('refresh-btn').disabled = false; }
    }
  }
  async function iniciar() {
    if (!await window.SolonSesion.verificar()) return;
    window.SolonSesion.ponerBoton();
    $('run-btn').disabled = true; $('refresh-btn').disabled = true;
    try {
      const data = await graphql('query ListarReportes { reportesDisponibles { codigo campo nombre area } }');
      const lista = Array.isArray(data.reportesDisponibles) ? data.reportesDisponibles : [];
      state.reportes = lista.filter(U.esReporteValido).sort((a, b) => a.codigo.localeCompare(b.codigo));
      if (!state.reportes.length) throw new Error('La API no tiene los reportes instalados.');
      rellenarSelector();
      const param = new URLSearchParams(location.search).get('reporte');
      const inicial = state.reportes.find(r => r.codigo === param) || state.reportes[0];
      $('report-select').value = inicial.campo;
      conexion(true);
      $('run-btn').disabled = false; $('refresh-btn').disabled = false;
      await ejecutar();
    } catch (error) {
      conexion(false); estado(`No se pudo cargar la lista de reportes: ${error.message}`, 'error');
      limpiaVista('Comprueba que npm start esté ejecutando el servidor con las 30 consultas.');
      $('run-btn').disabled = false; $('refresh-btn').disabled = false;
    }
  }
  $('area-select').addEventListener('change', () => { rellenarSelector(); ejecutar(); });
  $('report-select').addEventListener('change', ejecutar);
  $('run-btn').addEventListener('click', ejecutar);
  $('refresh-btn').addEventListener('click', ejecutar);
  $('measure-select').addEventListener('change', grafica);
  $('copy-query-btn').addEventListener('click', async () => {
    if (!state.seleccionado) return;
    const q = U.queryReporte(state.seleccionado.campo);
    try { await navigator.clipboard.writeText(q); estado('Consulta GraphQL copiada al portapapeles.', 'success'); }
    catch (_) { estado('No se pudo copiar automáticamente. Abre Apollo y utiliza el campo ' + state.seleccionado.campo, 'error'); }
  });
  $('csv-btn').addEventListener('click', () => {
    if (!state.cargado || !state.filas.length) return;
    descargar(`${state.seleccionado.codigo}-reporte.csv`, U.crearCSV(state.filas), 'text/csv;charset=utf-8');
  });
  $('json-btn').addEventListener('click', () => {
    if (!state.cargado || !state.filas.length) return;
    descargar(`${state.seleccionado.codigo}-reporte.json`, JSON.stringify({ reporte: state.seleccionado, filas: state.filas }, null, 2), 'application/json;charset=utf-8');
  });
  iniciar();
})();
