# PorotoFit — Guía para publicar en Google Play

Todo listo para copiar/pegar cuando generemos el APK y creemos la ficha en Play Store.

---

## 1. Datos técnicos (para PWABuilder)

| Campo | Valor |
|---|---|
| URL (Host) | `https://porotofit.cl` |
| Nombre de la app | `PorotoFit` |
| Package ID / applicationId | `cl.porotofit.twa` |
| Modo | Standalone (ya está en el manifest) |
| Política de privacidad | `https://porotofit.cl/privacidad` |
| Correo de contacto | `contacto@porotofit.cl` |

> Importante: el `package_name` en PWABuilder debe ser **exactamente** `cl.porotofit.twa` para que calce con `public/.well-known/assetlinks.json`. Al generar el APK, PWABuilder da un **SHA-256** → pegarlo en ese archivo (reemplazar `PENDIENTE_REEMPLAZAR_...`) y volver a desplegar.

---

## 2. Ficha de la tienda (copiar/pegar)

**Nombre de la app** (máx. 30 caracteres)
```
PorotoFit
```

**Descripción corta** (máx. 80 caracteres)
```
Rutinas, nutrición y progreso. Tu gimnasio en el bolsillo, en español.
```

**Descripción completa** (máx. 4000 caracteres)
```
PorotoFit es tu entrenador de bolsillo: entrena, come mejor y mira tu progreso, todo en una sola app, simple y en español.

Ideal si estás empezando o si ya vas al gimnasio y quieres orden.

🏋️ RUTINAS LISTAS PARA EMPEZAR
Elige una rutina hecha por objetivo y para hombre o mujer (cuerpo completo, torso/pierna, push pull legs y más). Basadas en evidencia actual, con los ejercicios ya cargados y con fotos. O crea la tuya desde cero.

⏱️ ENTRENA CON GUÍA
Registra tus series, pesos y repeticiones. Cronómetro de descanso con avisos. Mueve el día de tu entreno si te saltaste uno. Todo se guarda automáticamente.

🥗 NUTRICIÓN SIN COMPLICACIONES
Lleva tus calorías y macros según tu meta. Busca alimentos, escanea el código de barras del producto y registra en segundos. Control de hidratación con recordatorios.

📈 TU PROGRESO CLARO
Mira cómo evolucionas: peso, entrenamientos y metas cumplidas, en lenguaje simple que te motiva a seguir.

✅ GRATIS y en español, pensada para el usuario de verdad.

Empieza hoy. Tu versión más fit te está esperando. 💪
```

**Categoría:** Salud y bienestar (Health & Fitness)

**Etiquetas/keywords sugeridas:** fitness, gimnasio, rutinas, entrenamiento, nutrición, calorías, macros, dieta, progreso, peso

---

## 3. Recursos gráficos que pide Play Store
- **Ícono:** 512×512 PNG (ya tenemos el del poroto — `public/icon-512.png`).
- **Gráfico destacado (feature graphic):** 1024×500 PNG (pendiente — se puede armar con la mascota + wordmark).
- **Capturas de pantalla:** mínimo 2 (teléfono). Se toman de la app ya con la marca PorotoFit (Inicio, Rutinas, Nutrición, Progreso).

---

## 4. Pasos que faltan (orden)
1. ⏳ Esperar a que `porotofit.cl` cargue (DNS propagando).
2. Crear **cuenta Google Play Developer** (US$25, pago único) — lo hace Junior.
3. En **pwabuilder.com**: pegar `https://porotofit.cl` → Android → package `cl.porotofit.twa` → generar y descargar el paquete (AAB/APK + assetlinks).
4. Pegar el **SHA-256** de PWABuilder en `public/.well-known/assetlinks.json` → commit + deploy.
5. Subir el **AAB** a Play Store + completar la ficha con lo de arriba + subir capturas.
6. (Cuentas personales nuevas) Ojo con la **prueba cerrada** (~12 testers × 14 días) antes de publicar abierto — evaluar cuenta de empresa/SpA.
