document.addEventListener("DOMContentLoaded", () => {
    
    const numeroAleatorio = Math.floor(Math.random() * 100) + 1;

    
    document.getElementById('aleatory').textContent = numeroAleatorio;
});