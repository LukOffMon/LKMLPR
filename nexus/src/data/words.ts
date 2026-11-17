/** Sustantivos concretos e imaginables (palacio de la memoria). */
export const CONCRETE = `elefante paraguas trompeta volcán sandía cohete pingüino guitarra castillo diamante tiburón bicicleta reloj corona cactus
mariposa linterna ancla tambor pirámide caracol helicóptero calabaza espada faro dinosaurio globo submarino tijeras martillo
plátano escalera telescopio cebra bombilla anillo canoa cangrejo violín tortuga sombrero molino zanahoria tren pulpo
avestruz chimenea brújula llave nube iglú jirafa mapa piña robot campana dragón fresa abanico hacha imán koala
lámpara medusa nido ojo paleta queso rayo sirena tenedor unicornio vela yate zapato acordeón bufanda camello dado
erizo fuente gorila hamaca isla jarrón kayak león maleta nevera olla pelota rinoceronte sartén tijera uva vaca
yoyó ballena bota canguro escoba flamenco granada hormiga iguana jabón lupa mono naranja ostra payaso rana`
  .split(/\s+/)
  .filter(Boolean);

/** Lista curada y limpia para anagramas (palabras reales completas). */
export const ANAGRAMS: string[][] = [
  ['casa', 'mesa', 'gato', 'luna', 'sapo', 'rojo', 'nube', 'lago', 'piel', 'vino', 'tren', 'flor', 'mapa', 'pato', 'roca', 'sopa', 'toro', 'vaso', 'hilo', 'pera'],
  ['perro', 'libro', 'campo', 'playa', 'fuego', 'verde', 'noche', 'mundo', 'barco', 'cielo', 'piano', 'tigre', 'arena', 'reloj', 'pluma', 'fruta', 'llave', 'nieve', 'carta', 'queso'],
  ['camino', 'planta', 'puerta', 'tomate', 'cuerpo', 'pájaro', 'música', 'madera', 'puente', 'castor', 'ciudad', 'tierra', 'fiesta', 'sombra', 'espejo', 'cabeza', 'piedra', 'abuelo', 'cocina', 'viento'],
  ['montaña', 'caballo', 'ventana', 'naranja', 'zapatos', 'ballena', 'tortuga', 'familia', 'cerebro', 'memoria', 'palabra', 'domingo', 'galleta', 'pintura', 'cuchara', 'lechuga', 'botella', 'mercado', 'cometas', 'regalos'],
  ['elefante', 'mariposa', 'pingüino', 'estrella', 'cuaderno', 'teléfono', 'escalera', 'sandalia', 'chaqueta', 'pimienta', 'calabaza', 'tormenta', 'semillas', 'guitarra', 'camiseta', 'castillo', 'gigantes', 'medicina', 'pantalla', 'leopardo'],
  ['bicicleta', 'chocolate', 'lagartija', 'serpiente', 'ordenador', 'zanahoria', 'aventuras', 'cocodrilo', 'periódico', 'triángulo', 'escritura', 'mandarina', 'tiburones', 'esmeralda', 'sacerdote', 'navegante', 'cristales', 'mapamundi', 'bailarina', 'proyector'],
];

