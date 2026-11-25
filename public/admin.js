'use strict';

// Panel local de desarrollo. La API todavía NO tiene autenticación.
const page = document.body.dataset.page || 'dashboard';
const labels = {
  dashboard: ['Panel administrativo', 'Resumen de la información de la biblioteca.', 'Resumen'],
  books: ['Administración de libros', 'Agrega, busca y actualiza títulos del catálogo.', 'Libros'],
  copies: ['Inventario de ejemplares', 'Administra las copias físicas y su ubicación.', 'Ejemplares'],
  readers: ['Administración de lectores', 'Gestiona las personas registradas para préstamos.', 'Lectores'],
  loans: ['Préstamos y devoluciones', 'Consulta y registra movimientos del inventario.', 'Préstamos']
};
const state = { libros: [], ejemplares: [], lectores: [], prestamos: [], totals: {} };
let editingId = null;
let toastTimer;

const $ = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const shortDate = (value) => value ? new Date(value).toLocaleDateString('es-MX') : '—';
const badge = (value) => {
  const t = String(value || 'SIN ESTADO');
  const color = ['DISPONIBLE', 'DEVUELTO', 'ACTIVO'].includes(t) ? 'green' :
    ['PRESTADO'].includes(t) ? 'amber' : 'gray';
  return `<span class="pill ${color}">${escapeHtml(t)}</span>`;
};

function showToast(message, error = false) {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = 'toast visible' + (error ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.className = 'toast', 3600);
}

async function gql(query, variables = {}) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length) {
    throw new Error(result.errors?.map(x => x.message).join(' · ') || `HTTP ${response.status}`);
  }
  return result.data;
}

const QUERY_DATOS = `query PanelBiblioteca {
  totalLibros totalEjemplares totalLectores totalPrestamos
  libros(limite: 100) { id titulo autor categoria editorial anio isbn }
  ejemplares { id codigoInventario estado ubicacion libro { id titulo } }
  lectores(limite: 100) { id codigoLector nombre correo telefono activo }
  prestamos { id estado fechaPrestamo fechaVencimiento fechaDevolucion
    lector { id nombre }
    ejemplar { id codigoInventario estado libro { titulo } }
  }
}`;

async function load() {
  $('refresh-btn').disabled = true;
  try {
    const data = await gql(QUERY_DATOS);
    Object.assign(state, data);
    state.totals = {
      libros: data.totalLibros,
      ejemplares: data.totalEjemplares,
      lectores: data.totalLectores,
      prestamos: data.totalPrestamos
    };
    $('connection-pill').className = 'connection';
    $('connection-pill').innerHTML = '<span class="status-dot"></span>Atlas conectado';
    render();
  } catch (error) {
    $('connection-pill').className = 'connection offline';
    $('connection-pill').innerHTML = '<span class="status-dot"></span>Sin conexión';
    showToast(`No se pudieron cargar los datos: ${error.message}`, true);
    if (page === 'dashboard') {
      $('metrics').innerHTML = `<div class="empty">No hay conexión con GraphQL. Revisa la terminal.</div>`;
    } else {
      $('table-body').innerHTML = '<tr><td class="empty">No se pudieron consultar los registros.</td></tr>';
    }
  } finally {
    $('refresh-btn').disabled = false;
  }
}

function render() {
  if (page === 'dashboard') return renderDashboard();
  renderTable();
}

function renderDashboard() {
  const metrics = [
    ['Libros', '▤', state.totals.libros, 'Títulos del catálogo'],
    ['Ejemplares', '▥', state.totals.ejemplares, 'Copias físicas'],
    ['Lectores', '♙', state.totals.lectores, 'Personas registradas'],
    ['Préstamos', '↗', state.totals.prestamos, 'Movimientos históricos']
  ];
  $('metrics').innerHTML = metrics.map(([name, icon, count, note]) =>
    `<article class="metric"><div class="metric-top"><span class="metric-label">${name}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${Number(count || 0).toLocaleString('es-MX')}</div><span class="metric-foot">${note}</span></article>`
  ).join('');
  $('recent-list').innerHTML = state.prestamos.length ?
    state.prestamos.slice(0, 5).map(p => `<div class="recent-row"><span class="recent-icon">↗</span><div class="recent-body"><strong>${escapeHtml(p.ejemplar?.libro?.titulo || 'Libro no disponible')}</strong><span>${escapeHtml(p.lector?.nombre || 'Lector no disponible')} · ${shortDate(p.fechaPrestamo)}</span></div>${badge(p.estado)}</div>`).join('') :
    '<div class="empty"><span class="empty-big">▤</span>Todavía no hay préstamos registrados.</div>';
}

