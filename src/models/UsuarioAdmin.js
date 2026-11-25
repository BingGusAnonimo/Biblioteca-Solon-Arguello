'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9._-]{3,40}$/ },
  passwordHash: { type: String, required: true, select: false },
  rol: { type: String, enum: ['ADMIN'], default: 'ADMIN' },
  activo: { type: Boolean, default: true }
}, { timestamps: true, collection: 'usuarios_admin' });

module.exports = mongoose.model('UsuarioAdmin', schema);