export const CATEGORIES: { name: string; words: string[] }[] = [
  { name: 'Animales', words: 'perro gato león tigre elefante jirafa cebra caballo vaca oveja cabra cerdo conejo ratón rata ardilla zorro lobo oso panda koala canguro mono gorila chimpancé delfín ballena tiburón pulpo calamar cangrejo langosta camarón pez trucha salmón atún águila halcón búho loro paloma gorrión pato ganso gallina gallo pavo avestruz pingüino flamenco cisne serpiente lagarto iguana cocodrilo tortuga rana sapo abeja avispa hormiga mosca mosquito mariposa escarabajo araña escorpión caracol gusano murciélago camello llama alpaca hipopótamo rinoceronte búfalo ciervo alce reno castor nutria foca morsa erizo topo hiena leopardo jaguar puma lince guepardo mapache tejón comadreja hurón burro mula bisonte antílope gacela'.split(' ') },
  { name: 'Frutas y verduras', words: 'manzana pera plátano naranja limón mandarina uva fresa frambuesa mora arándano cereza ciruela melocotón durazno albaricoque mango papaya piña sandía melón kiwi coco granada higo dátil aguacate tomate lechuga zanahoria patata papa cebolla ajo pimiento pepino calabacín berenjena calabaza brócoli coliflor col repollo espinaca acelga apio puerro rábano remolacha nabo alcachofa espárrago maíz guisante judía haba lenteja garbanzo champiñón seta jengibre batata boniato guayaba maracuyá lima pomelo membrillo níspero chirimoya caqui frambuesa grosella'.split(' ') },
  { name: 'Profesiones', words: 'médico médica enfermero enfermera profesor profesora maestro abogado juez ingeniero arquitecto carpintero electricista fontanero albañil mecánico piloto azafata bombero policía soldado cocinero chef camarero panadero carnicero pescadero agricultor ganadero pescador veterinario dentista farmacéutico psicólogo periodista escritor poeta pintor escultor músico cantante actor actriz bailarín fotógrafo diseñador programador científico biólogo químico físico astronauta astrónomo economista contable banquero vendedor cajero taxista conductor camionero cartero barbero peluquero sastre zapatero joyero relojero bibliotecario traductor intérprete guía secretario recepcionista jardinero florista notario alcalde diplomático'.split(' ') },
  { name: 'Objetos de la cocina', words: 'olla sartén cazo cuchillo tenedor cuchara cucharón espátula batidora licuadora tostadora microondas horno nevera congelador fregadero grifo plato vaso taza copa jarra tetera cafetera exprimidor rallador colador tabla bol cuenco bandeja mantel servilleta delantal guante abrelatas sacacorchos mortero rodillo molde embudo termo tapa estropajo lavavajillas campana fogón vitrocerámica especiero salero pimentero aceitera paellera wok cazuela'.split(' ') },
  { name: 'Países', words: 'españa méxico argentina chile perú colombia venezuela ecuador bolivia paraguay uruguay brasil cuba panamá honduras guatemala nicaragua salvador francia italia alemania portugal inglaterra irlanda escocia holanda bélgica suiza austria polonia rusia ucrania grecia turquía egipto marruecos argelia túnez nigeria kenia etiopía sudáfrica china japón corea india pakistán tailandia vietnam indonesia filipinas australia canadá noruega suecia finlandia dinamarca islandia hungría rumanía bulgaria croacia serbia irán irak israel jordania líbano siria arabia qatar mongolia nepal'.split(' ') },
  { name: 'Cosas que vuelan', words: 'avión helicóptero cohete globo cometa dron pájaro águila mariposa abeja mosca mosquito murciélago paloma hoja pluma burbuja nave satélite avioneta planeador parapente paracaídas zepelín dirigible libélula polilla avispa gaviota golondrina halcón loro meteorito confeti papel humo ceniza polen semilla diente-de-león frisbi bumerán flecha'.split(' ') },
];

