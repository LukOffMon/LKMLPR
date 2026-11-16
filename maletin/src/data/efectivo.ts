import type { TipoSprint } from '../types'

export interface OfertaExpress {
  id: string
  nombre: string
  que: string
  aQuien: string
  precio: string
  precioBase: number
  guion: string
  entrega: string[]
  recurrente: string
  ideaId?: string
  tipo: 'digital' | 'tecnico' | 'comercio' | 'educacion'
}

export const OFERTAS_EXPRESS: OfertaExpress[] = [
  {
    id: 'web-express', tipo: 'digital', ideaId: 'landing-pages',
    nombre: 'Página web express en 48 h',
    que: 'Landing de 1 sección: servicios, fotos, mapa, horario y botón de WhatsApp.',
    aQuien: 'Negocios con buenas reseñas en Google Maps pero sin sitio: dentistas, talleres, veterinarias, estéticas de Jesús María.',
    precio: '$1,500–$2,500', precioBase: 1800,
    guion: 'Hola, buen día. Vi que [Negocio] tiene muy buenas reseñas en Google pero no tiene página propia. Le preparé un ejemplo de cómo se vería, con botón directo a su WhatsApp: [link]. La puedo dejar funcionando en 48 horas por $[precio]. ¿Le gustaría verla en su celular?',
    entrega: ['Pide logo, 5 fotos, servicios y horario en un solo mensaje.', 'Usa tu plantilla base + IA para textos (3–4 h).', 'Publica en Netlify y conecta dominio (o subdominio gratis).', 'Envía link de revisión; 1 ronda de cambios el mismo día.', 'Entrega con guía PDF de 1 página.'],
    recurrente: 'Mantenimiento $250/mes: cambios de precios, fotos nuevas y respaldo.',
  },
  {
    id: 'gbp-express', tipo: 'digital', ideaId: 'google-business',
    nombre: 'Google Business Profile optimizado',
    que: 'Alta u optimización de ficha de Maps + 15 fotos + QR de reseñas.',
    aQuien: 'Cualquier local físico sin ficha, con horario mal o sin fotos (taquerías, ferreterías, consultorios).',
    precio: '$500–$900', precioBase: 700,
    guion: 'Buenas tardes. Busqué [Negocio] en Google Maps y [no aparece / tiene horario distinto / casi no tiene fotos]. Me dedico a arreglar eso para negocios de la zona: le dejo la ficha completa con fotos y un QR para que sus clientes dejen reseñas. Son $[precio] y queda en 48 h (la verificación de Google puede tardar unos días más). ¿Le mando el diagnóstico gratis?',
    entrega: ['Visita de 30 min: fotos de fachada, interior, productos, equipo.', 'Configura categorías, servicios, atributos y horarios.', 'Sube fotos editadas y descripción con palabras clave.', 'Imprime QR de reseñas y explica cómo pedirlas.', 'Captura de la ficha terminada.'],
    recurrente: 'Gestión $300–$500/mes: 4 publicaciones y respuesta a reseñas + reporte.',
  },
  {
    id: 'reels-10', tipo: 'digital', ideaId: 'edicion-video',
    nombre: 'Paquete de 10 reels editados',
    que: '10 videos verticales con subtítulos, ganchos y música libre.',
    aQuien: 'Creadores, coaches, inmobiliarias, gimnasios y restaurantes que graban pero no editan.',
    precio: '$1,200–$2,500', precioBase: 1500,
    guion: 'Hola [Nombre], vi tu video "[título]" y tiene al menos 5 momentos que funcionarían como reels. Te edité uno gratis para que veas el estilo: [link]. Te propongo un paquete de 10 por $[precio], entregados en 48 h. ¿Te late?',
    entrega: ['Pide material crudo por Drive y 2 videos de referencia.', 'Transcribe con IA y elige los mejores momentos.', 'Edita con plantilla de subtítulos propia.', 'Exporta 1080×1920 con y sin subtítulos.', 'Entrega en carpeta ordenada + 1 ronda de cambios.'],
    recurrente: '20 reels/mes por $2,500–$5,000 con calendario.',
  },
  {
    id: 'menu-qr-express', tipo: 'digital', ideaId: 'menu-qr',
    nombre: 'Menú digital con QR',
    que: 'Menú web con fotos, categorías, precios y pedido por WhatsApp + QRs para mesas.',
    aQuien: 'Fondas, taquerías, cafeterías y food trucks con menú en PDF o pizarrón.',
    precio: '$600–$1,200', precioBase: 900,
    guion: 'Buenas tardes, antes de que se llene. Noté que su menú [es un PDF / solo está en la pared]. Hice un ejemplo de menú digital con sus platillos que se ve perfecto en el celular: [link]. Se lo dejo funcionando con QRs para cada mesa por $[precio]. ¿Quiere verlo?',
    entrega: ['Foto del menú físico → IA lo transcribe.', 'Monta en tu plantilla de menú.', 'Agrega botón de pedido por WhatsApp.', 'Genera QR estático a tu link y diseña tarjeta de mesa.', 'Publica y prueba desde 3 celulares.'],
    recurrente: '$150–$250/mes por cambios de precios ilimitados.',
  },
  {
    id: 'pc-mantenimiento', tipo: 'tecnico', ideaId: 'mantenimiento-pc',
    nombre: 'Mantenimiento de PC/laptop a domicilio',
    que: 'Limpieza interna, pasta térmica, optimización y reporte de temperaturas.',
    aQuien: 'Familias, estudiantes y gamers de tu colonia y escuela; papelerías y cibercafés.',
    precio: '$250–$450', precioBase: 350,
    guion: '¿Tu laptop se calienta, hace ruido o va lenta? Casi siempre es polvo y pasta térmica seca. Hago mantenimiento a domicilio aquí en Jesús María por $[precio], con fotos del antes/después y la temperatura antes y después. ¿Te agendo esta semana?',
    entrega: ['Mide temperaturas iniciales (HWMonitor).', 'Desarma con fotos de cada paso.', 'Limpieza, pasta térmica, rearmado.', 'Optimiza inicio y elimina basura.', 'Prueba frente al cliente y entrega reporte.'],
    recurrente: 'Recordatorio a 6 meses y descuento por volver; contrato para oficinas.',
  },
  {
    id: 'formateo-express', tipo: 'tecnico', ideaId: 'formateo',
    nombre: 'Formateo con respaldo garantizado',
    que: 'Respaldo verificado, instalación limpia, drivers y programas legales esenciales.',
    aQuien: 'Equipos con virus, anuncios raros o muy lentos; adultos mayores; estudiantes.',
    precio: '$300–$500', precioBase: 400,
    guion: 'Si tu computadora tiene virus o va lentísima, te la dejo como nueva. Primero respaldo TODOS tus archivos y los revisas tú antes de borrar nada. Son $[precio] y te la regreso en 24–48 h. ¿Te la recojo?',
    entrega: ['Respaldo completo y firma del cliente de que lo revisó.', 'Instalación limpia con USB.', 'Drivers, actualizaciones, navegador, antivirus.', 'Restaura archivos y configura respaldo automático.', 'Entrega lista de lo instalado.'],
    recurrente: 'Mantenimiento anual y soporte por WhatsApp con tarifa preferente.',
  },
  {
    id: 'pc-gamer-express', tipo: 'tecnico', ideaId: 'pc-gamer',
    nombre: 'Armado de PC gamer',
    que: 'Cotización por presupuesto + armado + instalación + pruebas de estrés.',
    aQuien: 'Gamers, streamers y estudiantes de diseño o ingeniería.',
    precio: '$600–$1,200', precioBase: 800,
    guion: '¿Quieres armar PC gamer? Mándame tu presupuesto y qué juegos usas, y te paso gratis 2 opciones de piezas compatibles. Tú las compras a tu nombre (garantías tuyas) y yo la armo, instalo todo y la pruebo por $[precio]. ¿Cuánto tienes pensado invertir?',
    entrega: ['Cotización con 2 opciones el mismo día.', 'Cliente compra piezas a su nombre.', 'Armado con cable management.', 'BIOS, XMP, drivers, Windows.', 'Prueba de estrés 30 min frente al cliente.'],
    recurrente: 'Mantenimiento cada 6 meses y upgrades (GPU, SSD, RAM).',
  },
  {
    id: 'marketplace-consigna', tipo: 'comercio', ideaId: 'marketplace-propios',
    nombre: 'Te vendo lo que ya no usas (consignación)',
    que: 'Fotos, publicación, negociación y entrega segura; comisión solo si se vende.',
    aQuien: 'Familiares, vecinos y conocidos con muebles, electrónicos, bicis o herramientas sin usar.',
    precio: '20–30% de comisión', precioBase: 300,
    guion: '¿Tienes cosas en buen estado que ya no usas? Yo me encargo de venderlas: fotos, publicación, mensajes y entrega. Solo cobro [20–30]% cuando se vende; si no se vende, no pagas nada. ¿Paso este fin a ver qué tienes?',
    entrega: ['Acuerdo escrito: precio mínimo, comisión y plazo.', 'Limpia y fotografía con luz de día.', 'Publica en Marketplace y grupos de Jesús María.', 'Entrega en lugar público con pago verificado.', 'Liquida al dueño el mismo día con comprobante.'],
    recurrente: 'Servicio "vaciamos tu casa" para mudanzas; referidos de cada cliente.',
  },
  {
    id: 'asesoria-express', tipo: 'educacion', ideaId: 'asesorias',
    nombre: 'Asesoría exprés para examen',
    que: 'Paquete de 4 sesiones intensivas antes de un examen o extraordinario.',
    aQuien: 'Papás de alumnos de secundaria y prepa en temporada de exámenes.',
    precio: '$450–$700 (4 sesiones)', precioBase: 550,
    guion: 'Se acercan los exámenes de [materia]. Doy asesorías en Jesús María o en línea: paquete de 4 sesiones enfocadas en lo que viene en el examen por $[precio]. La primera es diagnóstico. ¿Le comparto horarios?',
    entrega: ['Diagnóstico de 20 min de lo que no domina.', 'Plan de 4 sesiones con ejercicios generados con IA.', 'Sesiones de 1 h con práctica real.', 'Examen simulado final.', 'Reporte breve a los papás.'],
    recurrente: 'Regularización semanal durante el semestre.',
  },
  {
    id: 'whatsapp-pro', tipo: 'digital', ideaId: 'chatbot-whatsapp',
    nombre: 'Automatización de respuestas en WhatsApp',
    que: 'WhatsApp Business configurado: catálogo, saludo, ausencia, respuestas rápidas y etiquetas.',
    aQuien: 'Negocios que tardan horas en contestar: pastelerías, consultorios, escuelas, gimnasios.',
    precio: '$800–$1,500', precioBase: 1000,
    guion: 'Les escribí ayer y la respuesta llegó [X horas] después; me imagino que reciben muchísimos mensajes. Les dejo WhatsApp respondiendo solo lo frecuente (precios, horarios, ubicación) con catálogo, en 48 h por $[precio]. ¿Les muestro un video de cómo queda?',
    entrega: ['Lista de las 15 preguntas más frecuentes.', 'Catálogo con fotos y precios.', 'Mensajes de bienvenida y ausencia.', 'Respuestas rápidas con atajos.', 'Capacitación de 20 min al personal.'],
    recurrente: 'Bot con IA y mantenimiento mensual ($300–$800/mes).',
  },
  {
    id: 'fotos-producto', tipo: 'digital', ideaId: 'foto-video-producto',
    nombre: 'Fotos de producto para tiendas',
    que: '15 fotos editadas con fondo limpio para redes, Mercado Libre o menú.',
    aQuien: 'Tiendas, pastelerías, joyería artesanal, vendedores de Mercado Libre.',
    precio: '$600–$1,200', precioBase: 800,
    guion: 'Sus productos se ven increíbles en persona pero en las fotos no les hacen justicia. Compré uno y le tomé esta foto de prueba: [foto]. Le hago 15 fotos editadas como esa por $[precio], entregadas en 48 h. ¿Le interesa?',
    entrega: ['Agenda con luz de día.', 'Montaje con cartulina y difusor.', '3 ángulos por producto.', 'Edición y fondos con IA.', 'Carpeta de Drive para redes, web y ML.'],
    recurrente: 'Sesión mensual de producto nuevo; paquete con redes.',
  },
  {
    id: 'logo-express', tipo: 'digital', ideaId: 'diseno-grafico',
    nombre: 'Logo simple + kit para redes',
    que: 'Logo en 3 versiones, paleta, foto de perfil y portada.',
    aQuien: 'Emprendedores nuevos, negocios con logo pixeleado, food trucks.',
    precio: '$800–$1,500', precioBase: 1000,
    guion: 'Vi que su logo [se ve pixeleado / no se lee en la foto de perfil]. Hago logos simples y legibles con kit para redes en 48 h por $[precio]. Le mando 2 propuestas antes de cobrar el resto. ¿Le interesa?',
    entrega: ['Brief de 10 min: estilo, colores, referencias.', '2 propuestas en Figma/Canva.', '1 ronda de ajustes.', 'Exporta PNG, SVG y versión para WhatsApp.', 'Portada y perfil para redes.'],
    recurrente: 'Diseño de posts mensual o paquete Negocio Nuevo.',
  },
  {
    id: 'redes-arranque', tipo: 'digital', ideaId: 'redes-sociales',
    nombre: 'Arranque de redes: 8 posts en 72 h',
    que: '8 publicaciones diseñadas + textos + programación en Meta Business Suite.',
    aQuien: 'Negocios con Instagram/Facebook abandonado.',
    precio: '$900–$1,500', precioBase: 1200,
    guion: 'Su Instagram tiene muy buen producto pero la última publicación fue hace [X semanas]. Le diseño y programo 8 publicaciones para las próximas 2 semanas por $[precio]; usted solo aprueba. Aquí 3 ejemplos con sus productos: [link]. ¿Le parece?',
    entrega: ['Pide fotos y productos a destacar.', 'Calendario de 8 posts con IA.', 'Diseño con plantilla de marca.', 'Aprobación en un solo mensaje.', 'Programa en Meta Business Suite.'],
    recurrente: 'Manejo mensual $2,000–$4,000.',
  },
  {
    id: 'agenda-express', tipo: 'digital', ideaId: 'agendas-online',
    nombre: 'Agenda en línea con recordatorios',
    que: 'Sistema de citas configurado, link en Instagram/Maps y capacitación.',
    aQuien: 'Barberías, estéticas, uñas, nutriólogos, psicólogos, consultorios.',
    precio: '$700–$1,500', precioBase: 900,
    guion: 'Para sacar cita con ustedes hay que mandar mensaje y esperar. Les instalo una agenda para que sus clientes reserven solos, hasta en la noche, con recordatorio automático para que no falten. Queda en 48 h por $[precio]. ¿Les armo un ejemplo con sus servicios?',
    entrega: ['Elige plataforma adecuada al presupuesto.', 'Configura servicios, duración y descansos.', 'Recordatorios y política de cancelación.', 'Link en IG, WhatsApp y Maps.', 'Capacitación + manual de 1 página.'],
    recurrente: 'Soporte $200–$400/mes; combinarlo con WhatsApp automatizado.',
  },
  {
    id: 'cv-linkedin', tipo: 'digital',
    nombre: 'CV + LinkedIn profesional',
    que: 'CV de 1 página optimizado y perfil de LinkedIn completo.',
    aQuien: 'Egresados, técnicos y operadores de la industria automotriz que buscan mejor puesto.',
    precio: '$300–$600', precioBase: 450,
    guion: '¿Estás buscando trabajo o un mejor puesto? Te hago un CV de 1 página que se lee en 10 segundos y te dejo LinkedIn completo, en 48 h por $[precio]. ¿Me mandas tu CV actual para darte ideas gratis?',
    entrega: ['Entrevista de 15 min sobre logros.', 'Redacta con IA y edita a mano.', 'Diseño limpio en Word/Google Docs.', 'Perfil LinkedIn: titular, acerca de, experiencia.', 'Versión PDF + editable.'],
    recurrente: 'Referidos de compañeros de trabajo; cartas de presentación por puesto.',
  },
  {
    id: 'presentaciones', tipo: 'digital',
    nombre: 'Presentaciones profesionales',
    que: 'Rediseño de presentación de hasta 12 láminas.',
    aQuien: 'Estudiantes universitarios, maestros, vendedores, supervisores de planta.',
    precio: '$400–$900', precioBase: 600,
    guion: '¿Tienes que presentar y tu PowerPoint se ve saturado? Lo rediseño para que se vea profesional y se entienda, en 24–48 h por $[precio]. Mándamelo y te digo qué cambiaría.',
    entrega: ['Recibe archivo y objetivo de la presentación.', 'Reestructura mensajes (1 idea por lámina).', 'Aplica diseño limpio y consistente.', 'Gráficas e iconos.', 'Entrega PPT + PDF.'],
    recurrente: 'Plantilla corporativa para equipos o empresas.',
  },
  {
    id: 'wifi-diagnostico', tipo: 'tecnico', ideaId: 'redes-wifi',
    nombre: 'Diagnóstico y arreglo de WiFi',
    que: 'Medición por cuarto, reubicación/configuración de router y repetidores.',
    aQuien: 'Casas de 2 pisos, home office, consultorios y locales con WiFi deficiente.',
    precio: '$350–$600', precioBase: 450,
    guion: '¿El WiFi no llega a todos los cuartos? Casi siempre se arregla con configuración y ubicación, no pagando más megas. Mido la señal cuarto por cuarto y lo dejo funcionando por $[precio] (equipo aparte si hace falta). ¿Te agendo?',
    entrega: ['Mide velocidad en cada área.', 'Cambia canal, banda y contraseña por defecto.', 'Reubica router o propone equipo.', 'Instala y configura repetidor/mesh.', 'Mide de nuevo y entrega reporte.'],
    recurrente: 'Soporte técnico mensual para negocios.',
  },
  {
    id: 'clase-celular', tipo: 'educacion', ideaId: 'clases-computacion',
    nombre: 'Clase de celular y seguridad para papás',
    que: '2 clases a domicilio: WhatsApp, videollamadas, banca segura y cómo evitar fraudes.',
    aQuien: 'Hijos adultos que quieren ayudar a sus papás o abuelos.',
    precio: '$300–$500', precioBase: 400,
    guion: 'Muchos papás y abuelos son blanco de fraudes por WhatsApp. Doy 2 clases a domicilio, con paciencia y guía impresa en letra grande, para que usen su celular con seguridad. Son $[precio]. ¿Le gustaría regalárselas a su mamá o papá?',
    entrega: ['Diagnóstico de lo que sabe y necesita.', 'Guía impresa hecha con IA.', 'Clase 1: lo básico + WhatsApp.', 'Clase 2: banca, fraudes, privacidad.', 'Tarjeta con pasos para repasar.'],
    recurrente: 'Paquetes mensuales o talleres grupales.',
  },
  {
    id: 'temporada-preventa', tipo: 'comercio', ideaId: 'temporada',
    nombre: 'Preventa de temporada',
    que: 'Levantar pedidos con anticipo de un producto de temporada y comprar solo lo vendido.',
    aQuien: 'Familia, escuela (con permiso) y vecinos antes de San Marcos, regreso a clases, Calaveras o Navidad.',
    precio: 'Margen 40–100%', precioBase: 500,
    guion: 'Ya viene [temporada] y todo se agota o sube a última hora. Estoy levantando pedidos de [producto] con entrega en Jesús María el [fecha]. Apartas con 50%. ¿Te aparto uno?',
    entrega: ['Cotiza a mayoristas.', 'Catálogo de WhatsApp en 1 hora.', 'Levanta pedidos con 50%.', 'Compra solo lo pre-vendido + 10%.', 'Entrega por zonas en un día.'],
    recurrente: 'Lista de clientes para cada temporada del año.',
  },
  {
    id: 'auditoria-digital', tipo: 'digital',
    nombre: 'Auditoría digital express (puerta de entrada)',
    que: 'Reporte PDF de 2 páginas: Google, redes, WhatsApp y web, con 5 acciones priorizadas.',
    aQuien: 'Cualquier PyME; sirve para abrir conversación y vender el servicio grande.',
    precio: '$0–$300', precioBase: 0,
    guion: 'Hago diagnósticos de presencia digital para negocios de Aguascalientes. En 24 h le mando un reporte de 2 páginas con lo que le falta en Google, redes y WhatsApp y las 5 cosas que yo arreglaría primero. Sin costo y sin compromiso. ¿Se lo preparo?',
    entrega: ['Revisa Maps, redes, web y tiempo de respuesta de WhatsApp.', 'Plantilla de reporte con calificación por área.', 'IA para redactar recomendaciones.', 'Envía PDF con tu marca LKM\'r.', 'Llamada de 10 min para explicar y ofrecer paquete.'],
    recurrente: 'Se convierte en cualquier servicio del catálogo.',
  },
  {
    id: 'thumbnails-pack', tipo: 'digital', ideaId: 'miniaturas',
    nombre: '4 miniaturas para YouTube',
    que: '4 miniaturas con 2 variantes cada una para prueba A/B.',
    aQuien: 'YouTubers de 1k–50k suscriptores con miniaturas débiles.',
    precio: '$400–$900', precioBase: 600,
    guion: 'Tu video "[título]" está muy bueno pero la miniatura no transmite la curiosidad. Te hice una versión alternativa gratis: [imagen]. Te hago 4 al mes con 2 variantes cada una por $[precio]. ¿La pruebas?',
    entrega: ['Pide fotos de cara en alta resolución.', '3 conceptos por video.', 'Diseño en Photopea con recorte IA.', '2 variantes por video.', 'Entrega PNG 1280×720.'],
    recurrente: 'Paquete mensual + edición de shorts.',
  },
  {
    id: 'excel-control', tipo: 'digital', ideaId: 'productos-digitales',
    nombre: 'Control de ventas en Google Sheets',
    que: 'Hoja a la medida: ventas, gastos, inventario básico y utilidad automática.',
    aQuien: 'Tiendas de abarrotes, papelerías, vendedores por catálogo, talleres.',
    precio: '$500–$1,200', precioBase: 700,
    guion: '¿Lleva sus ventas en libreta y a fin de mes no sabe cuánto ganó? Le hago una hoja en el celular donde anota cada venta y le calcula sola la utilidad, en 48 h por $[precio]. Le enseño a usarla en 15 minutos. ¿Le interesa?',
    entrega: ['Entiende qué anota hoy y cómo.', 'Construye hoja con validaciones y fórmulas (IA ayuda).', 'Dashboard simple con totales del mes.', 'Instala en su celular.', 'Capacitación + video corto.'],
    recurrente: 'Ajustes mensuales; luego se vuelve plantilla vendible.',
  },
]

