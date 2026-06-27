-- ════════════════════════════════════════════════════════════
-- BLOQUE 1: Cuestionario de gym en el perfil del usuario
-- ════════════════════════════════════════════════════════════

ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS nivel_gym            text,
  ADD COLUMN IF NOT EXISTS dias_entreno_semana  integer,
  ADD COLUMN IF NOT EXISTS lesiones             text[],
  ADD COLUMN IF NOT EXISTS cardio_preferido     text;

-- nivel_gym:           'principiante' | 'intermedio' | 'avanzado'
-- dias_entreno_semana: 2 | 3 | 4 | 5 | 6
-- lesiones:            ARRAY['espalda_baja','rodilla','hombro','muneca_codo','cuello']
--                      o ARRAY[]::text[] si no tiene ninguna
-- cardio_preferido:    'ninguno' | 'caminadora' | 'bicicleta' | 'eliptica' | 'exterior'


-- ════════════════════════════════════════════════════════════
-- BLOQUE 2: Tabla de plantillas de rutina (metadatos)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rutinas_plantilla (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          text        NOT NULL,
  descripcion     text,
  nivel           text        NOT NULL
                    CHECK (nivel IN ('principiante', 'intermedio', 'avanzado')),
  sexo            text        NOT NULL DEFAULT 'ambos'
                    CHECK (sexo IN ('hombre', 'mujer', 'ambos')),
  dias_semana     integer     NOT NULL
                    CHECK (dias_semana BETWEEN 2 AND 6),
  objetivo_rutina text        NOT NULL
                    CHECK (objetivo_rutina IN ('fuerza','hipertrofia','adelgazar','resistencia','general')),
  cardio_incluido boolean     DEFAULT false,
  activa          boolean     DEFAULT true,
  created_at      timestamptz DEFAULT now()
);


-- ════════════════════════════════════════════════════════════
-- BLOQUE 3: Ejercicios de cada plantilla
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rutina_plantilla_ejercicios (
  id                         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  rutina_plantilla_id        uuid    NOT NULL
                               REFERENCES rutinas_plantilla(id) ON DELETE CASCADE,
  dia_numero                 integer NOT NULL,
  nombre_dia                 text,
  ejercicio_id               uuid    REFERENCES ejercicios(id),
  nombre_ejercicio_fallback  text,
  orden                      integer NOT NULL,
  series                     integer NOT NULL,
  repeticiones               text    NOT NULL,
  descanso_segundos          integer DEFAULT 90,
  notas                      text,
  CONSTRAINT debe_tener_ejercicio
    CHECK (
      ejercicio_id IS NOT NULL
      OR nombre_ejercicio_fallback IS NOT NULL
    )
);


-- ════════════════════════════════════════════════════════════
-- BLOQUE 4: Índices + Row Level Security
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_rutinas_plantilla_filtro
  ON rutinas_plantilla (nivel, sexo, dias_semana)
  WHERE activa = true;

CREATE INDEX IF NOT EXISTS idx_rpe_plantilla_dia_orden
  ON rutina_plantilla_ejercicios (rutina_plantilla_id, dia_numero, orden);

ALTER TABLE rutinas_plantilla            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutina_plantilla_ejercicios  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plantillas_lectura_autenticados"
  ON rutinas_plantilla
  FOR SELECT TO authenticated
  USING (activa = true);

CREATE POLICY "plantilla_ejercicios_lectura_autenticados"
  ON rutina_plantilla_ejercicios
  FOR SELECT TO authenticated
  USING (true);
