const mongoose = require('mongoose');

const libroSchema = new mongoose.Schema({
  titulo: {
    type: String, required: [true, 'El título es obligatorio'],
    trim: true, minlength: [2, 'El título debe tener al menos 2 caracteres'],
    maxlength: [200, 'El título no debe superar los 200 caracteres']
  },
  autor: {
    type: String, required: [true, 'El autor es obligatorio'],
    trim: true, minlength: [2, 'El autor debe tener al menos 2 caracteres'],
    maxlength: [150, 'El autor no debe superar los 150 caracteres']
  },
  categoria: {
    type: String, required: [true, 'La categoría es obligatoria'],
    trim: true, minlength: [2, 'La categoría debe tener al menos 2 caracteres'],
    maxlength: [100, 'La categoría no debe superar los 100 caracteres']
  },
  editorial: {
    type: String, trim: true,
    maxlength: [150, 'La editorial no debe superar los 150 caracteres']
  },
  anio: {
    type: Number, min: [0, 'El año no puede ser negativo'],
    max: [new Date().getFullYear() + 1, 'El año de publicación no puede ser posterior al próximo año'],
    validate: {
      validator: valor => valor == null || Number.isInteger(valor),
      message: 'El año debe ser un número entero'
    }
  },
  isbn: {
    type: String, trim: true, maxlength: [25, 'El ISBN es demasiado largo'],
    validate: {
      validator: valor => {
        if (!valor) return true;
        const limpio = valor.replace(/[\s-]/g, '').toUpperCase();
        return /^(?:\d{13}|\d{9}[\dX])$/.test(limpio);
      },
      message: 'El ISBN debe tener 10 o 13 caracteres válidos (se permiten guiones)'
    }
  }
}, {
  timestamps: true,
  collection: 'libros'
});

module.exports = mongoose.model('Libro', libroSchema);
