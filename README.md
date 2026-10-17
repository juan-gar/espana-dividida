# España partida en dos — lector web

Lector web estático de la introducción y los capítulos 1–4 de *España partida en dos* (Julián Casanova), generado a partir de los PDF escaneados mediante OCR (Tesseract, español).

- `index.html` — la aplicación (sin dependencias ni paso de compilación).
- `assets/book.js` — el texto, estructurado por capítulos y apartados.
- `assets/app.js`, `assets/style.css` — lógica y estilos: índice lateral, búsqueda en el texto, tema claro/sepia/oscuro, tamaño de letra, barra de progreso y recuerdo del último capítulo leído.

La última página de los capítulos 1–4 está borrosa en los PDF originales y no se ha podido transcribir.

## Publicación

Se sirve con GitHub Pages directamente desde la raíz de la rama (Settings → Pages → *Deploy from a branch*). Para verlo en local: `python3 -m http.server` y abrir `http://localhost:8000`.
