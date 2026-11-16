export const AVISO_FISCAL =
  'Guía general con fines educativos, no es asesoría fiscal. Las reglas del SAT cambian cada año: verifica siempre en sat.gob.mx o con un contador antes de decidir.'

export const AVISO_INVERSION =
  'Información educativa general, no es una recomendación de inversión. Antes de invertir, revisa la información oficial del instrumento y, si es necesario, consulta a un asesor independiente.'

export const EDU_FINANZAS = [
  {
    id: 'interes',
    titulo: 'Interés compuesto',
    texto: [
      'El interés compuesto es ganar intereses sobre tus intereses. Al principio parece lento; con años se acelera muchísimo.',
      'Lo que más pesa no es la tasa, es el TIEMPO y la CONSTANCIA de tus aportaciones. Empezar a los 18 es una ventaja enorme frente a empezar a los 30.',
      'La inflación reduce el poder de compra de tu dinero. Por eso conviene comparar el rendimiento contra la inflación, no solo ver el número.',
    ],
  },
  {
    id: 'emergencia',
    titulo: 'Fondo de emergencia',
    texto: [
      'Es dinero apartado SOLO para imprevistos: se descompuso tu laptop (tu herramienta de trabajo), un gasto médico, un mes sin clientes.',
      'Meta inicial: $5,000 MXN. Meta siguiente: 3 meses de tus gastos (o de los gastos del negocio). Meta madura: 6 meses.',
      'Debe estar disponible en 1–2 días y en un instrumento de bajo riesgo. No se invierte en nada volátil.',
      'Mientras no lo tengas completo, no inviertas en nada de riesgo.',
    ],
  },
  {
    id: 'bajo-riesgo',
    titulo: 'Inversión de bajo riesgo en México (explicación general)',
    texto: [
      'CETES son instrumentos de deuda emitidos por el Gobierno Federal; se consideran de los de menor riesgo en pesos. Puedes comprarlos directamente en cetesdirecto.com, con montos pequeños (revisa el mínimo vigente) y siendo mayor de edad con CURP, RFC/datos y cuenta bancaria.',
      'Hay plazos (28, 91, 182, 364 días) y opciones de reinversión automática. Cada plazo paga una tasa distinta que cambia en cada subasta.',
      'Otras opciones comunes son cuentas o productos de bancos y sofipos que pagan rendimiento. Compara siempre: tasa, liquidez (cuándo puedes sacar tu dinero), comisiones y si tiene seguro de depósito (IPAB para bancos; las sofipos tienen otro esquema de protección con límites). Verifica la institución en Condusef.',
      'Regla de oro: si te prometen un rendimiento muy por encima de lo que pagan los CETES "sin riesgo", desconfía.',
    ],
  },
  {
    id: 'presupuesto',
    titulo: 'Presupuesto y separación de cuentas',
    texto: [
      'Usa una cuenta para el negocio y otra personal, aunque sean dos cuentas digitales gratuitas.',
      'Págate un monto fijo cada mes del negocio a tu cuenta personal. Lo que sobra se queda en el negocio para crecer.',
      'Revisa tus números cada domingo en el Diario.',
    ],
  },
]

export const FORMALIZACION = [
  {
    titulo: '¿Cuándo sacar RFC?',
    puntos: [
      'Tienes 18 años: ya puedes inscribirte al RFC y emitir facturas como persona física.',
      'Señales de que ya conviene: tus clientes te piden factura; ganas de forma constante (Nivel 2–3); vendes en plataformas que retienen impuestos; trabajas con empresas.',
      'La inscripción básica se puede iniciar en línea en sat.gob.mx con tu CURP; para facturar necesitarás también tu Contraseña del SAT y la e.firma (se tramita con cita). Revisa los pasos vigentes.',
    ],
  },
  {
    titulo: 'Regímenes que podrían aplicarte (persona física)',
    puntos: [
      'RESICO (Régimen Simplificado de Confianza): pensado para personas con ingresos anuales bajos/medios (existe un tope anual; verifica el vigente). Paga ISR con tasas bajas sobre lo cobrado. Tiene requisitos y exclusiones.',
      'Actividades empresariales y profesionales: régimen general; permite deducir gastos. Puede convenir cuando tienes muchos gastos del negocio.',
      'Actividades a través de plataformas tecnológicas: si vendes o das servicios mediante apps/plataformas (Mercado Libre, apps de servicios, etc.), estas pueden retener ISR e IVA. Revisa cómo te afecta.',
      'Si eres empleado y además tienes ingresos propios, tu situación cambia: consulta a un contador.',
      'IVA: muchos servicios y ventas causan IVA. Dependiendo de tu régimen y tus clientes, tendrás que cobrarlo y declararlo.',
    ],
  },
  {
    titulo: 'Cómo facturar (CFDI)',
    puntos: [
      'El SAT ofrece un servicio gratuito de facturación en su portal; también existen proveedores (PAC) con apps más cómodas, de pago.',
      'Para facturar necesitas: RFC activo, régimen correcto, Contraseña o e.firma, y los datos fiscales de tu cliente (RFC, nombre, código postal fiscal, régimen y uso del CFDI).',
      'Emite la factura cuando cobres (o según tu régimen) y guarda todo ordenado por mes.',
    ],
  },
  {
    titulo: 'Obligaciones básicas',
    puntos: [
      'Declaraciones periódicas (normalmente mensuales) y anual, según régimen.',
      'Llevar registro de ingresos y gastos (el Centro Financiero te ayuda, pero no sustituye tu contabilidad).',
      'Si tienes empleados: alta patronal en el IMSS y obligaciones laborales.',
      'Un contador para personas físicas pequeñas suele cobrar una mensualidad accesible; vale la pena desde Nivel 3.',
    ],
  },
]
