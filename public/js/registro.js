    document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('registro-form');
    const mensajeDiv = document.getElementById('mensaje');

    form.addEventListener('submit', async function(event) {
      event.preventDefault();  

      const nombre = document.getElementById('Nombre-registro').value;
      const apellido = document.getElementById('Apellido-registro').value;
      const correo = document.getElementById('Correo').value;
      const contrasena = document.getElementById('Contraseña').value;
      const confirmarContrasena = document.getElementById('Confirmar-Contraseña').value;
      const fechaNacimiento = document.getElementById('fecha-nacimiento').value;

      if (contrasena !== confirmarContrasena) {
        mensajeDiv.innerHTML = '<h1>Las contraseñas no coinciden. Intenta nuevamente.</h1>';
        return;
      }

      try {
        const response = await fetch('/registrar-usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            Nombre: nombre,
            Apellido: apellido,
            Correo: correo,
            Contrasena: contrasena,
            "Confirmar-Contraseña": confirmarContrasena,
            "fecha-nacimiento": fechaNacimiento
          })
        });

        const result = await response.json();
        if (result.mensaje === 'registro-exitoso') {
        localStorage.setItem('usuario', JSON.stringify({
        nombre,
        apellido,
        correo,
        fechaNacimiento
        }));
          mensajeDiv.innerHTML = '<h1>Te has registrado correctamente, redirigiendo a inicio de sesion </h1>';
          setTimeout(() => window.location.href = '/iniciar-sesio', 2000);
        } else if (result.mensaje === 'correo-ya-registrado') {
          mensajeDiv.innerHTML = '<h1>Ya estas registrado. Inicia sesión.</h1>';
        } else if (result.mensaje === 'contraseñas-no-coinciden') {
          mensajeDiv.innerHTML = '<h1>Contraseña incorrecta. Intenta nuevamente.</h1>';
        }
      } catch {
        mensajeDiv.innerHTML = '<h1>El servidor ha presentado un fallo. Intenta nuevamente.</h1>';
      }
    });
});