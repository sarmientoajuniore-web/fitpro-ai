-- Sopas y caldos Maggi en la tabla local de alimentos.
--
-- Por qué local y no dejarlo en la búsqueda online:
-- Open Food Facts tiene el POLVO y la SOPA PREPARADA cargados con el mismo nombre
-- y valores 10x distintos (ej. "Crema De Tomate" existe a 348.7 y a 28.3 kcal/100g).
-- Buscando "sopa de pollo" salía la preparada (24 kcal) y registrar un sobre con ese
-- valor da un numero absurdo. Acá quedan solo las versiones en polvo, con el nombre
-- diciendo "(polvo)" para que no haya ambigüedad.
--
-- De dónde salen los valores: Open Food Facts, versiones en polvo. Para la sopa de
-- pollo con fideos hay dos entradas independientes que convergen (333.3 y 336.0 kcal;
-- proteína 11.4 y 12.9), así que se usa el promedio: el acuerdo entre dos fuentes
-- distintas es lo que da confianza en el número.
--
-- OJO — son valores del Maggi español/peruano, NO del chileno. Sirven como referencia
-- (el producto es equivalente), pero si aparece la etiqueta del sobre chileno de 70 g,
-- hay que reemplazarlos por los de la etiqueta.
--
-- Los valores son POR 100 g DE POLVO. Un sobre chileno de pollo son 70 g:
--   70 g x 3.35 kcal/g = ~234 kcal, ~8.5 g proteína, ~42 g carbos, ~2.6 g grasa.
--
-- Correr en: Supabase → SQL Editor. Es idempotente: se puede correr varias veces.

INSERT INTO alimentos (nombre, calorias_100g, proteina_100g, carbos_100g, grasas_100g)
SELECT * FROM (VALUES
  ('Sopa Maggi pollo con fideos (polvo)',        335.0, 12.2, 60.5,  3.7),
  ('Crema Maggi de tomate (polvo)',              348.7,  7.2, 68.4,  5.9),
  ('Crema Maggi de hongos (polvo)',              361.5,  7.7, 64.6,  9.2),
  ('Crema Maggi espinaca puerro (polvo)',        377.3, 10.0, 70.0,  6.4),
  ('Crema Maggi de mariscos (polvo)',            360.0, 13.8, 55.2,  9.6),
  ('Cubito Maggi sabor gallina',                 164.0,  5.7, 15.9,  8.6),
  ('Cubito Maggi sabor carne',                   257.0,  5.3, 16.6, 18.8)
) AS nuevos(nombre, calorias_100g, proteina_100g, carbos_100g, grasas_100g)
WHERE NOT EXISTS (
  SELECT 1 FROM alimentos a WHERE a.nombre = nuevos.nombre
);

-- Verificación: deben salir las 7 filas.
SELECT nombre, calorias_100g, proteina_100g, carbos_100g, grasas_100g,
       ROUND(calorias_100g * 0.7) AS kcal_sobre_70g
FROM alimentos
WHERE nombre ILIKE '%maggi%'
ORDER BY nombre;