/** Vocabulario avanzado en español. */
export const VOCAB: [string, string][] = [
  ['efímero', 'Que dura muy poco tiempo'], ['perspicaz', 'Que percibe con agudeza lo que no es evidente'], ['inefable', 'Que no se puede expresar con palabras'], ['ubicuo', 'Que está presente en todas partes a la vez'], ['soslayar', 'Evitar o eludir una dificultad'],
  ['acérrimo', 'Muy firme, tenaz o intransigente'], ['prolijo', 'Largo y detallado en exceso; también esmerado'], ['locuaz', 'Que habla mucho'], ['taciturno', 'Callado, silencioso, melancólico'], ['ecuánime', 'Que tiene igualdad de ánimo e imparcialidad'],
  ['dilucidar', 'Aclarar y explicar un asunto'], ['exacerbar', 'Agravar o avivar un sentimiento o un mal'], ['vehemente', 'Que actúa con ímpetu y pasión'], ['parsimonia', 'Lentitud y calma en la forma de actuar'], ['resiliencia', 'Capacidad de adaptarse y superar la adversidad'],
  ['pusilánime', 'Falto de ánimo y valor'], ['conspicuo', 'Ilustre, sobresaliente, visible'], ['sempiterno', 'Que durará siempre'], ['diáfano', 'Claro, transparente, limpio'], ['abyecto', 'Despreciable, vil en extremo'],
  ['incólume', 'Sano, sin daño'], ['inexorable', 'Que no se puede evitar ni detener'], ['vetusto', 'Extremadamente viejo, antiguo'], ['zalamero', 'Que adula con demostraciones de cariño'], ['obsecuente', 'Excesivamente obediente o sumiso'],
  ['petulante', 'Presuntuoso, engreído'], ['mordaz', 'Que critica con ironía hiriente'], ['lacónico', 'Breve y conciso al hablar o escribir'], ['ínclito', 'Ilustre, esclarecido'], ['procaz', 'Desvergonzado, atrevido'],
  ['acucioso', 'Diligente, solícito, cuidadoso'], ['denuedo', 'Brío, esfuerzo, valor'], ['dicotomía', 'División en dos partes opuestas'], ['elucubrar', 'Reflexionar profundamente; especular sin fundamento'], ['empatía', 'Capacidad de ponerse en el lugar del otro'],
  ['fehaciente', 'Que prueba o da fe de algo de forma indudable'], ['galimatías', 'Lenguaje oscuro y confuso'], ['hilarante', 'Que provoca risa'], ['idiosincrasia', 'Rasgos y carácter propios de una persona o colectivo'], ['jactancia', 'Alabanza presuntuosa de uno mismo'],
  ['languidecer', 'Perder el vigor, debilitarse'], ['meticuloso', 'Muy cuidadoso en los detalles'], ['nimio', 'Insignificante, sin importancia'], ['ostentoso', 'Que se exhibe con lujo y vanidad'], ['paradigma', 'Modelo o ejemplo que sirve de referencia'],
  ['quimera', 'Ilusión imposible, fantasía'], ['recóndito', 'Muy escondido, oculto'], ['sagaz', 'Astuto y prudente, que prevé'], ['tergiversar', 'Dar una interpretación forzada o errónea'], ['utopía', 'Proyecto ideal irrealizable'],
  ['vicisitud', 'Cambio o alternancia de sucesos favorables y adversos'], ['yuxtaponer', 'Poner una cosa junto a otra'], ['zozobra', 'Inquietud, aflicción, angustia'], ['ataraxia', 'Imperturbabilidad, serenidad del ánimo'], ['serendipia', 'Hallazgo valioso que se produce de forma accidental'],
  ['epítome', 'Ejemplo perfecto o resumen de algo'], ['otrora', 'En otro tiempo'], ['bonhomía', 'Afabilidad, sencillez, bondad'], ['ignoto', 'No conocido ni descubierto'], ['inocuo', 'Que no hace daño'],
  ['lóbrego', 'Oscuro, tenebroso, triste'], ['mendaz', 'Mentiroso'], ['egregio', 'Insigne, ilustre'], ['fútil', 'De poco aprecio o importancia'], ['óbice', 'Obstáculo, estorbo'],
  ['prístino', 'Antiguo, original; puro y sin alterar'], ['reticente', 'Que muestra reserva o desconfianza'], ['subrepticio', 'Que se hace a escondidas'], ['vilipendiar', 'Despreciar, denigrar'], ['acuciante', 'Urgente, apremiante'],
];

