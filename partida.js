const mongoose = require('mongoose');
const { Schema } = mongoose;

const MovimientoSchema = new Schema({
  origenId: String,
  destinoId: String,
  pieza: String,
  turnoRemoto: String
}, { _id: false });

const PartidaSchema = new Schema({
  propietario: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  jugador1: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  jugador2: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null
  },
  colorCreador: {
    type: String,
    enum: ['blancas', 'negras'],
    required: true
  },
  fechaInicio: {
    type: Date,
    default: Date.now
  },
  resultado: {
    type: String,
    enum: ['jugador1', 'jugador2', 'empate', 'en_curso'],
    default: 'en_curso'
  },
  movimientos: [MovimientoSchema]
});

module.exports = mongoose.model('Partida', PartidaSchema);