function getRows() {
  const term = ($('search').value || '').trim().toLocaleLowerCase('es-MX');
  const rows = ({ books: state.libros, copies: state.ejemplares, readers: state.lectores, loans: state.prestamos })[page] || [];
  if (!term) return rows;
  return rows.filter(row => JSON.stringify(row).toLocaleLowerCase('es-MX').includes(term));
}

function actionBtns(record) {
  const id = escapeHtml(record.id);
  if (page === 'loans') {
    return record.estado === 'ACTIVO' ? `<button class="action" data-action="return" data-id="${id}">Devolver</button>` : '—';
  }
  return `<div class="row-actions"><button class="action" data-action="edit" data-id="${id}">Editar</button><button class="action danger" data-action="delete" data-id="${id}">Eliminar</button></div>`;
}

const rowHtml = {
  books: r => `<td><strong>${escapeHtml(r.titulo)}</strong></td><td>${escapeHtml(r.autor)}</td><td>${escapeHtml(r.categoria)}</td><td>${escapeHtml(r.editorial || '—')}</td><td>${escapeHtml(r.anio || '—')}</td>`,
  copies: r => `<td><strong>${escapeHtml(r.codigoInventario)}</strong></td><td>${escapeHtml(r.libro?.titulo || 'Sin libro')}</td><td>${badge(r.estado)}</td><td>${escapeHtml(r.ubicacion || '—')}</td>`,
  readers: r => `<td><strong>${escapeHtml(r.codigoLector)}</strong></td><td>${escapeHtml(r.nombre)}</td><td>${escapeHtml(r.correo || '—')}</td><td>${escapeHtml(r.telefono || '—')}</td><td>${badge(r.activo ? 'ACTIVO' : 'INACTIVO')}</td>`,
  loans: r => `<td><strong>${escapeHtml(r.ejemplar?.codigoInventario || '—')}</strong><div style="font-size:10px;color:#99a6b6;margin-top:3px">${escapeHtml(r.ejemplar?.libro?.titulo || '—')}</div></td><td>${escapeHtml(r.lector?.nombre || '—')}</td><td>${shortDate(r.fechaPrestamo)}</td><td>${shortDate(r.fechaVencimiento)}</td><td>${badge(r.estado)}</td>`
};
const heads = {
  books: ['Título', 'Autor', 'Categoría', 'Editorial', 'Año', 'Acciones'],
  copies: ['Código', 'Libro', 'Estado', 'Ubicación', 'Acciones'],
  readers: ['Código', 'Nombre', 'Correo', 'Teléfono', 'Estado', 'Acciones'],
  loans: ['Ejemplar', 'Lector', 'Préstamo', 'Vencimiento', 'Estado', 'Acciones']
};

function renderTable() {
  const rows = getRows();
  $('table-head').innerHTML = `<tr>${heads[page].map(h => `<th>${h}</th>`).join('')}</tr>`;
  $('table-body').innerHTML = rows.length ? rows.map(r => `<tr>${rowHtml[page](r)}<td>${actionBtns(r)}</td></tr>`).join('') :
    `<tr><td colspan="${heads[page].length}" class="empty"><span class="empty-big">⌕</span>No se encontraron registros.</td></tr>`;
  const total = state.totals[({ books: 'libros', copies: 'ejemplares', readers: 'lectores', loans: 'prestamos' })[page]];
  $('count-pill').textContent = `${Number(total || 0).toLocaleString('es-MX')} registros en Atlas`;
  $('showing-count').textContent = `Mostrando ${rows.length} de ${total} registros`;
}

