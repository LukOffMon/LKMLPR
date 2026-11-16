import type { Trampa } from '../types'

export const TRAMPAS: Trampa[] = [
  {
    id: 'multinivel',
    nombre: 'Esquemas piramidales y multinivel',
    gancho: '"Sé tu propio jefe", "ingreso pasivo", "solo invita a 3 personas".',
    comoFunciona:
      'Ganas principalmente por reclutar gente, no por vender un producto a clientes reales. Para entrar pagas un "kit" o inversión. La gran mayoría de participantes pierde dinero; ganan los de arriba. Los piramidales puros (sin producto real) son fraude.',
    senales: [
      'Te hablan más de reclutar que del producto.',
      'Debes pagar para entrar o comprar inventario mínimo cada mes.',
      'Te muestran autos, viajes y estilos de vida, no números.',
      'Presión para invitar a familiares y amigos.',
      '"No es pirámide, es mercadeo en red" — dicho antes de que preguntes.',
    ],
    enSuLugar: 'Vende servicios reales a clientes reales. Si quieres comisiones, hazte afiliado de productos que usas, sin pagar entrada.',
  },
  {
    id: 'trading',
    nombre: 'Cursos de "trading" y venta de señales',
    gancho: '"Gana $5,000 al día desde tu celular", "mi estrategia tiene 90% de acierto".',
    comoFunciona:
      'Quien vende el curso gana con tu inscripción, no con el trading. La gran mayoría de traders minoristas pierde dinero, especialmente con apalancamiento (forex, opciones, CFDs). Muchos "brokers" recomendados no están regulados en México.',
    senales: [
      'Promesas de rendimientos diarios o mensuales altos.',
      'Capturas de ganancias (fácilmente falsificables) y nunca historial auditado.',
      'Grupos de Telegram/WhatsApp con "señales" de pago.',
      'Te piden depositar en un broker que ellos indican.',
      'Urgencia: "solo quedan 5 lugares".',
    ],
    enSuLugar: 'Invierte solo cuando tengas fondo de emergencia, en instrumentos regulados de bajo riesgo y entendiendo lo que compras. Consulta en Condusef si una entidad está autorizada.',
  },
  {
    id: 'apuestas',
    nombre: 'Apuestas y casinos en línea',
    gancho: '"Pronósticos seguros", "método para ganar en el casino", bonos de bienvenida.',
    comoFunciona:
      'Las casas de apuestas están diseñadas matemáticamente para ganar a largo plazo. Los "pronosticadores" ganan por afiliación cuando tú pierdes. Es adictivo y está diseñado para serlo.',
    senales: [
      'Bonos que "regalan" dinero para que empieces.',
      'Influencers mostrando ganancias, nunca pérdidas.',
      'Pensar "ya casi recupero lo que perdí".',
    ],
    enSuLugar: 'El único juego con expectativa positiva es construir habilidades y negocios. Si sientes que no puedes parar de apostar, busca ayuda (Línea de la Vida 800 911 2000).',
  },
  {
    id: 'cripto',
    nombre: 'Cripto especulativa y "proyectos" milagro',
    gancho: '"Esta moneda va a hacer x100", NFTs, preventas, "minería en la nube".',
    comoFunciona:
      'Muchas monedas pequeñas son esquemas de "pump and dump": los creadores venden cuando tú compras. Las plataformas de "minería en la nube" y "staking garantizado" suelen ser fraudes Ponzi. Incluso las criptomonedas grandes son extremadamente volátiles.',
    senales: [
      'Rendimientos garantizados.',
      'Te piden enviar cripto a una dirección para "activar" o "retirar" ganancias.',
      'Presión por comprar antes de una fecha.',
      'Plataformas sin regulación clara.',
    ],
    enSuLugar: 'Si algún día quieres exposición a activos de alto riesgo, que sea una fracción pequeña de tu patrimonio, después de fondo de emergencia e inversión conservadora, y solo lo que puedas perder por completo.',
  },
  {
    id: 'dropshipping',
    nombre: '"Dropshipping mágico" y cursos de e-commerce fácil',
    gancho: '"Vende sin inventario y gana $100k al mes", "producto ganador".',
    comoFunciona:
      'El negocio real existe, pero es difícil: márgenes bajos, anuncios caros, envíos largos desde el extranjero, devoluciones, reclamaciones y obligaciones fiscales. Los gurús ganan vendiendo el curso, la tienda prehecha o el "mentoring".',
    senales: [
      'Capturas de "ventas" (no de utilidad).',
      'Te venden una tienda prehecha o un "producto ganador".',
      'Nunca hablan de costos de anuncios, devoluciones ni impuestos.',
    ],
    enSuLugar: 'Aprende comercio vendiendo en Marketplace y Mercado Libre con productos que puedes tocar, márgenes calculados y sin deudas.',
  },
  {
    id: 'prestamos',
    nombre: 'Préstamos para "invertir" o para emprender',
    gancho: '"Pide un crédito y ponlo a trabajar", préstamos rápidos por app.',
    comoFunciona:
      'Endeudarte para invertir en algo que no dominas multiplica pérdidas. Muchas apps de préstamos tienen intereses altísimos y algunas son ilegales y usan cobranza abusiva (acceso a tus contactos y fotos).',
    senales: [
      'Préstamos "sin buró" en minutos.',
      'Apps que piden acceso a tus contactos y galería.',
      'CAT (Costo Anual Total) altísimo o no informado.',
    ],
    enSuLugar: 'Tu modelo es capital $0: servicios primero, reinversión de utilidades después. Si alguna vez necesitas crédito, compara el CAT y verifica la institución en Condusef.',
  },
  {
    id: 'cursos-gurus',
    nombre: 'Gurús de "mentalidad millonaria"',
    gancho: '"El sistema te quiere pobre", "la escuela no sirve", "tu mentalidad es tu problema".',
    comoFunciona:
      'Venden motivación y estatus, no habilidades. Escalera de productos: libro → curso → mentoría de miles de pesos → "círculo élite". Te convencen de dejar la escuela o endeudarte para "invertir en ti".',
    senales: [
      'Mucho estilo de vida, pocos detalles concretos.',
      'Te piden pagar para saber "el secreto".',
      'Critican la educación formal para que dejes tus estudios.',
      'Testimonios de gente que gana… vendiendo el mismo curso.',
    ],
    enSuLugar: 'Casi todo lo que necesitas aprender está gratis (ver Biblioteca). Paga solo por habilidades concretas cuando ya estés ganando y sepas exactamente qué te falta.',
  },
  {
    id: 'ilegal',
    nombre: 'Cualquier cosa ilegal o "gris"',
    gancho: 'Venta de cuentas, réplicas, software pirata, mercancía de dudosa procedencia, "solo presta tu cuenta bancaria".',
    comoFunciona:
      'El dinero fácil ilegal sale muy caro: antecedentes penales, perder tu cuenta bancaria, problemas con el SAT o algo peor. "Prestar" tu cuenta o tarjeta para recibir dinero de otros puede involucrarte en fraude o lavado.',
    senales: [
      'Te ofrecen dinero por recibir transferencias en tu cuenta.',
      'Productos muy por debajo del precio de mercado.',
      'Te piden discreción o "no preguntes".',
    ],
    enSuLugar: 'Tu reputación es tu activo más valioso en una ciudad donde todos se conocen. Construye solo lo que puedas mostrarle orgulloso a tu familia.',
  },
  {
    id: 'empleos-falsos',
    nombre: 'Empleos falsos y "trabajo desde casa" con pago previo',
    gancho: '"Gana $800 al día dando likes", "califica productos", "solo paga tu registro".',
    comoFunciona:
      'Te pagan pequeñas cantidades al principio para ganar confianza y luego te piden "depositar para desbloquear tareas" o pagar cursos/registro. Es fraude.',
    senales: [
      'Te contactan sin que hayas aplicado.',
      'Pagos por tareas absurdamente fáciles.',
      'Te piden depositar dinero para seguir ganando.',
    ],
    enSuLugar: 'Un empleo o cliente legítimo nunca te pide pagar para trabajar.',
  },
]
