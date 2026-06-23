-- Actualización de valores nutricionales por 100g (fuente: USDA FoodData Central)
-- Ejecutar en Supabase SQL Editor

-- PROTEÍNAS ANIMALES
UPDATE alimentos SET calorias_100g = 155, proteina_100g = 13, carbos_100g = 1,  grasas_100g = 11 WHERE nombre ILIKE '%huevo%';
UPDATE alimentos SET calorias_100g = 165, proteina_100g = 31, carbos_100g = 0,  grasas_100g = 4  WHERE nombre ILIKE '%pechuga%pollo%' OR nombre ILIKE '%pollo%pechuga%';
UPDATE alimentos SET calorias_100g = 239, proteina_100g = 27, carbos_100g = 0,  grasas_100g = 14 WHERE nombre ILIKE '%muslo%pollo%' OR nombre ILIKE '%pollo%muslo%';
UPDATE alimentos SET calorias_100g = 120, proteina_100g = 22, carbos_100g = 0,  grasas_100g = 3  WHERE nombre ILIKE '%pollo%' AND nombre NOT ILIKE '%pechuga%' AND nombre NOT ILIKE '%muslo%';
UPDATE alimentos SET calorias_100g = 135, proteina_100g = 30, carbos_100g = 0,  grasas_100g = 1  WHERE nombre ILIKE '%pavo%';
UPDATE alimentos SET calorias_100g = 271, proteina_100g = 26, carbos_100g = 0,  grasas_100g = 18 WHERE nombre ILIKE '%carne%res%' OR nombre ILIKE '%res%molida%' OR nombre ILIKE '%carne molida%';
UPDATE alimentos SET calorias_100g = 250, proteina_100g = 26, carbos_100g = 0,  grasas_100g = 15 WHERE nombre ILIKE '%lomo%res%' OR nombre ILIKE '%bistec%';
UPDATE alimentos SET calorias_100g = 242, proteina_100g = 27, carbos_100g = 0,  grasas_100g = 14 WHERE nombre ILIKE '%cerdo%' OR nombre ILIKE '%lomo%cerdo%';
UPDATE alimentos SET calorias_100g = 116, proteina_100g = 26, carbos_100g = 0,  grasas_100g = 1  WHERE nombre ILIKE '%atun%agua%' OR (nombre ILIKE '%atun%' AND nombre NOT ILIKE '%aceite%');
UPDATE alimentos SET calorias_100g = 200, proteina_100g = 26, carbos_100g = 0,  grasas_100g = 9  WHERE nombre ILIKE '%atun%aceite%';
UPDATE alimentos SET calorias_100g = 208, proteina_100g = 20, carbos_100g = 0,  grasas_100g = 13 WHERE nombre ILIKE '%salmon%';
UPDATE alimentos SET calorias_100g = 82,  proteina_100g = 18, carbos_100g = 0,  grasas_100g = 1  WHERE nombre ILIKE '%tilapia%';
UPDATE alimentos SET calorias_100g = 99,  proteina_100g = 18, carbos_100g = 1,  grasas_100g = 2  WHERE nombre ILIKE '%camaron%' OR nombre ILIKE '%camarones%';

-- LÁCTEOS
UPDATE alimentos SET calorias_100g = 61,  proteina_100g = 3,  carbos_100g = 5,  grasas_100g = 3  WHERE nombre ILIKE '%leche%entera%';
UPDATE alimentos SET calorias_100g = 34,  proteina_100g = 3,  carbos_100g = 5,  grasas_100g = 0  WHERE nombre ILIKE '%leche%descremada%' OR nombre ILIKE '%leche%desnatada%';
UPDATE alimentos SET calorias_100g = 42,  proteina_100g = 3,  carbos_100g = 5,  grasas_100g = 1  WHERE nombre ILIKE '%leche%semi%';
UPDATE alimentos SET calorias_100g = 59,  proteina_100g = 10, carbos_100g = 4,  grasas_100g = 0  WHERE nombre ILIKE '%yogur%natural%' OR nombre ILIKE '%yogurt%natural%';
UPDATE alimentos SET calorias_100g = 97,  proteina_100g = 9,  carbos_100g = 4,  grasas_100g = 5  WHERE nombre ILIKE '%yogur%griego%' OR nombre ILIKE '%yogurt%griego%';
UPDATE alimentos SET calorias_100g = 98,  proteina_100g = 11, carbos_100g = 3,  grasas_100g = 4  WHERE nombre ILIKE '%queso%cottage%';
UPDATE alimentos SET calorias_100g = 403, proteina_100g = 25, carbos_100g = 1,  grasas_100g = 33 WHERE nombre ILIKE '%queso%cheddar%';
UPDATE alimentos SET calorias_100g = 318, proteina_100g = 22, carbos_100g = 3,  grasas_100g = 25 WHERE nombre ILIKE '%queso%mozzarella%';
UPDATE alimentos SET calorias_100g = 357, proteina_100g = 22, carbos_100g = 2,  grasas_100g = 29 WHERE nombre ILIKE '%queso%gouda%' OR nombre ILIKE '%queso%amarillo%';
UPDATE alimentos SET calorias_100g = 304, proteina_100g = 26, carbos_100g = 2,  grasas_100g = 21 WHERE nombre ILIKE '%queso%panela%' OR nombre ILIKE '%queso%blanco%';

