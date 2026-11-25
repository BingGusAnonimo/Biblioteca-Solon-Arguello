const mongoose = require('mongoose');

const lectorSchema = new mongoose.Schema({
  codigoLector: {
    type: String, required: [true, 'El código del lector es obligatorio'],
    unique: true, trim: true, uppercase: true,
    minlength: [3, 'El código debe tener al menos 3 caracteres'],
    maxlength: [30, 'El código no debe superar los 30 caracteres'],
    match: [/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, 'El código solo permite letras, números y guiones intermedios']
  },
  nombre: {
    type: String, required: [true, 'El nombre es obligatorio'],
    trim: true, minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [120, 'El nombre no debe superar los 120 caracteres']
  },
  correo: {
    type: String, trim: true, lowercase: true, default: '',
    maxlength: [254, 'El correo es demasiado largo'],
    validate: {
      validator: valor => !valor || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor),
      message: 'El correo electrónico no tiene un formato válido'
    }
  },
  telefono: {
    type: String, trim: true, default: '',
    validate: {
      validator: valor => !valor || /^\d{10}$/.test(valor),
      message: 'El teléfono debe tener 10 dígitos, sin espacios ni guiones'
    }
  },
  activo: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'lectores'
});

module.exports = mongoose.model('Lector', lectorSchema);