/** Asociaciones remotas: tres pistas y la palabra que conecta (con alternativas aceptadas). */
export const RAT: { cues: [string, string, string]; a: string[]; level: number }[] = [
  { cues: ['rueda', 'volante', 'motor'], a: ['coche', 'auto', 'carro', 'automóvil'], level: 1 },
  { cues: ['hoja', 'tronco', 'raíz'], a: ['árbol', 'arbol'], level: 1 },
  { cues: ['ola', 'arena', 'sombrilla'], a: ['playa'], level: 1 },
  { cues: ['tecla', 'cola', 'pedal'], a: ['piano'], level: 2 },
  { cues: ['abeja', 'oso', 'panal'], a: ['miel'], level: 1 },
  { cues: ['luna', 'año', 'verde'], a: ['luz'], level: 3 },
  { cues: ['pie', 'cama', 'mesa'], a: ['pata', 'patas'], level: 3 },
  { cues: ['cuello', 'botella', 'embudo'], a: ['cuello de botella', 'boca', 'estrecho'], level: 4 },
  { cues: ['mar', 'pez', 'sal'], a: ['agua', 'océano'], level: 2 },
  { cues: ['gato', 'cola', 'queso'], a: ['ratón', 'raton'], level: 2 },
  { cues: ['reloj', 'aguja', 'brújula'], a: ['norte', 'dirección', 'aguja'], level: 4 },
  { cues: ['pluma', 'peso', 'gallo'], a: ['boxeo', 'categoría'], level: 5 },
  { cues: ['puerta', 'piano', 'música'], a: ['llave', 'clave', 'tecla'], level: 4 },
  { cues: ['corona', 'trono', 'palacio'], a: ['rey', 'reina'], level: 1 },
  { cues: ['café', 'té', 'plato'], a: ['taza'], level: 2 },
  { cues: ['ojo', 'huracán', 'agua'], a: ['ojo', 'centro', 'remolino'], level: 5 },
  { cues: ['estrella', 'cine', 'rock'], a: ['estrella', 'famoso', 'fama'], level: 4 },
  { cues: ['tierra', 'temblor', 'placa'], a: ['terremoto', 'sismo'], level: 3 },
  { cues: ['papel', 'pared', 'tijera'], a: ['papel', 'recortar', 'cortar'], level: 5 },
  { cues: ['banco', 'parque', 'sentar'], a: ['asiento', 'banco'], level: 3 },
  { cues: ['cebra', 'peatón', 'semáforo'], a: ['paso', 'paso de cebra', 'calle'], level: 3 },
  { cues: ['tinta', 'pulpo', 'calamar'], a: ['tinta', 'mar', 'cefalópodo'], level: 3 },
  { cues: ['araña', 'internet', 'pescador'], a: ['red'], level: 2 },
  { cues: ['cadena', 'eslabón', 'ancla'], a: ['barco', 'hierro', 'metal'], level: 4 },
  { cues: ['nieve', 'zanahoria', 'bufanda'], a: ['muñeco de nieve', 'muñeco'], level: 2 },
  { cues: ['caja', 'música', 'bailarina'], a: ['caja de música', 'joyero', 'cajita'], level: 4 },
  { cues: ['diente', 'león', 'flor'], a: ['diente de león', 'diente'], level: 4 },
  { cues: ['salvavidas', 'chaleco', 'socorrista'], a: ['piscina', 'agua', 'mar', 'playa', 'rescate'], level: 3 },
  { cues: ['bolsillo', 'cocina', 'reloj'], a: ['de bolsillo', 'reloj', 'manecilla', 'tiempo'], level: 5 },
  { cues: ['moneda', 'cara', 'cruz'], a: ['moneda', 'dinero', 'azar', 'suerte'], level: 3 },
  { cues: ['negro', 'tiza', 'aula'], a: ['pizarra', 'escuela'], level: 2 },
  { cues: ['huevo', 'nido', 'pluma'], a: ['pájaro', 'ave', 'pajaro'], level: 1 },
  { cues: ['lluvia', 'colores', 'cielo'], a: ['arcoíris', 'arcoiris', 'arco iris'], level: 1 },
  { cues: ['cerradura', 'llavero', 'abrir'], a: ['llave'], level: 1 },
  { cues: ['cordillera', 'cima', 'escalar'], a: ['montaña', 'monte'], level: 1 },
  { cues: ['marea', 'eclipse', 'cráter'], a: ['luna'], level: 2 },
  { cues: ['torre', 'alfil', 'caballo'], a: ['ajedrez'], level: 2 },
  { cues: ['ceniza', 'lava', 'erupción'], a: ['volcán', 'volcan'], level: 1 },
  { cues: ['sello', 'sobre', 'buzón'], a: ['carta', 'correo'], level: 1 },
  { cues: ['tela', 'hilo', 'aguja'], a: ['coser', 'costura', 'bordado'], level: 2 },
  { cues: ['diente', 'ajo', 'cabeza'], a: ['ajo'], level: 4 },
  { cues: ['cuerda', 'violín', 'arco'], a: ['violín', 'violin', 'instrumento'], level: 3 },
  { cues: ['granizo', 'trueno', 'relámpago'], a: ['tormenta'], level: 1 },
  { cues: ['brazo', 'río', 'mar'], a: ['brazo', 'desembocadura', 'delta'], level: 5 },
];