-- CEREALES Y CARBOHIDRATOS
UPDATE alimentos SET calorias_100g = 130, proteina_100g = 3,  carbos_100g = 28, grasas_100g = 0  WHERE nombre ILIKE '%arroz%blanco%cocido%';
UPDATE alimentos SET calorias_100g = 365, proteina_100g = 7,  carbos_100g = 80, grasas_100g = 1  WHERE nombre ILIKE '%arroz%blanco%' AND nombre NOT ILIKE '%cocido%';
UPDATE alimentos SET calorias_100g = 111, proteina_100g = 3,  carbos_100g = 23, grasas_100g = 1  WHERE nombre ILIKE '%arroz%integral%cocido%';
UPDATE alimentos SET calorias_100g = 389, proteina_100g = 17, carbos_100g = 66, grasas_100g = 7  WHERE nombre ILIKE '%avena%';
UPDATE alimentos SET calorias_100g = 158, proteina_100g = 6,  carbos_100g = 31, grasas_100g = 1  WHERE nombre ILIKE '%pasta%cocida%' OR nombre ILIKE '%espagueti%cocido%';
UPDATE alimentos SET calorias_100g = 371, proteina_100g = 13, carbos_100g = 74, grasas_100g = 2  WHERE nombre ILIKE '%pasta%' AND nombre NOT ILIKE '%cocida%';
UPDATE alimentos SET calorias_100g = 265, proteina_100g = 9,  carbos_100g = 49, grasas_100g = 3  WHERE nombre ILIKE '%pan%blanco%';
UPDATE alimentos SET calorias_100g = 247, proteina_100g = 13, carbos_100g = 41, grasas_100g = 3  WHERE nombre ILIKE '%pan%integral%';
UPDATE alimentos SET calorias_100g = 77,  proteina_100g = 2,  carbos_100g = 17, grasas_100g = 0  WHERE nombre ILIKE '%papa%' OR nombre ILIKE '%patata%';
UPDATE alimentos SET calorias_100g = 86,  proteina_100g = 2,  carbos_100g = 20, grasas_100g = 0  WHERE nombre ILIKE '%batata%' OR nombre ILIKE '%camote%' OR nombre ILIKE '%boniato%';
UPDATE alimentos SET calorias_100g = 86,  proteina_100g = 3,  carbos_100g = 19, grasas_100g = 0  WHERE nombre ILIKE '%quinoa%cocida%';
UPDATE alimentos SET calorias_100g = 368, proteina_100g = 14, carbos_100g = 64, grasas_100g = 6  WHERE nombre ILIKE '%quinoa%' AND nombre NOT ILIKE '%cocida%';
UPDATE alimentos SET calorias_100g = 222, proteina_100g = 4,  carbos_100g = 49, grasas_100g = 1  WHERE nombre ILIKE '%arepa%';
UPDATE alimentos SET calorias_100g = 218, proteina_100g = 5,  carbos_100g = 48, grasas_100g = 1  WHERE nombre ILIKE '%tortilla%maiz%';

