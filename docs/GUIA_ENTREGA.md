# Guía de entrega — Biblioteca Solón Argüello

## Orden de cierre recomendado

1. **Comprobar el estado de Git y los secretos.**
2. **Instalar README** en la raíz del proyecto y estas guías dentro de `docs/`.
3. **Ejecutar las pruebas** y guardar capturas.
4. **Verificar permisos** usando una ventana de incógnito, sin sesión.
5. **Revisar el repositorio remoto** y publicar solo si es seguro.
6. **Reunir evidencias** y preparar la exposición de 3 integrantes.

## 1. Comprobación previa de Git (PowerShell)

Desde la raíz del proyecto:

```powershell
git status
git remote -v
git branch --show-current
git check-ignore -v .env
git ls-files .env
git ls-files node_modules
```

**Interpretación:**
- `git check-ignore -v .env`: debería indicar la regla del `.gitignore`.
- `git ls-files .env`: **no debe imprimir nada**. Si imprime `.env`, el archivo está rastreado y es necesario retirarlo del índice y rotar las claves si se publicaron.
- `git ls-files node_modules`: no debe enumerar miles de dependencias.
- `git remote -v`: permite ver si hay una URL de GitHub configurada. **No compartas URLs con tokens embebidos.**

Si `.env` aparece rastreado:

```powershell
git rm --cached .env
```

Después, revisa el historial del repositorio para saber si hubo credenciales publicadas. **Quitar un archivo en un commit nuevo no borra los secretos del historial.** Rotar la contraseña de Atlas y cualquier otro secreto expuesto.

## 2. Pruebas y evidencias

```powershell
node --test
node scripts/auditar.js
node scripts/ejecutar-reportes.js --todos
npm start
```

No afirmar que todas las pruebas pasaron sin revisar su salida completa. Si alguna falla, guardar el error para corregirlo.

## 3. Comprobar seguridad en incógnito

1. Entrar a `http://localhost:4000/catalogo.html`: debe funcionar.
2. Entrar a `http://localhost:4000/admin.html`: debe redirigir al login.
3. Abrir `http://localhost:4000/graphql` y ejecutar sin sesión:

```graphql
query {
  lectores {
    id
  }
}
```

Debe devolver un error de autorización, no la lista privada.

4. Iniciar sesión normalmente y verificar CRUD, préstamos, reportes.
5. Cerrar sesión y confirmar que el panel vuelve a solicitar acceso.

Las comprobaciones anteriores son funcionales y no reemplazan una auditoría integral de seguridad.

## 4. Guardar cambios sin incluir secretos

```powershell
git status
git add README.md docs/GUIA_ENTREGA.md docs/EVIDENCIAS.md
git diff --cached --name-only
git diff --cached --stat
git commit -m "docs: agregar README y guia de entrega"
```

**No usar `git add .` a ciegas** si hay archivos inesperados; revisa antes.

## 5. Publicar en GitHub

Si `git remote -v` ya muestra `origin` y tienes confirmado el nombre de tu rama:

```powershell
git push -u origin HEAD
```

Si no existe remoto, primero se debe crear el repositorio en GitHub y asociar la URL correspondiente; no inventar el `owner/repo` ni sobrescribir remotos.

Antes de hacerlo público:
- Confirmar que nunca se hayan subido claves; si ocurrió, rotarlas.
- Confirmar que `.env` no esté rastreado en ninguna rama.
- Revisar archivos comprimidos, exportaciones, respaldos y capturas.
- Evitar datos reales de lectores.
- Verificar si la maestra pidió repositorio público o privado.

## 6. Contenido mínimo para entregar

- URL del repositorio GitHub.
- Archivo README actualizado.
- Investigación MongoDB vs. Neo4j.
- 30 consultas documentadas con evidencia de sus resultados.
- Evidencias de los tres CRUD, préstamos/devoluciones, catálogo y panel.
- Verificación de los 4,000 documentos DEMO y la auditoría.
- Video o demostración exigida por la maestra.
- Confirmación de la visita o autorización institucional, **si aplica según la rúbrica y si está documentada**.

## 7. Precisión para la exposición

Decir: «Se generaron datos ficticios para una demostración académica y se comprobó la consistencia con 12 reglas».
No decir: «Esta es la base real de la Biblioteca Solón Argüello» ni atribuir resultados de uso real a datos simulados.
No decir: «MongoDB es más rápido que Neo4j» sin una prueba de rendimiento equivalente y documentada.
