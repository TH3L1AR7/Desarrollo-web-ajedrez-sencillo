document.addEventListener("DOMContentLoaded", () => {
    const tablero = document.querySelector('.tablero');
    const contenedor = document.querySelector('.tablero-con-laterales');

    const columnas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const filas = [8, 7, 6, 5, 4, 3, 2, 1];

    const piezasIniciales = {
        'a1': '♖', 'b1': '♘', 'c1': '♗', 'd1': '♕', 'e1': '♔', 'f1': '♗', 'g1': '♘', 'h1': '♖',
        'a2': '♙', 'b2': '♙', 'c2': '♙', 'd2': '♙', 'e2': '♙', 'f2': '♙', 'g2': '♙', 'h2': '♙',
        'a7': '♟', 'b7': '♟', 'c7': '♟', 'd7': '♟', 'e7': '♟', 'f7': '♟', 'g7': '♟', 'h7': '♟',
        'a8': '♜', 'b8': '♞', 'c8': '♝', 'd8': '♛', 'e8': '♚', 'f8': '♝', 'g8': '♞', 'h8': '♜',
    };

    const piezasBlancas = ['♙', '♖', '♗', '♘', '♕', '♔'];
    const piezasNegras = ['♟', '♜', '♝', '♞', '♛', '♚'];

    // Limpiar contenido anterior si lo hay
    tablero.innerHTML = '';

    for (let i = 0; i < filas.length; i++) {
        for (let j = 0; j < columnas.length; j++) {
            const fila = filas[i];
            const col = columnas[j];
            const id = `${col}${fila}`;

            const casilla = document.createElement('div');
            casilla.id = id;

            // Alternar color
            const colorClass = (i + j) % 2 === 0 ? 'blanca' : 'negra';
            casilla.classList.add(colorClass);

            // Coordenadas para lógica
            casilla.dataset.fila = i;
            casilla.dataset.columna = j;

            // Agregar pieza si corresponde
            if (piezasIniciales[id]) {
                const span = document.createElement('span');
                const pieza = piezasIniciales[id];
                span.textContent = pieza;

                if (piezasBlancas.includes(pieza)) {
                    span.classList.add('pieza-blanca');
                } else {
                    span.classList.add('pieza-negra');
                }

                casilla.appendChild(span);
            }

            tablero.appendChild(casilla);
        }
    }



});