// Formularios: todos envían mutaciones GraphQL reales; no almacenan datos ficticios.
function input(name, label, value = '', type = 'text', opts = {}) {
  const required = opts.required ? 'required' : '';
  const wide = opts.wide ? 'wide' : '';
  const maxLength = opts.maxlength ? `maxlength="${opts.maxlength}"` : '';
  const minLength = opts.minlength ? `minlength="${opts.minlength}"` : '';
  const pattern = opts.pattern ? `pattern="${escapeHtml(opts.pattern)}"` : '';
  const minMax = type === 'number'
    ? `min="0" max="${new Date().getFullYear() + 1}" step="1"` : '';
  const dateMin = type === 'date' ? `min="${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}"` : '';
  return `<label class="form-field ${wide}"><span>${escapeHtml(label)}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${required} ${maxLength} ${minLength} ${pattern} ${minMax} ${dateMin}></label>`;
}
function select(name, label, options, selected = '', opts = {}) {
  return `<label class="form-field ${opts.wide ? 'wide' : ''}"><span>${escapeHtml(label)}</span><select name="${name}" required><option value="">Selecciona una opción</option>${options.map(o => `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(selected) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select></label>`;
}
function formMarkup(record) {
  if (page === 'books') return [
    input('titulo', 'Título', record?.titulo, 'text', { required: true, wide: true, minlength: 2, maxlength: 200 }),
    input('autor', 'Autor', record?.autor, 'text', { required: true, minlength: 2, maxlength: 150 }),
    input('categoria', 'Categoría', record?.categoria, 'text', { required: true, minlength: 2, maxlength: 100 }),
    input('editorial', 'Editorial', record?.editorial, 'text', { maxlength: 150 }),
    input('anio', 'Año de publicación', record?.anio, 'number'),
    input('isbn', 'ISBN (10 o 13 dígitos; opcional)', record?.isbn, 'text', { wide: true, maxlength: 25 })
  ].join('');
  if (page === 'copies') return record ?
    input('ubicacion', 'Ubicación del ejemplar', record.ubicacion, 'text', { wide: true, maxlength: 100 }) :
    select('libroId', 'Libro', state.libros.map(b => ({ value: b.id, label: b.titulo })), '', { wide: true }) +
    input('codigoInventario', 'Código de inventario', '', 'text', { required: true, minlength: 3, maxlength: 30 }) +
    input('ubicacion', 'Ubicación', '', 'text', { maxlength: 100 });
  if (page === 'readers') return (record ? '' : input('codigoLector', 'Código de lector', '', 'text', { required: true, minlength: 3, maxlength: 30 })) +
    input('nombre', 'Nombre completo', record?.nombre, 'text', { required: true, wide: !!record, minlength: 2, maxlength: 120 }) +
    input('correo', 'Correo electrónico', record?.correo, 'email', { maxlength: 254 }) +
    input('telefono', 'Teléfono (10 dígitos)', record?.telefono, 'tel', { maxlength: 10, pattern: '[0-9]{10}' }) +
    (record ? select('activo', 'Estado', [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }], String(record.activo), { wide: true }) : '');
  if (page === 'loans') {
    const lectores = state.lectores.filter(x => x.activo).map(x => ({ value: x.id, label: `${x.codigoLector} · ${x.nombre}` }));
    const ejemplares = state.ejemplares.filter(x => x.estado === 'DISPONIBLE').map(x => ({ value: x.id, label: `${x.codigoInventario} · ${x.libro?.titulo || 'Sin libro'}` }));
    const due = new Date(); due.setDate(due.getDate() + 7);
    const date = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}`;
    return select('lectorId', 'Lector activo', lectores, '', { wide: true }) +
      select('ejemplarId', 'Ejemplar disponible', ejemplares, '', { wide: true }) +
      input('fechaVencimiento', 'Fecha de devolución prevista', date, 'date', { required: true, wide: true });
  }
  return '';
}

function openDialog(record = null) {
  editingId = record?.id || null;
  const noun = ({ books: 'libro', copies: 'ejemplar', readers: 'lector', loans: 'préstamo' })[page];
  $('dialog-title').textContent = record ? `Editar ${noun}` : (page === 'loans' ? 'Registrar préstamo' : `Nuevo ${noun}`);
  $('form-fields').innerHTML = formMarkup(record);
  $('record-dialog').showModal();
}
function closeDialog() { $('record-dialog').close(); editingId = null; }
const varsFromForm = () => Object.fromEntries(new FormData($('record-form')).entries());
const nullIfEmpty = (v) => v === '' ? null : v;

