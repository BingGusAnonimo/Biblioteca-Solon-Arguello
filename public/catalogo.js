'use strict';

const estado = {
  busqueda: '', categoria: '', soloDisponibles: false,
  pagina: 1, porPagina: 9, registros: [], total: 0, paginas: 0
};
let temporizadorBusqueda;
let solicitudActual = 0;

const $ = id => document.getElementById(id);
const escapar = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

async function graphql(query, variables = {}) {
  const respuesta = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store'
  });
  if (!respuesta.ok) throw new Error(`No se pudo consultar el servidor (${respuesta.status})`);
  const json = await respuesta.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error('El servidor no devolvió datos.');
  return json.data;
}

const QUERY_CATALOGO = `
  query ObtenerCatalogo($busqueda:String,$categoria:String,$soloDisponibles:Boolean,$pagina:Int,$porPagina:Int) {
    catalogo(busqueda:$busqueda,categoria:$categoria,soloDisponibles:$soloDisponibles,pagina:$pagina,porPagina:$porPagina) {
      total pagina paginas porPagina
      registros { id titulo autor categoria editorial anio isbn totalEjemplares disponibles prestados bajas }
    }
  }
`;

function setConexion(ok, texto) {
  $('connection-status').classList.toggle('offline', !ok);
  $('connection-status').innerHTML = `<span class="status-dot"></span>${escapar(texto)}`;
}

function tarjeta(libro, indice) {
  const disponible = libro.disponibles > 0;
  const subtitulo = disponible
    ? `${libro.disponibles} ${libro.disponibles === 1 ? 'ejemplar disponible' : 'ejemplares disponibles'}`
    : 'Sin ejemplares disponibles';
  return `<article class="book-card">
    <div class="card-top">
      <div class="mini-cover tone-${(indice + libro.titulo.length) % 6}"><span>${escapar(libro.titulo)}</span><b>SOLÓN ARGÜELLO</b></div>
    </div>
    <div class="card-body">
      <span class="category-chip" title="${escapar(libro.categoria)}">${escapar(libro.categoria)}</span>
      <h4 title="${escapar(libro.titulo)}">${escapar(libro.titulo)}</h4>
      <p class="author">${escapar(libro.autor)}</p>
      <div class="card-foot">
        <span class="stock ${disponible ? 'available' : ''}"><span class="stock-dot"></span>${escapar(subtitulo)}</span>
        <button class="details-btn" type="button" data-id="${escapar(libro.id)}">Ver ficha →</button>
      </div>
    </div>
  </article>`;
}

function renderizar() {
  const grid = $('results-grid');
  $('total-books').textContent = estado.total.toLocaleString('es-MX');
  $('result-description').textContent = estado.total
    ? `Mostrando ${estado.registros.length} títulos en esta página · ${estado.total.toLocaleString('es-MX')} coincidencias`
    : 'No se encontraron libros con los filtros seleccionados.';

  grid.innerHTML = estado.registros.length
    ? estado.registros.map(tarjeta).join('')
    : `<div class="empty-card"><div class="empty-icon">⌕</div><h4>No encontramos resultados</h4><p>Intenta cambiar los filtros o busca otro título o autor.</p></div>`;
  grid.setAttribute('aria-busy', 'false');

  $('pager').hidden = estado.paginas <= 1;
  $('page-label').textContent = `Página ${estado.pagina} de ${estado.paginas}`;
  $('previous-page').disabled = estado.pagina <= 1;
  $('next-page').disabled = estado.pagina >= estado.paginas;
}

