# Consulta farmacológica - app sin conexión

Esta carpeta contiene una app web instalable para consultar el PDF de monografías pediátricas desde el teléfono. El PDF no está incluido: se importa una vez desde el propio teléfono y queda guardado allí.

## Para ponerla en el teléfono

1. Publica el contenido de esta carpeta en una dirección privada con HTTPS.
2. Abre esa dirección desde Safari (iPhone) o Chrome (Android).
3. Instálala desde el menú del navegador: **Compartir > Añadir a pantalla de inicio** en iPhone, o **Instalar aplicación** en Android.
4. En el primer inicio, pulsa **Elegir mi PDF** e importa `Pediatric drug monographs from Micromedex - 2026.pdf`.
5. Espera a que se guarde y busca un medicamento, por ejemplo `cefepime`.

Tras la instalación y la primera importación, la búsqueda y el PDF funcionan sin internet. Si borras los datos del navegador o desinstalas la app, tendrás que importar el PDF otra vez.

## Qué incluye

- Índice local de 1.014 monografías con sus páginas originales.
- Búsqueda sin distinción de mayúsculas, acentos o minúsculas.
- Apertura directa de la página correspondiente del PDF.
- Sin consultas a internet ni envío del PDF a terceros.

## Nota clínica

La app es una herramienta de navegación del documento. Revisa siempre la página original, el contexto clínico y la versión vigente de la fuente antes de tomar decisiones de dosis.


## Cambio importante del visor

La versión actual ya no intenta mostrar el PDF dentro de un `<iframe>`, porque ese método depende del visor PDF incorporado de Android. En su lugar, usa PDF.js como **motor local de renderizado**: el PDF importado se lee desde el almacenamiento local del teléfono y la página seleccionada se dibuja directamente dentro de la app.

PDF.js se precarga y queda en caché de la aplicación durante la primera apertura con conexión. Después, la visualización del PDF no necesita internet. El contenido farmacológico sigue procediendo exclusivamente del PDF que tú importaste.