// Reglas rápidas en la interfaz. Las mismas reglas importantes se vuelven
// a verificar en Mongoose: nunca se debe confiar únicamente en el navegador.
function validarFormulario(v, esEdicion) {
  const texto = (campo) => String(v[campo] ?? '').trim();
  const obligatorio = (campo, etiqueta, maximo) => {
    const valor = texto(campo);
    if (valor.length < 2 || valor.length > maximo) {
      throw new Error(`${etiqueta}: escribe entre 2 y ${maximo} caracteres.`);
    }
  };
  const codigo = (campo, etiqueta) => {
    const valor = texto(campo).toUpperCase();
    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(valor) || valor.length < 3 || valor.length > 30) {
      throw new Error(`${etiqueta}: usa entre 3 y 30 letras, números o guiones intermedios.`);
    }
  };

  if (page === 'books') {
    obligatorio('titulo', 'Título', 200);
    obligatorio('autor', 'Autor', 150);
    obligatorio('categoria', 'Categoría', 100);
    if (texto('editorial').length > 150) throw new Error('Editorial: máximo 150 caracteres.');
    if (texto('anio')) {
      const anio = Number(texto('anio'));
      if (!Number.isInteger(anio) || anio < 0 || anio > new Date().getFullYear() + 1) {
        throw new Error('Año de publicación: escribe un año entero válido.');
      }
    }
    if (texto('isbn')) {
      const isbn = texto('isbn').replace(/[\s-]/g, '').toUpperCase();
      if (!/^(?:\d{13}|\d{9}[\dX])$/.test(isbn)) {
        throw new Error('ISBN: debe tener 10 o 13 caracteres válidos (se permiten guiones).');
      }
    }
  }

  if (page === 'copies') {
    if (!esEdicion) {
      if (!texto('libroId')) throw new Error('Selecciona un libro.');
      codigo('codigoInventario', 'Código de inventario');
    }
    if (texto('ubicacion').length > 100) throw new Error('Ubicación: máximo 100 caracteres.');
  }

  if (page === 'readers') {
    if (!esEdicion) codigo('codigoLector', 'Código de lector');
    obligatorio('nombre', 'Nombre del lector', 120);
    const correo = texto('correo');
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      throw new Error('Escribe un correo electrónico válido.');
    }
    const telefono = texto('telefono');
    if (telefono && !/^\d{10}$/.test(telefono)) {
      throw new Error('El teléfono debe contener 10 dígitos.');
    }
  }

  if (page === 'loans') {
    if (!texto('lectorId') || !texto('ejemplarId')) {
      throw new Error('Selecciona un lector activo y un ejemplar disponible.');
    }
    const fecha = texto('fechaVencimiento');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(new Date(fecha).getTime()) ||
        new Date(`${fecha}T23:59:59.999Z`) <= new Date()) {
      throw new Error('Selecciona una fecha de vencimiento futura.');
    }
  }
}

async function saveRecord(event) {
  event.preventDefault();
  const v = varsFromForm();
  const isEdit = !!editingId;
  const saveBtn = $('save-dialog');
  saveBtn.disabled = true;
  try {
    validarFormulario(v, isEdit);
    let query, vars;
    if (page === 'books') {
      const data = { titulo: v.titulo.trim(), autor: v.autor.trim(), categoria: v.categoria.trim(), editorial: nullIfEmpty(v.editorial?.trim()), anio: v.anio ? Number(v.anio) : null, isbn: nullIfEmpty(v.isbn?.trim()) };
      if (isEdit) {
        query = 'mutation($id:ID!,$datos:ActualizarLibroInput!){actualizarLibro(id:$id,datos:$datos){id}}';
        vars = { id: editingId, datos: data };
      } else {
        query = 'mutation($titulo:String!,$autor:String!,$categoria:String!,$editorial:String,$anio:Int,$isbn:String){agregarLibro(titulo:$titulo,autor:$autor,categoria:$categoria,editorial:$editorial,anio:$anio,isbn:$isbn){id}}';
        vars = data;
      }
    } else if (page === 'copies') {
      if (isEdit) {
        query = 'mutation($id:ID!,$datos:ActualizarEjemplarInput!){actualizarEjemplar(id:$id,datos:$datos){id}}';
        vars = { id: editingId, datos: { ubicacion: v.ubicacion?.trim() || '' } };
      } else {
        query = 'mutation($libroId:ID!,$codigoInventario:String!,$ubicacion:String){agregarEjemplar(libroId:$libroId,codigoInventario:$codigoInventario,ubicacion:$ubicacion){id}}';
        vars = { libroId: v.libroId, codigoInventario: v.codigoInventario.trim().toUpperCase(), ubicacion: v.ubicacion?.trim() || '' };
      }
    } else if (page === 'readers') {
      if (isEdit) {
        query = 'mutation($id:ID!,$datos:ActualizarLectorInput!){actualizarLector(id:$id,datos:$datos){id}}';
        vars = { id: editingId, datos: { nombre: v.nombre.trim(), correo: v.correo?.trim() || '', telefono: v.telefono?.trim() || '', activo: v.activo === 'true' } };
      } else {
        query = 'mutation($codigoLector:String!,$nombre:String!,$correo:String,$telefono:String){agregarLector(codigoLector:$codigoLector,nombre:$nombre,correo:$correo,telefono:$telefono){id}}';
        vars = { codigoLector: v.codigoLector.trim().toUpperCase(), nombre: v.nombre.trim(), correo: v.correo?.trim() || '', telefono: v.telefono?.trim() || '' };
      }
    } else if (page === 'loans') {
      query = 'mutation($lectorId:ID!,$ejemplarId:ID!,$fechaVencimiento:String!){registrarPrestamo(lectorId:$lectorId,ejemplarId:$ejemplarId,fechaVencimiento:$fechaVencimiento){id}}';
      vars = { lectorId: v.lectorId, ejemplarId: v.ejemplarId, fechaVencimiento: v.fechaVencimiento };
    }
    const result = await gql(query, vars);
    if (Object.values(result)[0] == null) throw new Error('El registro no existe o no pudo guardarse.');
    closeDialog();
    showToast(isEdit ? 'Registro actualizado correctamente.' : 'Registro guardado en MongoDB Atlas.');
    await load();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    saveBtn.disabled = false;
  }
}

