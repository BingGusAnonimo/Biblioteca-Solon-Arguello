const mongoose = require('mongoose');

const ejemplarSchema = new mongoose.Schema({
  libro: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Libro', required: [true, 'Debes seleccionar un libro']
  },
  codigoInventario: {
    type: String, required: [true, 'El código de inventario es obligatorio'],
    unique: true, trim: true, uppercase: true,
    minlength: [3, 'El código debe tener al menos 3 caracteres'],
    maxlength: [30, 'El código no debe superar los 30 caracteres'],
    match: [/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, 'El código solo puede contener letras, números y guiones intermedios']
  },
  estado: {
    type: String, enum: ['DISPONIBLE', 'PRESTADO', 'BAJA'],
    required: true, default: 'DISPONIBLE'
  },
  ubicacion: {
    type: String, trim: true,
    maxlength: [100, 'La ubicación no debe superar los 100 caracteres']
  }
}, {
  timestamps: true,
  collection: 'ejemplares'
});

module.exports = mongoose.model('Ejemplar', ejemplarSchema);