export interface CategoriaLocal {
  id: string
  nombre: string
  donde: string
  dolor: string
  gancho: string
  ofertas: string[]
  mejorHora: string
}

export const MAPA_LOCAL: CategoriaLocal[] = [
  { id: 'restaurantes', nombre: 'Restaurantes, fondas y taquerías', donde: 'Centro de Jesús María, Av. Siglo XXI, Zona Centro de Ags, Av. Universidad, plazas comerciales.', dolor: 'Menú en PDF ilegible, fotos oscuras en apps de delivery, redes abandonadas.', gancho: 'Muéstrale su propio menú ya convertido a digital en tu celular.', ofertas: ['menu-qr-express', 'fotos-producto', 'gbp-express'], mejorHora: '10:00–12:00 o 16:00–18:00 (nunca en hora de comida).' },
  { id: 'barberias', nombre: 'Barberías, estéticas y uñas', donde: 'Colonias de Jesús María, Pocitos, Ojocaliente, Bosques del Prado.', dolor: 'Agendan por mensaje, pierden citas, no tienen reels.', gancho: 'Agenda de ejemplo con sus servicios y precios.', ofertas: ['agenda-express', 'reels-10', 'gbp-express'], mejorHora: 'Martes a jueves por la mañana.' },
  { id: 'consultorios', nombre: 'Consultorios (dentistas, médicos, nutriólogos, psicólogos)', donde: 'Zona de hospitales, Av. Aguascalientes, plazas médicas.', dolor: 'Sin página, agenda por llamada, pocas reseñas.', gancho: 'Landing de ejemplo con agenda y botón de WhatsApp.', ofertas: ['web-express', 'agenda-express', 'gbp-express'], mejorHora: 'Primera hora o entre pacientes; mejor mensaje + visita a recepción.' },
  { id: 'talleres', nombre: 'Talleres mecánicos, eléctricos y de hojalatería', donde: 'Carretera a Jesús María, Av. Convención, zonas industriales.', dolor: 'No aparecen en Maps, sin fotos, no saben cuánto ganan.', gancho: 'Captura de cómo aparece su competencia en Google y ellos no.', ofertas: ['gbp-express', 'excel-control', 'web-express'], mejorHora: 'Media mañana entre semana.' },
  { id: 'tiendas', nombre: 'Tiendas, boutiques y papelerías', donde: 'Centro de Jesús María, mercados, plazas.', dolor: 'Fotos de producto malas, sin catálogo en WhatsApp, control en libreta.', gancho: 'Foto profesional de uno de sus productos.', ofertas: ['fotos-producto', 'whatsapp-pro', 'excel-control'], mejorHora: '11:00–13:00.' },
  { id: 'gimnasios', nombre: 'Gimnasios, academias y escuelas de deporte/música', donde: 'Colonias residenciales, fraccionamientos nuevos de Jesús María.', dolor: 'Redes sin videos, cobros y asistencias en libreta, muchos mensajes repetidos.', gancho: '1 reel editado con su propio contenido.', ofertas: ['reels-10', 'whatsapp-pro', 'redes-arranque'], mejorHora: 'Horas valle (11:00–16:00).' },
  { id: 'inmobiliarias', nombre: 'Inmobiliarias y asesores', donde: 'Fraccionamientos nuevos, grupos de Facebook de bienes raíces de Ags.', dolor: 'Necesitan videos de propiedades y responder rápido a prospectos.', gancho: 'Reel de una de sus propiedades publicadas.', ofertas: ['reels-10', 'whatsapp-pro', 'web-express'], mejorHora: 'Mensaje por la mañana; ellos viven en el celular.' },
  { id: 'industria', nombre: 'Proveedores de la industria (automotriz y manufactura)', donde: 'Parques industriales de Ags y corredor hacia Jesús María; directorios de clústeres.', dolor: 'Sin sitio profesional ni bilingüe, presentaciones viejas.', gancho: 'Auditoría digital express con propuesta de sitio bilingüe.', ofertas: ['auditoria-digital', 'web-express', 'presentaciones'], mejorHora: 'Correo + LinkedIn martes a jueves; seguimiento por teléfono.' },
  { id: 'reposteria', nombre: 'Pastelerías y negocios por encargo', donde: 'Instagram y Marketplace locales, grupos de mamás.', dolor: 'Decenas de mensajes con las mismas preguntas; fotos caseras.', gancho: 'Mide su tiempo de respuesta escribiéndoles como cliente.', ofertas: ['whatsapp-pro', 'fotos-producto', 'logo-express'], mejorHora: 'Entre semana por la tarde.' },
  { id: 'familias', nombre: 'Familias, estudiantes y vecinos', donde: 'Tu colonia, escuela, grupos de WhatsApp de la colonia, familia.', dolor: 'PCs lentas, WiFi malo, cosas sin vender, exámenes.', gancho: 'Lista de precios en imagen para estados de WhatsApp.', ofertas: ['pc-mantenimiento', 'formateo-express', 'marketplace-consigna', 'asesoria-express'], mejorHora: 'Tardes y fines de semana.' },
]

