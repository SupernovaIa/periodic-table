# CLAUDE.md

Guía para trabajar en este proyecto. Complementa las instrucciones globales del usuario.

## Qué es

Tabla periódica interactiva: web estática, sin build ni dependencias. Se abre
directamente en el navegador (`open index.html`) y se publica con GitHub Pages.

## Estructura

| Archivo       | Responsabilidad                                             |
|---------------|------------------------------------------------------------|
| `index.html`      | Estructura y contenedores (tabla, panel, selector idioma).           |
| `styles.css`      | Estilos, tema oscuro y tokens de color por categoría.                |
| `data.js`         | Datos de los 118 elementos + textos de UI (fuente única).            |
| `particles.js`    | Modelo Estándar: 17 partículas + categorías + textos de la vista.    |
| `images.js`       | Mapa nº atómico → foto (`images/…`) + crédito de licencia.           |
| `app.js`          | Render de la tabla, filtros, panel, i18n y modelo de Bohr.           |
| `images/`         | Fotos de elementos (redimensionadas, de Wikimedia Commons).          |
| `ATTRIBUTIONS.md` | Atribución/licencia de cada foto (obligatorio por CC-BY).            |

## Convenciones

- **Código en inglés**: nombres de variables, funciones, comentarios y mensajes.
- **Idiomas del contenido (i18n)**: la web es bilingüe **EN/ES**, con inglés por
  defecto. Todo texto visible vive en `data.js`:
  - Campos bilingües como objeto `{ en, es }` (p. ej. `name`, `about`, categorías).
  - Cadenas de interfaz en `UI.en` / `UI.es`.
  - `disc` (descubridor) es texto plano si el nombre es igual en ambos idiomas, u
    objeto `{ en, es }` si difiere.
  - El helper `t(campo)` en `app.js` resuelve el idioma activo.
  - **Nunca** dejes texto de cara al usuario incrustado en HTML/JS: añádelo a `data.js`.
- **Añadir un idioma**: crear la clave en `UI`, añadirla en cada campo bilingüe y
  sumar un botón en el selector `#lang` de `index.html`.
- **CSS**: usa las variables de `:root` (colores, tema). Los colores por categoría
  son `--c-<categoria>`.
- **Sin dependencias ni paso de build**: mantenerlo en HTML/CSS/JS plano.
- **Ficha del elemento**: en pantallas anchas (≥900px), el **hueco central** de la tabla
  muestra la **imagen/orbitales en grande** (`renderCentralMedia`, con conmutador
  Photo/Atom) y la **ficha completa** va en el **desplegable lateral** (`renderDrawer`
  con `media:false, overlay:false`, sin oscurecer para que ambos se vean). En pantallas
  estrechas todo va al desplegable con imagen y overlay (`renderDrawer` por defecto).
  La imagen central usa `object-fit:contain` en caja absoluta para no recortarse.
- **Imágenes de elementos**: el panel muestra la **foto** (`IMAGES[nº]` en `images.js`)
  con un conmutador al **modelo de Bohr**; si un elemento no tiene foto, se muestra
  solo el diagrama. El modelo de Bohr se **genera** desde el número atómico
  (`electronShells` / `bohrSVG` en `app.js`), no son assets.
- **Licencias**: toda foto nueva debe llevar su entrada en `ATTRIBUTIONS.md` y un
  crédito corto en `images.js`. Redimensiona a ~520px para no inflar el repo.
- **Dos vistas**: conmutador `#view` (Elements / Particles). La vista de partículas
  muestra el Modelo Estándar (`particles.js`) reutilizando la misma maquinaria
  (dim, ficha central, panel lateral, i18n, cierre). Título/subtítulo/pie cambian
  por vista en `updateHeader()`. Ojo: usa `[hidden]{display:none!important}` porque
  `.periodic-table`/`.particle-table`/`.legend` fijan `display` y taparían `hidden`.

## Verificación

Antes de dar por terminado un cambio visual, **comprueba en el navegador con una
captura** (Chrome headless o Playwright), no solo revisando el código. Revisa los
dos idiomas y el panel de detalle abierto.

## Git

- Commits en inglés siguiendo Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`…).
- Sin atribución de IA en mensajes de commit ni en PRs.
- No hacer commit ni push sin que el usuario lo pida.