async function cargarCatalogo() {
  const solicitud = ++solicitudActual;
  $('results-grid').setAttribute('aria-busy', 'true');
  $('results-grid').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  $('result-description').textContent = 'Consultando el inventario...';
  setConexion(true, 'Consultando Atlas');

  try {
    const datos = await graphql(QUERY_CATALOGO, {
      busqueda: estado.busqueda || null,
      categoria: estado.categoria || null,
      soloDisponibles: estado.soloDisponibles,
      pagina: estado.pagina,
      porPagina: estado.porPagina
    });
    if (solicitud !== solicitudActual) return;
    const pagina = datos.catalogo;
    estado.registros = pagina.registros;
    estado.total = pagina.total;
    estado.paginas = pagina.paginas;
    estado.pagina = pagina.pagina;
    renderizar();
    setConexion(true, 'Conectado a Atlas');
  } catch (error) {
    if (solicitud !== solicitudActual) return;
    $('results-grid').setAttribute('aria-busy', 'false');
    $('results-grid').innerHTML = `<div class="empty-card"><div class="empty-icon">!</div><h4>No pudimos cargar el catálogo</h4><p>${escapar(error.message)}</p><button type="button" id="retry-btn" class="page-btn">Reintentar</button></div>`;
    $('retry-btn').addEventListener('click', cargarCatalogo);
    $('result-description').textContent = 'No se pudo completar la consulta.';
    $('pager').hidden = true;
    setConexion(false, 'Sin conexión');
  }
}

async function cargarCategorias() {
  try {
    const datos = await graphql('query { categoriasCatalogo }');
    for (const categoria of datos.categoriasCatalogo) {
      const opcion = document.createElement('option');
      opcion.value = categoria;
      opcion.textContent = categoria;
      $('category-select').append(opcion);
    }
  } catch (error) {
    // La búsqueda por texto seguirá funcionando aunque falle el listado de categorías.
    console.warn('No se pudieron cargar las categorías:', error.message);
  }
}

function abrirFicha(id) {
  const libro = estado.registros.find(x => x.id === id);
  if (!libro) return;
  const campos = [
    ['Autor', libro.autor],
    ['Categoría', libro.categoria],
    ['Editorial', libro.editorial || 'No registrada'],
    ['Año de publicación', libro.anio || 'No registrado'],
    ['ISBN', libro.isbn || 'No registrado'],
    ['Ejemplares físicos', libro.totalEjemplares],
    ['Disponibles', libro.disponibles],
    ['Prestados', libro.prestados],
    ['Dados de baja', libro.bajas]
  ];
  $('book-detail').innerHTML = `<div class="detail-content">
    <span class="category-chip">${escapar(libro.categoria)}</span>
    <h3>${escapar(libro.titulo)}</h3>
    <p>Información bibliográfica y disponibilidad de ejemplares</p>
    <div class="detail-grid">${campos.map(([n,v]) => `<div><small>${escapar(n)}</small><strong>${escapar(v)}</strong></div>`).join('')}</div>
    <p class="detail-note">Este sistema es un prototipo académico. Los datos de prueba no constituyen una confirmación oficial de disponibilidad.</p>
  </div>`;
  $('book-dialog').showModal();
}

function aplicarFiltros() {
  estado.busqueda = $('search-input').value.trim();
  estado.categoria = $('category-select').value;
  estado.soloDisponibles = $('only-available').checked;
  estado.pagina = 1;
  cargarCatalogo();
}

function iniciar() {
  $('search-form').addEventListener('submit', evento => {
    evento.preventDefault();
    clearTimeout(temporizadorBusqueda);
    aplicarFiltros();
  });
  $('search-input').addEventListener('input', () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(aplicarFiltros, 350);
  });
  $('category-select').addEventListener('change', aplicarFiltros);
  $('only-available').addEventListener('change', aplicarFiltros);
  $('clear-filters').addEventListener('click', () => {
    $('search-form').reset();
    aplicarFiltros();
  });
  $('previous-page').addEventListener('click', () => {
    if (estado.pagina > 1) { estado.pagina--; cargarCatalogo(); }
  });
  $('next-page').addEventListener('click', () => {
    if (estado.pagina < estado.paginas) { estado.pagina++; cargarCatalogo(); }
  });
  $('results-grid').addEventListener('click', evento => {
    const boton = evento.target.closest('[data-id]');
    if (boton) abrirFicha(boton.dataset.id);
  });
  $('close-dialog').addEventListener('click', () => $('book-dialog').close());
  $('book-dialog').addEventListener('click', evento => {
    if (evento.target === $('book-dialog')) $('book-dialog').close();
  });
  cargarCategorias();
  cargarCatalogo();
}

iniciar();
