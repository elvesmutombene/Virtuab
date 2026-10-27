// ========================================
// CONFIGURAÇÃO
// ========================================

// Coloque aqui o seu número do WhatsApp.
// Exemplo:
// 258870419940

const numeroWhatsApp = "258870419940";


// ========================================
// LINKS DE COMPRA
// ========================================

const mensagem =
    "Olá! Tenho interesse no Pack dos 7 cursos por 199 MT.";

const linkWhatsApp =
    `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;


// Todos os botões que usam WhatsApp

document
    .querySelectorAll('a[href*="SEUNUMERO"]')
    .forEach(botao => {

        botao.href = linkWhatsApp;

    });


// ========================================
// ANIMAÇÃO SUAVE DOS CARDS
// ========================================

const cards =
    document.querySelectorAll(
        ".course-card, .bonus-card, .testimonial"
    );


const observer =
    new IntersectionObserver(
        (entries) => {

            entries.forEach(entry => {

                if(entry.isIntersecting){

                    entry.target.style.opacity = "1";

                    entry.target.style.transform =
                        "translateY(0)";

                }

            });

        },
        {
            threshold:0.1
        }
    );


cards.forEach(card => {

    card.style.opacity = "0";

    card.style.transform =
        "translateY(25px)";

    card.style.transition =
        "opacity .6s ease, transform .6s ease";

    observer.observe(card);

});