# PorotoFit — Respuestas para los formularios de Play Console

Sacadas del código, no inventadas. Cada respuesta dice de dónde sale, para que
puedas verificarla si Google pregunta.

> Ficha de la tienda (textos, categoría, gráficos) → ver [PLAY-STORE.md](PLAY-STORE.md).

---

## 1. Seguridad de los datos (el más largo)

### Preguntas iniciales

| Pregunta | Respuesta |
|---|---|
| ¿Tu app recopila o comparte alguno de los tipos de datos requeridos? | **Sí** |
| ¿Todos los datos están **cifrados en tránsito**? | **Sí** — todo va por HTTPS/TLS a Supabase |
| ¿Ofreces una forma de **solicitar la eliminación** de los datos? | **Sí** → `https://porotofit.cl/eliminar-cuenta` |

### Tipos de datos: qué marcar

**Nada de esto se comparte con terceros.** En los tres casos: Recopilado = Sí, Compartido = **No**, Procesado efímeramente = No.

#### Información personal
| Dato | Marcar | Obligatorio | Propósito | De dónde sale |
|---|---|---|---|---|
| Nombre | ✅ | Sí | Funciones de la app, Administración de la cuenta | `perfiles.nombre` |
| Dirección de correo | ✅ | Sí | Administración de la cuenta | `auth.signUp` |
| ID de usuario | ✅ | Sí | Administración de la cuenta, Funciones de la app | uid de Supabase auth |
| Otra información | ✅ | Sí | Funciones de la app | `perfiles.edad`, `.sexo` — se usan para calcular calorías y macros |

#### Salud y fitness
| Dato | Marcar | Obligatorio | Propósito | De dónde sale |
|---|---|---|---|---|
| Información de salud | ✅ | Sí | Funciones de la app | `peso_corporal`, `perfiles.altura_cm/peso_kg`, `registro_comidas`, `registro_agua` |
| Información de actividad física | ✅ | Sí | Funciones de la app | `rutinas`, `rutina_ejercicios`, `sesiones` (series, pesos, reps) |

#### Lo que NO se declara
Ubicación, Información financiera, Mensajes, Contactos, Archivos, Historial de
navegación, Apps instaladas, ID de dispositivo, Rendimiento — **nada de esto se toca**.

> **Fotos y videos → NO marcar.** Ojo, que acá se equivoca mucha gente: la app **sí
> usa la cámara** (`@zxing/browser`, `app/inicio/page.tsx:389`) para leer códigos de
> barras. Pero los cuadros se procesan en el teléfono y se descartan: no se guarda ni
> se transmite ninguna imagen. Según Google, si el dato nunca sale del dispositivo,
> **no es "recopilado"**. Declararlo de más también te hace fallar la revisión.

> **No hay analytics ni rastreo.** Se verificó: no hay gtag, Google Analytics, Meta
> Pixel, Sentry, Mixpanel ni nada parecido. Por eso "Compartido = No" en todo.

> **OpenFoodFacts no rompe esto.** La búsqueda de alimentos pega a OpenFoodFacts,
> pero **desde el servidor** (`app/api/alimentos/buscar` y `/codigo`), no desde el
> teléfono. Al tercero le llega un término de búsqueda o un código de barras, sin
> nada que identifique al usuario. No es compartir datos del usuario.

---

## 2. Acceso a la app

**Toda la funcionalidad requiere login** → hay que darle credenciales a Google o
rechazan la revisión sin siquiera abrirla.

- Marcá: *"Todas las funciones están restringidas o requieren acceso"*
- Nombre de la instrucción: `Cuenta de prueba`
- Usuario: `fitpro.demo.js@gmail.com`
- Contraseña: **la ponés vos** (no la escribo yo)
- Instrucciones (copiar/pegar):

```
1. Abre la app.
2. Toca "Iniciar sesión" (no "Registrarse").
3. Ingresa el correo y la contraseña indicados arriba.
4. La cuenta ya tiene perfil y datos cargados, así que entra directo al inicio.
```

⚠️ **Antes de enviar**: entrá con esa cuenta y confirmá que anda y que tiene el
onboarding completo. Si Google cae en el onboarding vacío, rebota la revisión.

---

## 3. Clasificación de contenido

Respuestas para el cuestionario:

| Pregunta | Respuesta |
|---|---|
| Categoría | **Referencia, noticias o educación** (o Salud y bienestar si aparece) |
| Violencia | No |
| Contenido sexual | No |
| Lenguaje inapropiado | No |
| Drogas, alcohol o tabaco | No |
| Juegos de azar (real o simulado) | No |
| Compras dentro de la app | No |
| Comparte ubicación | No |

> ⚠️ **"¿Los usuarios pueden interactuar o intercambiar contenido?"** → **Sí.**
> Hay que decir la verdad acá: la app deja compartir rutinas con un código `FIT-XXXX`
> (`app/api/rutinas/compartir/route.ts`), así que un usuario puede pasarle una rutina
> a otro. Es acotado — solo nombre de rutina y ejercicios, no hay chat, ni perfiles
> públicos, ni fotos, ni comentarios. Contestá que sí y aclarálo; mentir acá es de lo
> que más caro sale si lo detectan después.

---

## 4. Público objetivo

- Rango de edad: **18 y más**
- No dirigida a menores

> Es a propósito: la app cuenta calorías y registra peso. Marcar 13+ te mete en la
> política de Familias y en escrutinio extra para apps de salud con menores. No vale
> la pena.

---

## 5. Anuncios

- ¿Contiene anuncios? → **No** (se verificó: no hay ninguna SDK de ads)

---

## 6. Otras declaraciones

| Formulario | Respuesta |
|---|---|
| App de gobierno | No |
| Funciones financieras | No |
| Apps de salud | **No** — no es app médica: no diagnostica, no trata, no da consejo clínico ni maneja historiales. Es seguimiento de fitness y nutrición. |
| Política de privacidad | `https://porotofit.cl/privacidad` |
| Eliminación de cuenta | `https://porotofit.cl/eliminar-cuenta` |
| Correo de contacto | `contacto@porotofit.cl` |