-- FRUTAS
UPDATE alimentos SET calorias_100g = 89,  proteina_100g = 1,  carbos_100g = 23, grasas_100g = 0  WHERE nombre ILIKE '%platano%' OR nombre ILIKE '%banana%';
UPDATE alimentos SET calorias_100g = 52,  proteina_100g = 0,  carbos_100g = 14, grasas_100g = 0  WHERE nombre ILIKE '%manzana%';
UPDATE alimentos SET calorias_100g = 47,  proteina_100g = 1,  carbos_100g = 12, grasas_100g = 0  WHERE nombre ILIKE '%naranja%';
UPDATE alimentos SET calorias_100g = 60,  proteina_100g = 1,  carbos_100g = 15, grasas_100g = 0  WHERE nombre ILIKE '%mango%';
UPDATE alimentos SET calorias_100g = 32,  proteina_100g = 1,  carbos_100g = 8,  grasas_100g = 0  WHERE nombre ILIKE '%fresa%' OR nombre ILIKE '%frutilla%';
UPDATE alimentos SET calorias_100g = 57,  proteina_100g = 1,  carbos_100g = 15, grasas_100g = 0  WHERE nombre ILIKE '%uva%';
UPDATE alimentos SET calorias_100g = 50,  proteina_100g = 1,  carbos_100g = 13, grasas_100g = 0  WHERE nombre ILIKE '%pera%';
UPDATE alimentos SET calorias_100g = 30,  proteina_100g = 1,  carbos_100g = 7,  grasas_100g = 0  WHERE nombre ILIKE '%sandia%' OR nombre ILIKE '%melon%agua%';
UPDATE alimentos SET calorias_100g = 34,  proteina_100g = 1,  carbos_100g = 8,  grasas_100g = 0  WHERE nombre ILIKE '%melon%' AND nombre NOT ILIKE '%sandia%';
UPDATE alimentos SET calorias_100g = 160, proteina_100g = 2,  carbos_100g = 9,  grasas_100g = 15 WHERE nombre ILIKE '%aguacate%' OR nombre ILIKE '%palta%';
UPDATE alimentos SET calorias_100g = 41,  proteina_100g = 1,  carbos_100g = 10, grasas_100g = 0  WHERE nombre ILIKE '%papaya%';
UPDATE alimentos SET calorias_100g = 50,  proteina_100g = 1,  carbos_100g = 13, grasas_100g = 0  WHERE nombre ILIKE '%kiwi%';
UPDATE alimentos SET calorias_100g = 48,  proteina_100g = 1,  carbos_100g = 12, grasas_100g = 0  WHERE nombre ILIKE '%durazno%' OR nombre ILIKE '%melocoton%';
UPDATE alimentos SET calorias_100g = 46,  proteina_100g = 1,  carbos_100g = 12, grasas_100g = 0  WHERE nombre ILIKE '%mandarina%';
UPDATE alimentos SET calorias_100g = 72,  proteina_100g = 1,  carbos_100g = 19, grasas_100g = 0  WHERE nombre ILIKE '%pina%' OR nombre ILIKE '%ananas%';

-- VERDURAS
UPDATE alimentos SET calorias_100g = 34,  proteina_100g = 3,  carbos_100g = 7,  grasas_100g = 0  WHERE nombre ILIKE '%brocoli%';
UPDATE alimentos SET calorias_100g = 23,  proteina_100g = 3,  carbos_100g = 4,  grasas_100g = 0  WHERE nombre ILIKE '%espinaca%';
UPDATE alimentos SET calorias_100g = 25,  proteina_100g = 2,  carbos_100g = 5,  grasas_100g = 0  WHERE nombre ILIKE '%lechuga%';
UPDATE alimentos SET calorias_100g = 18,  proteina_100g = 2,  carbos_100g = 3,  grasas_100g = 0  WHERE nombre ILIKE '%pepino%';
UPDATE alimentos SET calorias_100g = 18,  proteina_100g = 1,  carbos_100g = 4,  grasas_100g = 0  WHERE nombre ILIKE '%tomate%';
UPDATE alimentos SET calorias_100g = 40,  proteina_100g = 2,  carbos_100g = 9,  grasas_100g = 0  WHERE nombre ILIKE '%zanahoria%';
UPDATE alimentos SET calorias_100g = 25,  proteina_100g = 2,  carbos_100g = 5,  grasas_100g = 0  WHERE nombre ILIKE '%coliflor%';
UPDATE alimentos SET calorias_100g = 31,  proteina_100g = 2,  carbos_100g = 6,  grasas_100g = 0  WHERE nombre ILIKE '%pimiento%' OR nombre ILIKE '%pimenton%';
UPDATE alimentos SET calorias_100g = 42,  proteina_100g = 1,  carbos_100g = 10, grasas_100g = 0  WHERE nombre ILIKE '%cebolla%';
UPDATE alimentos SET calorias_100g = 40,  proteina_100g = 2,  carbos_100g = 9,  grasas_100g = 0  WHERE nombre ILIKE '%maiz%cocido%' OR nombre ILIKE '%elote%';

