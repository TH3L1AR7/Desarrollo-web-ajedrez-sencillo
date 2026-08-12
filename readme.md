¡Hola!

Bienvenido a las instrucciones de ejecución para la entrega 2 correspondiente al grupo 21, compuesto por Dylan Barahona y Benjamín Casanova.

1) Para poder encontrar la ruta del proyecto, debe inicializar la maquina virtual ubuntu y ejecutar los siguientes comandos.
- cd /
- cd entrega2/
2) Al ejecutar los comandos correctamente entrara a la carpeta raíz del proyecto, aquí puede visualizar con ls, los archivos disponibles, puede observar que se encuentran los archivos .json correspondientes a los linters
HTML:config.htmlhintrc
CSS:.stylelintrc.json
JS:eslint.config.mjs

Puede ejecutar los linters si así lo desea para observar que no detecta ninguna clase de error, para ejecutar el linter del JS utilice el siguiente comando,
npx eslint . --ext .js

No se imprimirá nada en pantalla pues ya se han corregido los errore y linteado.

Para ejecutar el linter del css utiice el siguiente comando:
npx stylelint "public/css/**/*.css"

No se imprimira nada en pantaa pues ya se han corregido los errores y linteado.

Para el del html es:
htmlhint ./views/*.html
Si no funciona pruebe con este otro
npx htmlhint ./views/*.html

Luego para poder ejecutar la página web, escriba sudo node app.js, con eso se deberia desplegar una información diciendo servidor ejecutandose en localhost:80,
luego simplemente utilice la ip de cada integrante del grupo.

Dylan Barahona: 54.156.92.200
Benjamín Casanova: 13.219.35.108

