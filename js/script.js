document.addEventListener("DOMContentLoaded", () => {

    // ===============================
    // ANIMAÇÕES AO ENTRAR NA TELA
    // ===============================

    const elementos = document.querySelectorAll(
        ".course-card, .bonus-card, .testimonial"
    );

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
                obs.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12
    });

    elementos.forEach((elemento, index) => {
        elemento.style.transitionDelay =
            `${(index % 4) * 0.08}s`;

        observer.observe(elemento);
    });


    // ===============================
    // SOMBRA NO HEADER AO ROLAR
    // ===============================

    const header = document.querySelector(".header");

    window.addEventListener("scroll", () => {
        if (!header) return;

        if (window.scrollY > 20) {
            header.style.boxShadow =
                "0 8px 30px rgba(0,0,0,.25)";
        } else {
            header.style.boxShadow = "none";
        }
    });

});
