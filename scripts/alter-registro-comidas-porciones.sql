-- Soporte de "porciones" en el registro de comidas (ej. "2 galletas Oreo (22 g)")
-- Ejecutar en Supabase SQL Editor

ALTER TABLE registro_comidas
  ADD COLUMN IF NOT EXISTS unidades numeric,
  ADD COLUMN IF NOT EXISTS gramos_por_unidad numeric;