-- LEGUMBRES
UPDATE alimentos SET calorias_100g = 132, proteina_100g = 9,  carbos_100g = 24, grasas_100g = 1  WHERE nombre ILIKE '%frijol%negro%' OR nombre ILIKE '%poroto%negro%';
UPDATE alimentos SET calorias_100g = 127, proteina_100g = 9,  carbos_100g = 23, grasas_100g = 0  WHERE nombre ILIKE '%frijol%rojo%' OR nombre ILIKE '%poroto%rojo%';
UPDATE alimentos SET calorias_100g = 116, proteina_100g = 9,  carbos_100g = 20, grasas_100g = 0  WHERE nombre ILIKE '%lenteja%';
UPDATE alimentos SET calorias_100g = 164, proteina_100g = 9,  carbos_100g = 27, grasas_100g = 3  WHERE nombre ILIKE '%garbanzo%';

-- GRASAS Y FRUTOS SECOS
UPDATE alimentos SET calorias_100g = 579, proteina_100g = 21, carbos_100g = 22, grasas_100g = 50 WHERE nombre ILIKE '%almendra%';
UPDATE alimentos SET calorias_100g = 654, proteina_100g = 15, carbos_100g = 14, grasas_100g = 65 WHERE nombre ILIKE '%nuez%';
UPDATE alimentos SET calorias_100g = 567, proteina_100g = 26, carbos_100g = 16, grasas_100g = 49 WHERE nombre ILIKE '%mani%' OR nombre ILIKE '%cacahuate%';
UPDATE alimentos SET calorias_100g = 588, proteina_100g = 25, carbos_100g = 20, grasas_100g = 50 WHERE nombre ILIKE '%mantequilla%mani%' OR nombre ILIKE '%mantequilla%cacahuate%';
UPDATE alimentos SET calorias_100g = 718, proteina_100g = 14, carbos_100g = 29, grasas_100g = 61 WHERE nombre ILIKE '%semilla%girasol%';
UPDATE alimentos SET calorias_100g = 631, proteina_100g = 21, carbos_100g = 7,  grasas_100g = 58 WHERE nombre ILIKE '%chia%';
UPDATE alimentos SET calorias_100g = 534, proteina_100g = 18, carbos_100g = 29, grasas_100g = 42 WHERE nombre ILIKE '%linaza%';
UPDATE alimentos SET calorias_100g = 884, proteina_100g = 0,  carbos_100g = 0,  grasas_100g = 100 WHERE nombre ILIKE '%aceite%oliva%';
UPDATE alimentos SET calorias_100g = 862, proteina_100g = 0,  carbos_100g = 0,  grasas_100g = 100 WHERE nombre ILIKE '%aceite%coco%';
UPDATE alimentos SET calorias_100g = 717, proteina_100g = 1,  carbos_100g = 1,  grasas_100g = 81 WHERE nombre ILIKE '%mantequilla%' AND nombre NOT ILIKE '%mani%' AND nombre NOT ILIKE '%cacahuate%';

-- SUPLEMENTOS
UPDATE alimentos SET calorias_100g = 400, proteina_100g = 80, carbos_100g = 8,  grasas_100g = 6  WHERE nombre ILIKE '%whey%' OR nombre ILIKE '%proteina%polvo%' OR nombre ILIKE '%proteina%suero%';
UPDATE alimentos SET calorias_100g = 376, proteina_100g = 90, carbos_100g = 2,  grasas_100g = 1  WHERE nombre ILIKE '%caseina%';
UPDATE alimentos SET calorias_100g = 357, proteina_100g = 80, carbos_100g = 7,  grasas_100g = 2  WHERE nombre ILIKE '%proteina%vegana%' OR nombre ILIKE '%proteina%vegetal%';
