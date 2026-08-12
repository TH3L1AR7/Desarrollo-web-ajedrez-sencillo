document.addEventListener("DOMContentLoaded", () => {
    fetch('/usuario')
      .then(res => res.json())
      .then(data => {
        const user = data.usuario;
        const jugarBtn = document.getElementById('boton-jugar');
        const bienvenidaDiv = document.getElementById('bienvenida');
        const logStatusDiv = document.getElementById('log-status');
        const cerrarSesionBtn = document.getElementById('cerrar-sesion');

        if (user) {
          bienvenidaDiv.textContent = `Bienvenido, ${user.Nombre}`;
          logStatusDiv.textContent = '¡Estás logeado!';
          cerrarSesionBtn.style.display = 'inline-block';

          jugarBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = '/bando'; 
          });
        } else {
          logStatusDiv.textContent = '';
          cerrarSesionBtn.style.display = 'none';

          jugarBtn.addEventListener('click', function (e) {
            e.preventDefault();
            alert('Debes iniciar sesión para jugar.');
            window.location.href = '/iniciar-sesio';
          });
        }
      });
});