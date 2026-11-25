'use strict';
require('dotenv').config();

const readline = require('node:readline/promises');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UsuarioAdmin = require('../src/models/UsuarioAdmin');

async function pedirContrasena(etiqueta) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Abre una terminal interactiva de VS Code para ingresar la contraseña de forma oculta.');
  }
  process.stdout.write(`${etiqueta}: `);
  return new Promise((resolve, reject) => {
    let texto = '';
    const estabaRaw = process.stdin.isRaw || false;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    function limpiar() {
      process.stdin.off('data', recibir);
      process.stdin.setRawMode(estabaRaw);
      process.stdin.pause();
    }
    function recibir(buffer) {
      const s = buffer.toString('utf8');
      for (const caracter of s) {
        if (caracter === '\u0003') {
          limpiar(); process.stdout.write('\n'); reject(new Error('Operación cancelada')); return;
        }
        if (caracter === '\r' || caracter === '\n') {
          limpiar(); process.stdout.write('\n'); resolve(texto); return;
        }
        if (caracter === '\u007f' || caracter === '\b') {
          texto = texto.slice(0, -1);
        } else if (caracter >= ' ' && texto.length < 256) {
          texto += caracter;
        }
      }
    }
    process.stdin.on('data', recibir);
  });
}

async function ejecutar() {
  if (!process.stdin.isTTY) throw new Error('Ejecuta este script en la terminal integrada de VS Code.');
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en .env');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const usuario = (await rl.question('Nombre de usuario administrador (ej. bibliotecario): ')).trim().toLowerCase();
  rl.close();
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) throw new Error('El usuario debe tener 3-40 letras minúsculas, números, puntos, guiones o guion bajo.');

  const contrasena = await pedirContrasena('Contraseña (mínimo 12 caracteres)');
  const repetir = await pedirContrasena('Repetir contraseña');
  if (contrasena.length < 12 || contrasena.length > 128) throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  if (contrasena !== repetir) throw new Error('Las contraseñas no coinciden.');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await UsuarioAdmin.init();
  if (await UsuarioAdmin.exists({ usuario })) throw new Error('Ese usuario ya existe. No se modificó ninguna contraseña.');
  const hash = await bcrypt.hash(contrasena, 12);
  await UsuarioAdmin.create({ usuario, passwordHash: hash, rol: 'ADMIN', activo: true });
  console.log(`Usuario administrativo "${usuario}" creado. La contraseña se almacenó como hash.`);
}

ejecutar().catch(e => { console.error('Error:', e.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
