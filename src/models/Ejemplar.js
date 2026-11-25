
const mongoose = require('mongoose');

const ejemplarSchema = new mongoose.Schema({
  libro: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Libro',
    required: true
  },

  codigoInventario: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },

  estado: {
    type: String,
    enum: ['DISPONIBLE', 'PRESTADO', 'BAJA'],
    default: 'DISPONIBLE',
    required: true
  },

  ubicacion: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'ejemplares'
});

module.exports = mongoose.model('Ejemplar', ejemplarSchema);