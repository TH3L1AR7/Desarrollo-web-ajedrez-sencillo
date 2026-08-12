// -------------------------------
// IMPORTACIONES Y CONFIGURACIÓN
// -------------------------------
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Partida = require('./partida');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 80;

app.use(cookieParser());

// -------------------------------
// HANDLEBARS
// -------------------------------
const hbs = exphbs.create({
  extname: 'hbs',
  defaultLayout: false,
  helpers: {
    eq: (a, b) => String(a) === String(b)
  },
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true
  }
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// -------------------------------
// MIDDLEWARE
// -------------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// -------------------------------
// MONGODB
// -------------------------------
mongoose.connect('mongodb+srv:')
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err  => console.error('❌ Error conectando a MongoDB:', err));

// -------------------------------
// MODELO USUARIO
// -------------------------------
const UsuarioSchema = new mongoose.Schema({
  Nombre: String,
  Apellido: String,
  Correo: { type: String, unique: true },
  Contrasena: String,
  fechaNacimiento: String
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

// -------------------------------
// SOCKET.IO - PARTIDAS ONLINE
// -------------------------------
const partidaColores = {}; 

io.on('connection', (socket) => {
  console.log('🟢 Usuario conectado:', socket.id);

  socket.on('unirse-partida', async (partidaId) => {
    socket.join(partidaId);

    const partida = await Partida.findById(partidaId);
    if (!partida) {
      socket.emit('asignar-color', 'espectador');
      return;
    }

    if (!partidaColores[partidaId]) partidaColores[partidaId] = {};

    let colorAsignado = 'espectador';
    const userId = getCookieUserId(socket.handshake.headers.cookie);

    // ¿Es jugador1?
    if (userId === String(partida.jugador1)) {
      colorAsignado = (partida.colorCreador === 'blancas') ? 'blanco' : 'negro';
      partidaColores[partidaId][colorAsignado] = socket.id;
    }
    // ¿Es jugador2?
    else if (partida.jugador2 && userId === String(partida.jugador2)) {
      colorAsignado = (partida.colorCreador === 'blancas') ? 'negro' : 'blanco';
      partidaColores[partidaId][colorAsignado] = socket.id;
    }
    // ¿Es un nuevo usuario que puede ser jugador2?
    else if (!partida.jugador2 && userId && userId !== String(partida.jugador1)) {
      partida.jugador2 = userId;
      await partida.save();
      colorAsignado = (partida.colorCreador === 'blancas') ? 'negro' : 'blanco';
      partidaColores[partidaId][colorAsignado] = socket.id;
    }
    // Si ya hay dos jugadores distintos, el resto son espectadores

    socket.emit('asignar-color', colorAsignado);

    // Notificar solo a los jugadores reales
    const jugadoresColores = ['blanco', 'negro'];
    const jugadoresConectados = jugadoresColores.filter(c => partidaColores[partidaId][c]).length;
    if (jugadoresConectados === 2) {
      jugadoresColores.forEach(c => {
        const sockId = partidaColores[partidaId][c];
        if (sockId) io.to(sockId).emit('oponente-conectado');
      });
    }

    io.in(partidaId).emit('color-inicial', partida.colorCreador);
  });

  socket.on('mover', async ({ partidaId, movimiento }) => {
    await Partida.findByIdAndUpdate(partidaId, {
      $push: { movimientos: movimiento }
    });
    socket.to(partidaId).emit('mover', movimiento);
  });

  socket.on('rendirse', async ({ partidaId, jugador }) => {
    const partida = await Partida.findById(partidaId);
    if (!partida) return;
    let resultado = 'empate';
    if (jugador === 'blanco') resultado = 'jugador2';
    if (jugador === 'negro') resultado = 'jugador1';
    partida.resultado = resultado;
    await partida.save();
    io.in(partidaId).emit('fin-partida', { motivo: 'rendicion', ganador: resultado });
  });

  socket.on('nueva-partida', async (partidaId) => {
    await Partida.findByIdAndUpdate(partidaId, { movimientos: [], resultado: 'en_curso' });
    io.in(partidaId).emit('reiniciar-partida');
  });

  socket.on('disconnect', () => {
    console.log('🔴 Usuario desconectado:', socket.id);
  });
});

function getCookieUserId(cookie) {
  if (!cookie) return '';
  const match = cookie.match(/usuario_id=([a-zA-Z0-9]+)/);
  return match ? match[1] : '';
}

// -------------------------------
// RUTA VERIFICAR SESIÓN ANTES DE JUGAR ONLINE
// -------------------------------
app.get('/verificar-sesion', async (req, res) => {
  const usuarioId = req.cookies.usuario_id;
  const { partidaId } = req.query;
  if (!partidaId) return res.status(400).send("Falta el ID de la partida");

  if (!usuarioId) {
    return res.redirect(`/iniciar-sesio?redirigidoDesdePartida=${partidaId}`);
  }
  const usuario = await Usuario.findById(usuarioId);
  if (!usuario) {
    return res.redirect(`/iniciar-sesio?redirigidoDesdePartida=${partidaId}`);
  }
  res.redirect(`/juego-local?partidaId=${partidaId}`);
});

// -------------------------------
// API - ESTADO DE PARTIDA ONLINE
// -------------------------------
app.get('/api/partida-estado/:partidaId', async (req, res) => {
  const { partidaId } = req.params;
  try {
    const partida = await Partida.findById(partidaId);
    if (!partida) return res.status(404).json({ ok: false, error: 'Partida no encontrada' });
    res.json({
      ok: true,
      movimientos: partida.movimientos,
      resultado: partida.resultado
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al obtener el estado' });
  }
});

// -------------------------------
// RUTAS PRINCIPALES
// -------------------------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/principal', (req, res) => res.render('principal'));
app.get('/bando', (req, res) => res.sendFile(path.join(__dirname, 'views', 'bando.html')));
app.get('/reglas', (req, res) => res.sendFile(path.join(__dirname, 'views', 'reglas.html')));
app.get('/desarrolladores', (req, res) => res.sendFile(path.join(__dirname, 'views', 'desarrolladores.html')));
app.get('/juego-local', (req, res) => res.render('juego-local'));
app.get('/registrar-usuarios', (req, res) => res.render('registrar-usuarios'));
app.get('/iniciar-sesio', (req, res) => {
  const { redirigidoDesdePartida } = req.query;
  res.render('iniciar-sesio', { redirigidoDesdePartida });
});

app.get('/buscar-usuario', async (req, res) => {
  const { username } = req.query;
  try {
    const resultado = await Usuario.findOne({ Nombre: username });
    if (!resultado) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ id: resultado._id, username: resultado.Nombre });
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar usuario' });
  }
});

app.post('/crear-partida', async (req, res) => {
  const creadorId = req.cookies.usuario_id;
  const { color }  = req.body;
  if (!creadorId || !['blancas', 'negras'].includes(color)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  // ----- LÍMITE DE 5 PARTIDAS -----
  const partidasCreadas = await Partida.countDocuments({ propietario: creadorId });
  if (partidasCreadas >= 5) {
    return res.status(403).json({ error: 'Límite de 5 partidas creadas alcanzado. Elimina alguna antes de crear una nueva.' });
  }

  try {
    const partida = await Partida.create({ propietario: creadorId, jugador1: creadorId, colorCreador: color });
    res.json({ mensaje: 'partida-creada', partidaId: partida._id, colorAsignado: color });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la partida' });
  }
});

app.post('/unirse-partida', async (req, res) => {
  const jugadorId = req.cookies.usuario_id;
  const { partidaId } = req.body;
  if (!jugadorId || !partidaId) return res.status(400).json({ error: 'Datos inválidos' });
  try {
    const partida = await Partida.findById(partidaId);
    if (!partida || partida.jugador2 || partida.propietario.equals(jugadorId)) {
      return res.status(400).json({ error: 'No puedes unirte' });
    }
    partida.jugador2 = jugadorId;
    await partida.save();
    res.json({ mensaje: 'rival-confirmado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al unirse a la partida' });
  }
});

app.get('/unirse', (req, res) => {
  const { partidaId } = req.query;
  res.redirect(`/verificar-sesion?partidaId=${partidaId}`);
});

app.post('/iniciar-partida', async (req, res) => {
  const jugador1Id = req.cookies.usuario_id;
  const { jugador2Id } = req.body;
  if (!jugador1Id || jugador2Id === jugador1Id.toString()) {
    return res.status(400).json({ error: 'Jugador inválido' });
  }
  try {
    const nueva = new Partida({ jugador1: jugador1Id, jugador2: jugador2Id, propietario: jugador1Id, colorCreador: 'blancas' });
    await nueva.save();
    const oponente = await Usuario.findById(jugador2Id);
    res.render('confirmacion', {
      oponente: oponente.Nombre,
      fechaInicio: nueva.fechaInicio,
      resultado: nueva.resultado
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la partida' });
  }
});

app.get('/partidas', async (req, res) => {
  const usuarioId = req.cookies.usuario_id;
  if (!usuarioId) return res.redirect('/iniciar-sesio');
  try {
    const partidas = await Partida.find({
      $or: [{ jugador1: usuarioId }, { jugador2: usuarioId }]
    }).populate('jugador1 jugador2');
    res.render('partidas', { partidas, usuarioId });
  } catch (err) {
    res.status(500).send('Error al cargar tus partidas');
  }
});

app.post("/eliminar-partida", async (req, res) => {
  const usuarioId = req.cookies.usuario_id;
  const { partidaId } = req.body;
  try {
    const partida = await Partida.findById(partidaId);
    if (!partida)
      return res.status(404).json({ ok: false, error: "Partida no encontrada" });

    // SOLO el propietario puede borrar la partida
    if (partida.propietario.equals(usuarioId)) {
      await Partida.findByIdAndDelete(partidaId);
      res.json({ ok: true });
    } else {
      res.status(403).json({ ok: false, error: "No autorizado" });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: "Error al eliminar la partida" });
  }
});

app.get('/buscar', (req, res) => {
  if (!req.cookies.usuario_id) return res.redirect('/iniciar-sesio');
  res.render('buscar');
});

app.post('/registrar-usuarios', async (req, res) => {
  const { Nombre, Apellido, Correo, Contrasena, "Confirmar-Contraseña": confirmar, "fecha-nacimiento": fechaNacimiento } = req.body;
  if (Contrasena !== confirmar) return res.json({ mensaje: 'contraseñas-no-coinciden' });
  try {
    const existente = await Usuario.findOne({ Correo });
    if (existente) return res.json({ mensaje: 'correo-ya-registrado' });
    const hashedPassword = await bcrypt.hash(Contrasena, 10);
    await Usuario.create({ Nombre, Apellido, Correo, Contrasena: hashedPassword, fechaNacimiento });
    res.json({ mensaje: 'registro-exitoso' });
  } catch (err) {
    res.status(500).json({ mensaje: 'error-interno' });
  }
});

app.post('/login', async (req, res) => {
  const { Correo, Contrasena } = req.body;
  const { redirigidoDesdePartida } = req.query;
  try {
    const usuario = await Usuario.findOne({ Correo });
    if (!usuario) return res.json({ mensaje: 'credenciales-invalidas' });
    const esValida = await bcrypt.compare(Contrasena, usuario.Contrasena);
    if (!esValida) return res.json({ mensaje: 'credenciales-invalidas' });
    res.cookie('usuario_id', usuario._id.toString(), {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    });
    if (req.body.redirigidoDesdePartida) {
      return res.json({ mensaje: 'login-exitoso', usuario, partidaId: req.body.redirigidoDesdePartida });
    }
    res.json({ mensaje: 'login-exitoso', usuario });
  } catch (err) {
    res.status(500).json({ mensaje: 'error-interno' });
  }
});

app.get('/perfil', async (req, res) => {
  const usuarioId = req.cookies.usuario_id;
  if (!usuarioId) return res.redirect('/iniciar-sesio');
  try {
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) return res.redirect('/iniciar-sesio');
    res.render('perfil', { username: usuario.Nombre });
  } catch (err) {
    res.status(500).send('Error al cargar perfil');
  }
});

app.get('/cerrar-sesion', (req, res) => {
  res.clearCookie('usuario_id');
  res.redirect('/');
});

app.get('/usuario', async (req, res) => {
  const usuarioId = req.cookies.usuario_id;
  if (!usuarioId) return res.json({ usuario: null });
  try {
    const usuario = await Usuario.findById(usuarioId);
    res.json({ usuario });
  } catch (err) {
    res.json({ usuario: null });
  }
});

// -------------------------------
// INICIAR SERVIDOR
// -------------------------------
server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${port}`);
});