export interface PasoSprint {
  id: string
  dia: string
  items: { id: string; texto: string }[]
}

export const SPRINTS: Record<TipoSprint, { nombre: string; meta: number; resumen: string; pasos: PasoSprint[] }> = {
  '72h': {
    nombre: 'Sprint 72 horas', meta: 1000,
    resumen: 'Dinero esta misma semana con algo que ya sabes hacer y gente que ya te conoce.',
    pasos: [
      { id: 'h1', dia: 'Hora 0–24', items: [
        { id: 'a', texto: 'Elige 1 oferta express que puedas entregar mañana' },
        { id: 'b', texto: 'Haz una imagen con oferta y precio para tu estado de WhatsApp' },
        { id: 'c', texto: 'Publícala en estados, Instagram y grupos de la colonia' },
        { id: 'd', texto: 'Escribe personalmente a 15 personas que te conocen' },
      ] },
      { id: 'h2', dia: 'Hora 24–48', items: [
        { id: 'a', texto: '15 mensajes más (negocios o conocidos de conocidos)' },
        { id: 'b', texto: 'Pide a 5 personas que compartan tu estado' },
        { id: 'c', texto: 'Cierra al menos 1 trabajo con anticipo' },
        { id: 'd', texto: 'Entrega el primer trabajo antes de lo prometido' },
      ] },
      { id: 'h3', dia: 'Hora 48–72', items: [
        { id: 'a', texto: 'Seguimiento a todos los que respondieron' },
        { id: 'b', texto: 'Pide testimonio + 2 referidos a cada cliente' },
        { id: 'c', texto: 'Registra todos los ingresos en Finanzas' },
        { id: 'd', texto: 'Anota qué mensaje funcionó mejor' },
      ] },
    ],
  },
  '7d': {
    nombre: 'Sprint 7 días', meta: 2500,
    resumen: 'Una semana de prospección intensa con una sola oferta, enfocada en negocios locales.',
    pasos: [
      { id: 'd1', dia: 'Día 1', items: [{ id: 'a', texto: 'Elige oferta y categoría del Mapa local' }, { id: 'b', texto: 'Lista de 40 prospectos en el CRM' }, { id: 'c', texto: 'Prepara 1 muestra especulativa' }] },
      { id: 'd2', dia: 'Día 2', items: [{ id: 'a', texto: '15 mensajes personalizados' }, { id: 'b', texto: '3 visitas en persona' }] },
      { id: 'd3', dia: 'Día 3', items: [{ id: 'a', texto: '15 mensajes más' }, { id: 'b', texto: 'Seguimientos del día 2' }, { id: 'c', texto: '1 cotización enviada' }] },
      { id: 'd4', dia: 'Día 4', items: [{ id: 'a', texto: '10 mensajes + 3 visitas' }, { id: 'b', texto: 'Cierra 1 trabajo con anticipo' }] },
      { id: 'd5', dia: 'Día 5', items: [{ id: 'a', texto: 'Entrega en menos de 48 h' }, { id: 'b', texto: 'Seguimientos pendientes' }] },
      { id: 'd6', dia: 'Día 6', items: [{ id: 'a', texto: 'Pide testimonio y referidos' }, { id: 'b', texto: 'Ofrece versión mensual al cliente' }] },
      { id: 'd7', dia: 'Día 7', items: [{ id: 'a', texto: 'Revisión: tasa de respuesta y cierre' }, { id: 'b', texto: 'Registra todo y aparta fondo de Vía Larga' }] },
    ],
  },
  '30d': {
    nombre: 'Sprint 30 días', meta: 5000,
    resumen: 'Convertir una oferta en sistema: volumen, mejora del mensaje y primeros clientes recurrentes.',
    pasos: [
      { id: 's1', dia: 'Semana 1 · Volumen', items: [{ id: 'a', texto: '10 contactos nuevos al día (50)' }, { id: 'b', texto: '2 trabajos cerrados' }, { id: 'c', texto: 'Contador de actividad lleno todos los días' }] },
      { id: 's2', dia: 'Semana 2 · Mensaje', items: [{ id: 'a', texto: 'Prueba 2 versiones de mensaje' }, { id: 'b', texto: 'Usa el Constructor de ofertas para mejorar tu oferta' }, { id: 'c', texto: '2 testimonios conseguidos' }] },
      { id: 's3', dia: 'Semana 3 · Cierre', items: [{ id: 'a', texto: '5 visitas o llamadas' }, { id: 'b', texto: 'Paquete de 3 niveles armado' }, { id: 'c', texto: 'Sube 15–20% el precio a clientes nuevos' }] },
      { id: 's4', dia: 'Semana 4 · Recurrencia', items: [{ id: 'a', texto: 'Ofrece mensualidad a todos los clientes' }, { id: 'b', texto: '1 cliente recurrente' }, { id: 'c', texto: 'Revisión mensual guiada' }] },
    ],
  },
}
