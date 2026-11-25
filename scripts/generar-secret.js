'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('No existe .env en la raíz. Configura primero MongoDB Atlas.');
  process.exit(1);
}
const original = fs.readFileSync(envPath, 'utf8');
if (/^SESSION_SECRET\s*=/m.test(original)) {
  console.log('SESSION_SECRET ya existe en .env. No se modificó.');
} else {
  const secret = crypto.randomBytes(48).toString('hex');
  const fin = original.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(envPath, `${fin}SESSION_SECRET=${secret}\n`);
  console.log('SESSION_SECRET generado y guardado localmente en .env. No se muestra por seguridad.');
}
