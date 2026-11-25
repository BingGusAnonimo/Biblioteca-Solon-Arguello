'use strict';

// Funciones puras compartidas por la página y las pruebas locales.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ReportesUtil = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  const COLUMNAS = ['etiqueta', 'cantidad', 'auxiliar', 'porcentaje', 'promedio', 'detalle'];
  const MEDIDAS = {
    cantidad: 'Cantidad',
    auxiliar: 'Auxiliar',
    porcentaje: 'Porcentaje',
    promedio: 'Promedio'
  };
  function esCampoGraphQL(campo) {
    return typeof campo === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(campo);
  }
  function esReporteValido(r) {
    return r && /^[ABC](0[1-9]|10)$/.test(r.codigo) && esCampoGraphQL(r.campo) &&
      typeof r.nombre === 'string' && ['LIBROS', 'LECTORES', 'PRESTAMOS'].includes(r.area);
  }
  function queryReporte(campo) {
    if (!esCampoGraphQL(campo)) throw new Error('El campo GraphQL no es válido.');
    return `query VisualizarReporte { ${campo} { ${COLUMNAS.join(' ')} } }`;
  }
  function normalizarFila(fila) {
    return {
      etiqueta: String(fila?.etiqueta ?? 'Sin etiqueta'),
      cantidad: Number.isFinite(Number(fila?.cantidad)) ? Number(fila.cantidad) : 0,
      auxiliar: fila?.auxiliar == null || !Number.isFinite(Number(fila.auxiliar)) ? null : Number(fila.auxiliar),
      porcentaje: fila?.porcentaje == null || !Number.isFinite(Number(fila.porcentaje)) ? null : Number(fila.porcentaje),
      promedio: fila?.promedio == null || !Number.isFinite(Number(fila.promedio)) ? null : Number(fila.promedio),
      detalle: fila?.detalle == null ? null : String(fila.detalle)
    };
  }
  function medidasDisponibles(filas) {
    return Object.keys(MEDIDAS).filter(c => filas.some(f => Number.isFinite(f[c])));
  }
  function formatear(valor, medida = '') {
    if (valor == null || !Number.isFinite(Number(valor))) return '—';
    const str = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(Number(valor));
    return medida === 'porcentaje' ? `${str}%` : str;
  }
  function datosGrafica(filas, medida, maxFilas = 15) {
    if (!MEDIDAS[medida]) throw new Error('Medida desconocida.');
    const disponibles = filas.filter(f => f[medida] != null && Number.isFinite(Number(f[medida]))).slice(0, maxFilas);
    const maximo = medida === 'porcentaje' ? Math.max(100, ...disponibles.map(f => Math.max(0, Number(f[medida])))) :
      Math.max(0, ...disponibles.map(f => Math.max(0, Number(f[medida]))));
    return disponibles.map(f => ({
      etiqueta: f.etiqueta,
      valor: Number(f[medida]),
      porcentajeBarra: maximo > 0 ? Math.min(100, 100 * Math.max(0, Number(f[medida])) / maximo) : 0
    }));
  }
  function protegerCeldaCSV(value) {
    // Evita que Excel interprete texto externo como fórmula.
    let texto = value == null ? '' : String(value);
    if (/^[\s]*[=+\-@]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replace(/"/g, '""')}"`;
  }
  function crearCSV(filas) {
    const encabezados = COLUMNAS.join(',');
    const renglones = filas.map(f => COLUMNAS.map(k => {
      const v = f[k];
      return typeof v === 'number' ? String(v) : protegerCeldaCSV(v);
    }).join(','));
    return '\ufeff' + [encabezados, ...renglones].join('\r\n') + '\r\n';
  }
  return { COLUMNAS, MEDIDAS, esCampoGraphQL, esReporteValido, queryReporte, normalizarFila, medidasDisponibles, formatear, datosGrafica, protegerCeldaCSV, crearCSV };
});
