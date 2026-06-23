import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.local')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ejercicios = [
  {
    nombre: 'Press de banca con barra',
    descripcion: 'Ejercicio compuesto para desarrollar el pectoral mayor, tríceps y deltoides anterior.',
    grupo_muscular: 'Pecho',
    equipo: 'Barra',
    dificultad: 'Intermedio',
    instrucciones: 'Acuéstate en el banco, agarra la barra con agarre prono a la anchura de los hombros. Baja la barra al pecho de forma controlada y empuja hasta extender los codos.',
    imagen_url: null,
    video_url: null,
  },
  {
    nombre: 'Fondos en paralelas',
    descripcion: 'Ejercicio de peso corporal que trabaja el pectoral inferior, tríceps y deltoides anterior.',
    grupo_muscular: 'Pecho',
    equipo: 'Peso corporal',
    dificultad: 'Intermedio',
    instrucciones: 'Sujétate en las paralelas con los brazos extendidos. Inclina el torso ligeramente hacia adelante y baja doblando los codos hasta que los hombros estén al nivel de los codos. Empuja para volver arriba.',
    imagen_url: null,
    video_url: null,
  },
  {
    nombre: 'Dominadas',
    descripcion: 'Ejercicio compuesto de jalón vertical que trabaja el dorsal ancho, bíceps y romboides.',
    grupo_muscular: 'Espalda',
    equipo: 'Peso corporal',
    dificultad: 'Intermedio',
    instrucciones: 'Cuelga de la barra con agarre prono, manos separadas a la anchura de los hombros. Tira del cuerpo hacia arriba hasta que la barbilla supere la barra, luego baja de forma controlada.',
    imagen_url: null,
    video_url: null,
  },
  {
    nombre: 'Remo con barra',
    descripcion: 'Movimiento de jalón horizontal que fortalece el dorsal, romboides, trapecios medio e inferior y bíceps.',
    grupo_muscular: 'Espalda',
    equipo: 'Barra',
    dificultad: 'Intermedio',
    instrucciones: 'Con el torso inclinado a 45°, agarra la barra con agarre prono. Tira de la barra hacia el abdomen manteniendo los codos pegados al cuerpo. Contrae la espalda en la parte superior y baja de forma controlada.',
    imagen_url: null,
    video_url: null,
  },
  {
    nombre: 'Sentadilla con barra',
    descripcion: 'Ejercicio rey del tren inferior: activa cuádriceps, glúteos, isquiotibiales y core.',
    grupo_muscular: 'Piernas',
    equipo: 'Barra',
    dificultad: 'Intermedio',
    instrucciones: 'Coloca la barra sobre los trapecios, pies a la anchura de los hombros. Baja doblando rodillas y caderas hasta que los muslos queden paralelos al suelo, luego empuja hacia arriba manteniendo el pecho erguido.',
    imagen_url: null,
    video_url: null,
  },
  {
    nombre: 'Peso muerto convencional',
    descripcion: 'Movimiento de cadena posterior completa: isquiotibiales, glúteos, erectores espinales y trapecios.',
    grupo_muscular: 'Piernas',
    equipo: 'Barra',
    dificultad: 'Avanzado',
    instrucciones: 'Párate frente a la barra con pies a la anchura de la cadera. Agáchate manteniendo la espalda recta, agarra la barra y empuja el suelo para levantarte. Extiende caderas y rodillas de forma simultánea.',
    imagen_url: null,
    video_url: null,
  },
  {
    nombre: 'Press militar con barra',
    descripcion: 'Empuje vertical que desarrolla los deltoides en las tres cabezas, tríceps y trapecios superiores.',
    grupo_muscular: 'Hombros',
    equipo: 'Barra',
    dificultad: 'Intermedio',
    instrucciones: 'De pie, agarra la barra frente a los hombros con agarre prono. Empuja la barra hacia arriba hasta extender los codos por encima de la cabeza. Baja de forma controlada hasta el mentón.',
    imagen_url: null,
    video_url: null,
  },
  {
    nombre: 'Elevaciones laterales con mancuernas',
    descripcion: 'Aislamiento del deltoides medio para ampliar los hombros y mejorar la forma en V.',
    grupo_muscular: 'Hombros',
    equipo: 'Mancuernas',
    dificultad: 'Principiante',
    instrucciones: 'De pie con una mancuerna en cada mano a los costados. Sube los brazos lateralmente hasta la altura de los hombros manteniendo una ligera flexión en el codo. Baja de forma controlada.',
    imagen_url: null,
    video_url: null,
  },
  {
    nombre: 'Plancha frontal',
    descripcion: 'Ejercicio isométrico que fortalece el core completo: transverso abdominal, oblicuos y erectores.',
    grupo_muscular: 'Core',
    equipo: 'Peso corporal',
    dificultad: 'Principiante',
    instrucciones: 'Apóyate en antebrazos y puntas de los pies, formando una línea recta de cabeza a talones. Contrae el abdomen y los glúteos. Mantén la posición sin dejar caer las caderas ni elevarlas.',
    imagen_url: null,
    video_url: null,
  },
  {
    nombre: 'Crunch abdominal',
    descripcion: 'Ejercicio de aislamiento para el recto abdominal que trabaja la flexión del tronco.',
    grupo_muscular: 'Core',
    equipo: 'Peso corporal',
    dificultad: 'Principiante',
    instrucciones: 'Acuéstate boca arriba con rodillas dobladas y pies apoyados. Coloca las manos detrás de la nuca. Flexiona el tronco elevando los hombros del suelo sin tirar del cuello. Contrae el abdomen en la parte alta.',
    imagen_url: null,
    video_url: null,
  },
]

async function seed() {
  console.log('Insertando ejercicios...')

  const { data, error } = await supabase
    .from('ejercicios')
    .insert(ejercicios)
    .select('id, nombre, grupo_muscular')

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${data.length} ejercicios insertados:`)
  data.forEach(e => console.log(`  • [${e.grupo_muscular}] ${e.nombre}`))
}

seed()
