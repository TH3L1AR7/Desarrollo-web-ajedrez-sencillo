document.addEventListener("DOMContentLoaded", () => {
  const usuario = JSON.parse(localStorage.getItem('usuario')) || null;
  const fotoUsuario = localStorage.getItem('fotoPerfil') || '/img/default-profile.png';

  const imgUsuario = document.getElementById('foto-usuario');
  const nombreUsuario = document.getElementById('nombre-usuario');

  if (usuario) {
    imgUsuario.src = fotoUsuario;
    nombreUsuario.textContent = usuario.nombre || usuario.Nombre || 'Usuario';
  } else {
    imgUsuario.src = '/img/default-profile.png';
    nombreUsuario.textContent = 'Invitado';
  }
});