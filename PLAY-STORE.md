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

> Importante: el `package_name` en PWABuilder debe ser **exactamente** `cl.porotofit.twa` para que calce con `public/.well-known/assetlinks.json`.

> ⚠️ **El SHA-256 que da PWABuilder NO alcanza.** Ese es el de la **clave de carga**, y Google **re-firma** la app con su propia clave (Play App Signing) antes de distribuirla. Si en `assetlinks.json` va solo el de PWABuilder, la verificación de Digital Asset Links falla y la app abre **con la barra del navegador visible**.
>
> El que manda es el de **Play Console → Protegido con Play → Firma de apps → "Certificado de la clave de firma de la app" → Huella digital SHA-256**. Hoy el archivo lleva **las dos** huellas (Google para instalaciones desde Play, carga para el APK directo).
>
> Para comprobar que quedó bien, sin instalar nada:
> ```bash
> curl -s -G "https://digitalassetlinks.googleapis.com/v1/assetlinks:check" \
>   --data-urlencode "source.web.site=https://porotofit.cl" \
>   --data-urlencode "relation=delegate_permission/common.handle_all_urls" \
>   --data-urlencode "target.android_app.package_name=cl.porotofit.twa" \
>   --data-urlencode "target.android_app.certificate.sha256_fingerprint=<HUELLA>"
> # debe responder: {"linked": true}
> ```

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
1. ~~Esperar a que `porotofit.cl` cargue (DNS propagando).~~ ✅ live.
2. ~~Crear **cuenta Google Play Developer** (US$25, pago único).~~ ✅ cuenta `porotos.cl@gmail.com`, developer "PorotoFit".
3. ~~En **pwabuilder.com**: generar el paquete (AAB/APK + assetlinks).~~ ✅ package `cl.porotofit.twa`.
4. ~~`assetlinks.json` con las huellas correctas → commit + deploy.~~ ✅ 14/07/2026, las dos huellas, verificado con `linked: true`.
5. ~~Subir el **AAB** a Play Console.~~ ✅ versión 1 (1.0.0.0) activa en **prueba interna**.
6. ⬜ **Completar la ficha de la tienda** con la sección 2 de este doc + gráficos de la sección 3 (falta el feature graphic 1024×500 y las capturas).
7. ⬜ (Cuentas personales nuevas) **Prueba cerrada** ~12-20 testers × 14 días antes de publicar en producción.

> ⚠️ **Guardar para siempre**: `signing.keystore` + `signing-key-info.txt` (contraseñas) del paquete de PWABuilder. Sin esos archivos no se puede volver a actualizar la app en Play Store.