const DELETE_OPERATIONS = {
  books: 'mutation($id:ID!){eliminarLibro(id:$id)}',
  copies: 'mutation($id:ID!){eliminarEjemplar(id:$id)}',
  readers: 'mutation($id:ID!){eliminarLector(id:$id)}'
};
function findRow(id) {
  return ({ books: state.libros, copies: state.ejemplares, readers: state.lectores, loans: state.prestamos })[page]?.find(row => row.id === id);
}
async function tableAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  const row = findRow(id);
  if (!row) return showToast('No se encuentra el registro. Actualiza la tabla.', true);
  if (action === 'edit') return openDialog(row);
  if (action === 'delete') {
    if (!window.confirm('¿Eliminar definitivamente este registro de prueba?')) return;
    try {
      const result = await gql(DELETE_OPERATIONS[page], { id });
      if (!Object.values(result)[0]) throw new Error('El registro no existe o ya fue eliminado.');
      showToast('Registro eliminado correctamente.'); await load();
    } catch (error) { showToast(error.message, true); }
  }
  if (action === 'return') {
    if (!window.confirm('¿Confirmas que el ejemplar fue devuelto físicamente?')) return;
    try {
      await gql('mutation($prestamoId:ID!){registrarDevolucion(prestamoId:$prestamoId){id}}', { prestamoId: id });
      showToast('Devolución registrada. Ejemplar disponible.'); await load();
    } catch (error) { showToast(error.message, true); }
  }
}

function init() {
  const [title, desc, crumb] = labels[page] || labels.dashboard;
  $('page-title').textContent = title;
  $('page-subtitle').textContent = desc;
  $('crumb-current').textContent = crumb;
  $('dashboard').hidden = page !== 'dashboard';
  $('listing').hidden = page === 'dashboard';
  if (page !== 'dashboard') {
    $('list-heading').textContent = ({ books: 'Catálogo de libros', copies: 'Listado de ejemplares', readers: 'Lectores registrados', loans: 'Historial de préstamos' })[page];
    $('list-description').textContent = 'Registros consultados directamente desde MongoDB Atlas';
    $('new-btn').hidden = false;
    $('new-btn').textContent = page === 'loans' ? '＋ Registrar préstamo' : '＋ Nuevo registro';
    $('search').addEventListener('input', renderTable);
    $('table-body').addEventListener('click', tableAction);
    $('new-btn').addEventListener('click', () => openDialog());
  }
  $('refresh-btn').addEventListener('click', load);
  $('record-form').addEventListener('submit', saveRecord);
  $('close-dialog').addEventListener('click', closeDialog);
  $('cancel-dialog').addEventListener('click', closeDialog);
  $('record-dialog').addEventListener('click', (e) => {
    if (e.target === $('record-dialog')) closeDialog();
  });
  load();
}

init();
