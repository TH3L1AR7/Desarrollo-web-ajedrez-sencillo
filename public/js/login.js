document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('login-form');
    const mensajeDiv = document.getElementById('mensaje');
    const nextField = document.getElementById('next');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const correo = document.getElementById('Correo').value;
        const contrasena = document.getElementById('Contraseña').value;
        const next = nextField ? nextField.value : "";

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    Correo: correo,
                    Contrasena: contrasena
                })
            });

            const result = await response.json();

            if (result.mensaje === 'login-exitoso') {
                localStorage.setItem('usuario', JSON.stringify(result.usuario));
                mensajeDiv.textContent = 'Has iniciado sesión correctamente, redirigiendo...';

                setTimeout(() => {
                    if (next && next.startsWith('/')) {
                        window.location.href = next;
                    } else {
                        window.location.href = '/principal';
                    }
                }, 1000);

            } else {
                mensajeDiv.textContent = 'Correo y/o contraseña incorrectos';
            }
        } catch {
            mensajeDiv.textContent = 'Fallo en el servidor.';
        }
    });
});
