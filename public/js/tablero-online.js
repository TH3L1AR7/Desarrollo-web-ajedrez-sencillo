(() => {
  const columnas = ['a','b','c','d','e','f','g','h'];
  const filas    = [8,7,6,5,4,3,2,1];
  const piezasBlancas = ['♙','♖','♗','♘','♕','♔'];
  const piezasNegras  = ['♟','♜','♝','♞','♛','♚'];

  const tableroEl = document.querySelector('.tablero');

  function coordAId(col, fila) { return `${col}${fila}`; }

  function crearCasilla(colIdx, filaIdx) {
    const col  = columnas[colIdx];
    const fila = filas[filaIdx];
    const id   = coordAId(col, fila);

    const div = document.createElement('div');
    div.id = id;
    div.classList.add((colIdx + filaIdx) % 2 ? 'negra' : 'blanca');
    div.dataset.col = colIdx;
    div.dataset.fila = filaIdx;
    return div;
  }

  function pintarTablero(estado) {
    tableroEl.innerHTML = '';
    for (let f = 0; f < filas.length; f++) {
      for (let c = 0; c < columnas.length; c++) {
        const casilla = crearCasilla(c, f);
        const piezaObj = estado.piezas.find(p => p.id === casilla.id);
        if (piezaObj) {
          const span = document.createElement('span');
          span.textContent = piezaObj.pieza;
          span.draggable = true;
          span.classList.add(
            piezasBlancas.includes(piezaObj.pieza) ? 'pieza-blanca' : 'pieza-negra'
          );
          casilla.appendChild(span);
        }
        tableroEl.appendChild(casilla);
      }
    }
  }

  //  Detectar movimientos drag‑and‑drop 
  let callbackMovimiento = () => {};
  function initDragAndDrop() {
    let origenId = null;

    tableroEl.addEventListener('dragstart', e => {
      if (e.target.tagName !== 'SPAN' || tableroEl.classList.contains('bloqueado')) {
        e.preventDefault();
        return;
      }
      origenId = e.target.parentElement.id;
    });

    tableroEl.addEventListener('dragover', e => e.preventDefault());

    tableroEl.addEventListener('drop', e => {
      e.preventDefault();
      const destino = e.target.closest('div');
      if (!destino || !origenId) return;

      const to   = destino.id;
      const from = origenId;
      origenId = null;
      callbackMovimiento(from, to);
    });
  }

  // ---- Bloquear movimientos
  function bloquearMovimientos(bloqueado) {
    tableroEl.classList.toggle('bloqueado', bloqueado);
  }

  document.addEventListener('DOMContentLoaded', initDragAndDrop);

  // ---- Exponemos API global 
  window.TableroOnline = {
    pintarTablero,
    bloquearMovimientos,
    onMovimiento: fn => callbackMovimiento = fn
  };
})();
    