export const LATERAL: { q: string; a: string; keys: string[]; hint: string }[] = [
  { q: 'Un hombre empuja su coche hasta un hotel y en ese momento sabe que está arruinado. ¿Qué ha pasado?', a: 'Está jugando al Monopoly.', keys: ['monopoly', 'juego de mesa', 'tablero'], hint: 'No es un coche de verdad.' },
  { q: '¿Qué tiene agujas pero no pincha?', a: 'Un reloj.', keys: ['reloj'], hint: 'Marca algo que nunca se detiene.' },
  { q: 'Un hombre vive en el piso 20. Cada mañana baja en ascensor hasta la planta baja. Al volver, sube en ascensor hasta el 10 y el resto a pie, salvo los días de lluvia. ¿Por qué?', a: 'Es de baja estatura: solo alcanza el botón del 10, salvo cuando lleva paraguas.', keys: ['bajo', 'baja estatura', 'no alcanza', 'paraguas', 'enano', 'pequeño', 'niño'], hint: 'El paraguas le sirve para algo más que la lluvia.' },
  { q: 'Cuanto más le quitas, más grande se hace. ¿Qué es?', a: 'Un agujero.', keys: ['agujero', 'hoyo', 'pozo'], hint: 'Piensa en cavar.' },
  { q: 'Una mujer dispara a su marido, lo mantiene bajo el agua cinco minutos y luego lo cuelga. Una hora después salen a cenar juntos. ¿Cómo es posible?', a: 'Es fotógrafa: le hizo una foto, la reveló y la colgó a secar.', keys: ['foto', 'fotografía', 'fotógrafa', 'revelar'], hint: '«Disparar» tiene más de un significado.' },
  { q: '¿Qué se rompe al nombrarlo?', a: 'El silencio.', keys: ['silencio'], hint: 'Basta con decir su nombre en voz alta.' },
  { q: 'Dos padres y dos hijos van de pesca. Pescan tres peces y cada uno se lleva uno. ¿Cómo es posible?', a: 'Son tres personas: abuelo, padre e hijo.', keys: ['abuelo', 'tres personas', '3 personas'], hint: 'Alguien puede ser padre e hijo a la vez.' },
  { q: 'Un hombre entra en un bar y pide un vaso de agua. El camarero le apunta con una pistola. El hombre dice «gracias» y se va. ¿Qué pasó?', a: 'Tenía hipo; el susto se lo quitó.', keys: ['hipo'], hint: 'Quería curarse de algo.' },
  { q: '¿Qué tiene ciudades pero no casas, montañas pero no árboles y agua pero no peces?', a: 'Un mapa.', keys: ['mapa'], hint: 'Es una representación.' },
  { q: 'Si me tienes, quieres compartirme. Si me compartes, ya no me tienes. ¿Qué soy?', a: 'Un secreto.', keys: ['secreto'], hint: 'Se guarda.' },
  { q: 'Un niño y su padre sufren un accidente. En el hospital, la persona que va a operar dice: «No puedo operarlo, es mi hijo». ¿Quién es?', a: 'Su madre, que es cirujana.', keys: ['madre', 'mamá', 'mama', 'cirujana'], hint: 'Revisa tus suposiciones sobre la profesión.' },
  { q: '¿Qué palabra se escribe mal en todos los diccionarios?', a: '«Mal».', keys: ['mal'], hint: 'La respuesta está en la propia pregunta.' },
  { q: 'Un hombre murió de viejo el día de su quinto cumpleaños. ¿Cómo?', a: 'Nació un 29 de febrero.', keys: ['29 de febrero', 'bisiesto', '29 febrero'], hint: 'Piensa en el calendario.' },
  { q: '¿Qué sube y baja pero nunca se mueve?', a: 'Una escalera (o la temperatura).', keys: ['escalera', 'temperatura'], hint: 'La usas para ir de un piso a otro.' },
  { q: 'Un hombre está en mitad del desierto, muerto, con un paquete sin abrir a su lado. ¿Qué pasó?', a: 'El paracaídas del paquete no se abrió.', keys: ['paracaídas', 'paracaidas'], hint: 'Llegó desde el cielo.' },
  { q: 'Tengo llaves pero no abro cerraduras; tengo espacio pero no habitaciones. ¿Qué soy?', a: 'Un teclado.', keys: ['teclado'], hint: 'Lo usas para escribir.' },
  { q: 'Romeo y Julieta yacen muertos en el suelo, rodeados de agua y cristales rotos. ¿Qué pasó?', a: 'Son peces: su pecera se cayó y se rompió.', keys: ['peces', 'pecera', 'pez'], hint: 'No son personas.' },
  { q: '¿Qué puedes atrapar pero nunca lanzar?', a: 'Un resfriado.', keys: ['resfriado', 'catarro', 'gripe', 'resfrío'], hint: 'Te hace estornudar.' },
  { q: 'Un camión queda atascado bajo un puente bajo. Los bomberos no saben qué hacer. Un niño da la solución. ¿Cuál?', a: 'Desinflar un poco las ruedas.', keys: ['desinflar', 'ruedas', 'neumáticos', 'aire'], hint: 'Hay que hacer el camión más bajo.' },
  { q: 'Lo que es mío pero lo usan los demás más que yo. ¿Qué es?', a: 'Mi nombre.', keys: ['nombre'], hint: 'Te llaman con él.' },
];
