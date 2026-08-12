document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const urlParams = new URLSearchParams(window.location.search);
    const partidaId = urlParams.get('partidaId');
    if (!partidaId) {
        alert("No se encontró el ID de la partida. Redirigiendo al inicio.");
        window.location.href = "/principal";
        return;
    }

    const historialLista = document.getElementById('historial-lista');
    const turnoTexto = document.getElementById('tu-turno');
    const botonRendirse = document.getElementById('rendirse');
    const botonRendirse2 = document.getElementById('rendirse2');
    const botonNuevaPartida = document.getElementById('nueva-partida');
    const capturasBlancas = document.getElementById('capturas-blancas');
    const capturasNegras = document.getElementById('capturas-negras');

    // --- Estado local
    let turno = 'blanco';  // SIEMPRE inicia el blanco
    let colorInicial = 'blancas';
    let historialMovimientos = [];
    let miColor = null;
    let puedeMover = false;
    let partidaFinalizada = false;
    let ultimoMovimientoGuardado = 0; // Para el polling

    const columnas = ['a','b','c','d','e','f','g','h'];
    const filas = [8,7,6,5,4,3,2,1];
    const piezasBlancasUnicode = ['♙','♖','♗','♘','♕','♔'];
    const piezasNegrasUnicode = ['♟','♜','♝','♞','♛','♚'];

    function obtenerClaseColor(piezaUnicode) {
        if (piezasBlancasUnicode.includes(piezaUnicode)) return 'pieza-blanca';
        if (piezasNegrasUnicode.includes(piezaUnicode)) return 'pieza-negra';
        return '';
    }

    // Cargar estado de la partida desde el backend al cargar la página
    fetch(`/api/partida-estado/${partidaId}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.movimientos.length > 0) {
          restaurarTablero();
          limpiarCapturas();
          historialMovimientos = [];
          turno = 'blanco';
          for (const movimiento of data.movimientos) {
            aplicarMovimientoRemoto(movimiento, false);
          }
          ultimoMovimientoGuardado = data.movimientos.length;
          actualizarTurno();
          actualizarHistorial();
        }
        // Después de cargar el estado, inicializamos el tablero y el resto
        inicializarTablero();
        actualizarTurno();
      })
      .catch(() => {
        // Si falla la carga (por ej. nueva partida), igual inicializamos
        inicializarTablero();
        actualizarTurno();
      });

    // --- Socket.IO lógica
    socket.emit("unirse-partida", partidaId);

    socket.on("asignar-color", (color) => {
        miColor = color;
        // Solo mueve el blanco al inicio
        puedeMover = (miColor === 'blanco' && turno === 'blanco');
        actualizarTurno();
        if (miColor === "espectador") {
            alert("La sala está llena, eres espectador.");
        }
    });

    // Recibe quién tiene el color inicial
    socket.on("color-inicial", (colorCreador) => {
        // colorCreador es 'blancas' o 'negras'
        colorInicial = colorCreador;
        turno = 'blanco'; // Siempre inicia blanco
        puedeMover = (miColor === 'blanco' && turno === 'blanco');
        actualizarTurno();
    });

    socket.on("mover", (movimiento) => {
        aplicarMovimientoRemoto(movimiento);
    });

    socket.on('oponente-conectado', () => {
        alert('¡Tu oponente se ha unido! Puedes comenzar a jugar.');
    });

    socket.on('fin-partida', ({ motivo, ganador }) => {
        partidaFinalizada = true;
        puedeMover = false;
        let msg = "La partida terminó.";
        if (motivo === 'rendicion') {
            msg = (ganador === 'jugador1' || ganador === 'blanco')
                ? "¡Blancas ganan por rendición!"
                : (ganador === 'jugador2' || ganador === 'negro')
                ? "¡Negras ganan por rendición!"
                : "¡Empate!";
        }
        alert(msg);
        actualizarTurno();
    });

    socket.on('reiniciar-partida', () => {
        restaurarTablero();
        historialMovimientos = [];
        turno = 'blanco';
        partidaFinalizada = false;
        puedeMover = (miColor === 'blanco' && turno === 'blanco');
        limpiarCapturas();
        actualizarTurno();
        actualizarHistorial();
        ultimoMovimientoGuardado = 0;
    });

    setInterval(async () => {
        try {
            const res = await fetch(`/api/partida-estado/${partidaId}`);
            const data = await res.json();
            if (data.ok) {
                if (data.movimientos.length !== ultimoMovimientoGuardado) {
                    restaurarTablero();
                    limpiarCapturas();
                    historialMovimientos = [];
                    turno = 'blanco';
                    for (const movimiento of data.movimientos) {
                        aplicarMovimientoRemoto(movimiento, false); 
                    }
                    ultimoMovimientoGuardado = data.movimientos.length;
                }
                if (data.resultado !== 'en_curso') {
                    partidaFinalizada = true;
                    puedeMover = false;
                    actualizarTurno();
                }
            }
        } catch (e) {}
    }, 5000);

    // --- Drag and drop para todas las casillas
    function inicializarTablero() {
        document.querySelectorAll('.tablero div').forEach(casilla => {
            const id = casilla.id;
            const col = columnas.indexOf(id[0]);
            const fila = filas.indexOf(parseInt(id[1]));
            casilla.dataset.columna = col;
            casilla.dataset.fila = fila;

            casilla.setAttribute('draggable', true);

            casilla.addEventListener('dragstart', (e) => {
                if (!puedeMover || partidaFinalizada) return e.preventDefault();
                const piezaElement = casilla.querySelector('span');
                if (!piezaElement || !piezaElement.textContent.trim()) return e.preventDefault();
                const pieza = piezaElement.textContent.trim();
                if (!esPiezaDelTurno(pieza)) return e.preventDefault();
                e.dataTransfer.setData('text/plain', casilla.id);
            });

            casilla.addEventListener('dragover', (e) => e.preventDefault());

            casilla.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!puedeMover || partidaFinalizada) return;

                const origenId = e.dataTransfer.getData('text/plain');
                const origen = document.getElementById(origenId);
                const destino = casilla;

                const piezaElementOrigen = origen.querySelector('span');
                if (!piezaElementOrigen) return;
                const pieza = piezaElementOrigen.textContent.trim();

                if (esMovimientoValido(origen, destino, pieza)) {
                    moverPieza(origen, destino);
                    guardarMovimiento(origen, destino, pieza);

                    turno = (turno === 'blanco') ? 'negro' : 'blanco';
                    puedeMover = false;
                    actualizarTurno();

                    socket.emit("mover", {
                        partidaId,
                        movimiento: {
                            origenId: origen.id,
                            destinoId: destino.id,
                            pieza,
                            turnoRemoto: turno
                        }
                    });
                }
            });
        });
    }

    // --- Lógica de botones
    if (botonRendirse) {
        botonRendirse.onclick = rendirse;
    }
    if (botonRendirse2) {
        botonRendirse2.onclick = rendirse;
    }
    if (botonNuevaPartida) {
        botonNuevaPartida.onclick = () => {
            if (confirm('¿Comenzar una nueva partida? Se reiniciará el tablero.')) {
                socket.emit("nueva-partida", partidaId);
            }
        };
    }

    function rendirse() {
        if (partidaFinalizada) return;
        if (confirm('¿Estás seguro de que quieres rendirte?')) {
            socket.emit("rendirse", { partidaId, jugador: miColor });
        }
    }

    function limpiarCapturas() {
        if (capturasBlancas) capturasBlancas.querySelectorAll('span.pieza-capturada').forEach(e=>e.remove());
        if (capturasNegras) capturasNegras.querySelectorAll('span.pieza-capturada').forEach(e=>e.remove());
    }

    function esPiezaDelTurno(pieza) {
        return (turno === 'blanco' && piezasBlancasUnicode.includes(pieza)) ||
               (turno === 'negro' && piezasNegrasUnicode.includes(pieza));
    }

    function actualizarTurno() {
        if (turnoTexto) {
            if (partidaFinalizada) {
                turnoTexto.textContent = `Partida finalizada`;
            } else {
                turnoTexto.textContent = `Turno de: ${turno}`;
            }
        }
    }

    function moverPieza(origen, destino) {
        const piezaElementOrigen = origen.querySelector('span');
        const piezaElementDestino = destino.querySelector('span');
        if (piezaElementDestino) {
            agregarPiezaCapturada(piezaElementDestino.textContent.trim(), turno);
            destino.removeChild(piezaElementDestino);
        }
        destino.appendChild(piezaElementOrigen);
    }

    function agregarPiezaCapturada(pieza, turnoActual) {
        const contenedor = turnoActual === 'blanco'
            ? capturasNegras
            : capturasBlancas;
        const span = document.createElement('span');
        span.className = 'pieza-capturada';
        span.textContent = pieza;
        span.classList.add(obtenerClaseColor(pieza));
        contenedor.appendChild(span);
    }

    function guardarMovimiento(origen, destino, pieza) {
        const movimiento = `${pieza} ${origen.id} → ${destino.id}`;
        historialMovimientos.push(movimiento);
        actualizarHistorial();
        ultimoMovimientoGuardado = historialMovimientos.length;
    }

    function actualizarHistorial() {
        historialLista.innerHTML = '';
        historialMovimientos.forEach(mov => {
            const li = document.createElement('li');
            li.textContent = mov;
            historialLista.appendChild(li);
        });
    }

    function restaurarTablero() {
        const piezasIniciales = {
            'a1': '♖', 'b1': '♘', 'c1': '♗', 'd1': '♕', 'e1': '♔', 'f1': '♗', 'g1': '♘', 'h1': '♖',
            'a2': '♙', 'b2': '♙', 'c2': '♙', 'd2': '♙', 'e2': '♙', 'f2': '♙', 'g2': '♙', 'h2': '♙',
            'a7': '♟', 'b7': '♟', 'c7': '♟', 'd7': '♟', 'e7': '♟', 'f7': '♟', 'g7': '♟', 'h7': '♟',
            'a8': '♜', 'b8': '♞', 'c8': '♝', 'd8': '♛', 'e8': '♚', 'f8': '♝', 'g8': '♞', 'h8': '♜'
        };
        document.querySelectorAll('.tablero div').forEach(casilla => {
            const casillaId = casilla.id;
            casilla.innerHTML = '';
            if (piezasIniciales[casillaId]) {
                const piezaUnicode = piezasIniciales[casillaId];
                const spanPieza = document.createElement('span');
                spanPieza.textContent = piezaUnicode;
                spanPieza.classList.add(obtenerClaseColor(piezaUnicode));
                casilla.appendChild(spanPieza);
            }
        });
        limpiarCapturas();
        actualizarHistorial();
    }

    function aplicarMovimientoRemoto(movimiento, socketEvent = true) {
        const { origenId, destinoId, pieza, turnoRemoto } = movimiento;
        const origen = document.getElementById(origenId);
        const destino = document.getElementById(destinoId);
        moverPieza(origen, destino);
        guardarMovimiento(origen, destino, pieza);
        turno = turnoRemoto;
        puedeMover = (miColor === turno && !partidaFinalizada);
        actualizarTurno();
        if (socketEvent) {
            ultimoMovimientoGuardado = historialMovimientos.length;
        }
    }

    // --- Reglas de movimiento 
    function esMovimientoValido(origen, destino, pieza) {
        const oFila = parseInt(origen.dataset.fila);
        const oCol = parseInt(origen.dataset.columna);
        const dFila = parseInt(destino.dataset.fila);
        const dCol = parseInt(destino.dataset.columna);
        const deltaFila = dFila - oFila;
        const deltaCol = dCol - oCol;

        const destinoContenidoElement = destino.querySelector('span');
        const destinoContenido = destinoContenidoElement ? destinoContenidoElement.textContent.trim() : '';
        const destinoVacio = destinoContenido === '';

        const esPiezaBlanca = piezasBlancasUnicode.includes(pieza);
        const esPiezaNegra = piezasNegrasUnicode.includes(pieza);

        if (
            (!destinoVacio && esPiezaBlanca && piezasBlancasUnicode.includes(destinoContenido)) ||
            (!destinoVacio && esPiezaNegra && piezasNegrasUnicode.includes(destinoContenido))
        ) {
            return false;
        }

        switch (pieza) {
            case '♙':
                if (deltaCol === 0) {
                    if (deltaFila === -1 && destinoVacio) return true;
                    if (oFila === 6 && deltaFila === -2) {
                        const casillaIntermedia = document.querySelector(`[data-fila="${oFila - 1}"][data-columna="${oCol}"]`);
                        return destinoVacio && (!casillaIntermedia || casillaIntermedia.textContent.trim() === '');
                    }
                }
                if (Math.abs(deltaCol) === 1 && deltaFila === -1 && !destinoVacio && piezasNegrasUnicode.includes(destinoContenido)) {
                    return true;
                }
                return false;
            case '♟':
                if (deltaCol === 0) {
                    if (deltaFila === 1 && destinoVacio) return true;
                    if (oFila === 1 && deltaFila === 2) {
                        const casillaIntermedia = document.querySelector(`[data-fila="${oFila + 1}"][data-columna="${oCol}"]`);
                        return destinoVacio && (!casillaIntermedia || casillaIntermedia.textContent.trim() === '');
                    }
                }
                if (Math.abs(deltaCol) === 1 && deltaFila === 1 && !destinoVacio && piezasBlancasUnicode.includes(destinoContenido)) {
                    return true;
                }
                return false;
            case '♖': case '♜':
                if (oFila === dFila) {
                    const step = oCol < dCol ? 1 : -1;
                    for (let col = oCol + step; col !== dCol; col += step) {
                        const casilla = document.querySelector(`[data-fila="${oFila}"][data-columna="${col}"]`);
                        if (casilla && casilla.querySelector('span')) return false;
                    }
                    return true;
                }
                if (oCol === dCol) {
                    const step = oFila < dFila ? 1 : -1;
                    for (let fila = oFila + step; fila !== dFila; fila += step) {
                        const casilla = document.querySelector(`[data-fila="${fila}"][data-columna="${oCol}"]`);
                        if (casilla && casilla.querySelector('span')) return false;
                    }
                    return true;
                }
                return false;
            case '♗': case '♝':
                if (Math.abs(deltaFila) !== Math.abs(deltaCol)) return false;
                const pasoFila = deltaFila > 0 ? 1 : -1;
                const pasoCol = deltaCol > 0 ? 1 : -1;
                let fila = oFila + pasoFila;
                let col = oCol + pasoCol;
                while (fila !== dFila && col !== dCol) {
                    const casilla = document.querySelector(`[data-fila="${fila}"][data-columna="${col}"]`);
                    if (casilla && casilla.querySelector('span')) return false;
                    fila += pasoFila;
                    col += pasoCol;
                }
                return true;
            case '♘': case '♞':
                return (Math.abs(deltaFila) === 2 && Math.abs(deltaCol) === 1) ||
                       (Math.abs(deltaFila) === 1 && Math.abs(deltaCol) === 2);
            case '♕': case '♛':
                if (oFila === dFila || oCol === dCol) {
                    const pasoFila = dFila > oFila ? 1 : (dFila < oFila ? -1 : 0);
                    const pasoCol = dCol > oCol ? 1 : (dCol < oCol ? -1 : 0);
                    let fila = oFila + pasoFila;
                    let col = oCol + pasoCol;
                    while (fila !== dFila || col !== dCol) {
                        const casilla = document.querySelector(`[data-fila="${fila}"][data-columna="${col}"]`);
                        if (casilla && casilla.querySelector('span')) return false;
                        fila += pasoFila;
                        col += pasoCol;
                    }
                    return true;
                }
                if (Math.abs(deltaFila) === Math.abs(deltaCol)) {
                    const pasoFila = deltaFila > 0 ? 1 : -1;
                    const pasoCol = deltaCol > 0 ? 1 : -1;
                    let fila = oFila + pasoFila;
                    let col = oCol + pasoCol;
                    while (fila !== dFila && col !== dCol) {
                        const casilla = document.querySelector(`[data-fila="${fila}"][data-columna="${col}"]`);
                        if (casilla && casilla.querySelector('span')) return false;
                        fila += pasoFila;
                        col += pasoCol;
                    }
                    return true;
                }
                return false;
            case '♔': case '♚':
                return Math.abs(deltaFila) <= 1 && Math.abs(deltaCol) <= 1;
            default:
                return false;
        }
    }
});
