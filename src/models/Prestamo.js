const mongoose = require('mongoose');

const prestamoSchema = new mongoose.Schema({
  lector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lector',
    required: true
  },

  ejemplar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ejemplar',
    required: true
  },

  fechaPrestamo: {
    type: Date,
    default: Date.now,
    required: true
  },

  fechaVencimiento: {
    type: Date,
    required: true
  },

  fechaDevolucion: {
    type: Date,
    default: null
  },

  estado: {
    type: String,
    enum: ['ACTIVO', 'DEVUELTO'],
    default: 'ACTIVO',
    required: true
  }
}, {
  timestamps: true,
  collection: 'prestamos'
});

// Impedir dos préstamos activos del mismo ejemplar
prestamoSchema.index(
  { ejemplar: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: 'ACTIVO' }
  }
);

module.exports = mongoose.model('Prestamo', prestamoSchema);