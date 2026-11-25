const mongoose = require('mongoose');

const lectorSchema = new mongoose.Schema({
  codigoLector: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },

  nombre: {
    type: String,
    required: true,
    trim: true
  },

  correo: {
    type: String,
    lowercase: true,
    trim: true,
    default: ''
  },

  telefono: {
    type: String,
    trim: true,
    default: ''
  },

  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'lectores'
});

module.exports = mongoose.model('Lector', lectorSchema);