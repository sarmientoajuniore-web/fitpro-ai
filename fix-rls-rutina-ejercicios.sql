-- ════════════════════════════════════════════════════════════════════
-- ARREGLO: política RLS de UPDATE que falta en rutina_ejercicios
-- ════════════════════════════════════════════════════════════════════
--
-- Síntoma: mover un entreno de día ("Mover entreno") o reordenar ejercicios
-- parecía guardarse (la app mostraba el cambio) pero al recargar volvía atrás.
--
-- Causa: la tabla rutina_ejercicios tenía políticas de SELECT e INSERT, pero
-- NO una de UPDATE. Con RLS activo y sin política de UPDATE, PostgreSQL
-- rechaza en silencio todos los UPDATE (afectan 0 filas, sin error). Por eso
-- Supabase respondía "ok" pero no guardaba nada.
--
-- Verificado: UPDATE sobre rutina_ejercicios devolvía 200 con 0 filas; el mismo
-- UPDATE sobre la tabla rutinas devolvía 1 fila (esa sí tiene su política).
--
-- Cómo aplicarlo: pégalo en el SQL Editor de tu proyecto de Supabase y ejecútalo.
-- (Panel de Supabase → SQL Editor → New query → pegar → Run)
-- ════════════════════════════════════════════════════════════════════

-- Dueño de la rutina puede MODIFICAR sus ejercicios (mover de día, reordenar,
-- cambiar series/reps/descanso). Se comprueba que la rutina padre sea suya.
DROP POLICY IF EXISTS "rutina_ejercicios_update_propias" ON rutina_ejercicios;
CREATE POLICY "rutina_ejercicios_update_propias"
  ON rutina_ejercicios
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rutinas
      WHERE rutinas.id = rutina_ejercicios.rutina_id
        AND rutinas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rutinas
      WHERE rutinas.id = rutina_ejercicios.rutina_id
        AND rutinas.user_id = auth.uid()
    )
  );

-- Por si acaso, la misma política para DELETE (borrar un ejercicio de la rutina).
-- Si borrar ejercicios ya te funcionaba, esta línea no cambia nada; si no, lo arregla.
DROP POLICY IF EXISTS "rutina_ejercicios_delete_propias" ON rutina_ejercicios;
CREATE POLICY "rutina_ejercicios_delete_propias"
  ON rutina_ejercicios
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rutinas
      WHERE rutinas.id = rutina_ejercicios.rutina_id
        AND rutinas.user_id = auth.uid()
    )
  );

-- ── Comprobación rápida: ver las políticas que quedan en la tabla ──
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'rutina_ejercicios';
