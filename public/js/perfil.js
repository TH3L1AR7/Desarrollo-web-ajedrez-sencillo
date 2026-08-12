document.addEventListener("DOMContentLoaded", () => {
  fetch('/usuario')
    .then(res => res.json())
    .then(data => {
      const user = data.usuario;

      if (!user) {
       
        window.location.href = '/iniciar-sesio'; 
        return;
      }

      document.getElementById('nombre').textContent = user.Nombre || '';
      document.getElementById('apellido').textContent = user.Apellido || '';
      document.getElementById('correo').textContent = user.Correo || '';
      document.getElementById('fechaNacimiento').textContent = user.fechaNacimiento || '';
    });
});