
const mongoose = require('mongoose');

const libroSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },

  autor: {
    type: String,
    required: true,
    trim: true
  },

  categoria: {
    type: String,
    required: true,
    trim: true
  },

  editorial: {
    type: String,
    trim: true
  },

  anio: {
    type: Number,
    min: 0
  },

  isbn: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'libros'
});

module.exports = mongoose.model('Libro', libroSchema);
