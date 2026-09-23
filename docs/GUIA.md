# Guía para poner la app en marcha

Hola, Loli. Esta guía te lleva paso a paso para tener la app online, con tus datos guardados y con login. No hace falta saber programar: son todos clics en páginas web.

Vas a crear **dos cuentas gratuitas**:

- **Supabase**: donde se guardan tus datos (gastos, productos, fotos).
- **Vercel**: la que publica la app en internet, para que la abras desde el navegador.

> **Importante sobre las claves.** En el paso 3 vas a copiar dos datos de Supabase. Esos datos se pegan **solo en Vercel**. Nunca los pegues en el código, en GitHub ni en un chat.

Hacé un paso por vez. Si algo no se ve igual a como lo describo, pará y preguntá.

---

## Paso 1 · Crear la base de datos en Supabase

1. Entrá a <https://supabase.com> y tocá **Start your project**. Registrate con tu cuenta de GitHub (es lo más fácil) o con tu email.
2. Tocá **New project**.
   - **Name:** `algo-nuestro`
   - **Database Password:** tocá *Generate a password* y guardala en un lugar seguro. (La app no la usa, pero conviene tenerla.)
   - **Region:** *South America (São Paulo)*, que es la más cercana.
   - Tocá **Create new project** y esperá un par de minutos a que termine.
3. En el menú de la izquierda, entrá a **SQL Editor** y tocá **New query**.
4. Abrí el archivo [`supabase/schema.sql`](../supabase/schema.sql) de este proyecto, copiá **todo** el texto y pegalo en el editor.
5. Tocá **Run**. Tiene que decir *Success. No rows returned*. Listo: ya están creadas las tablas, con la seguridad para que solo vos veas tus datos.

## Paso 2 · Configurar el login (sin contraseña)

La app te deja entrar con un link que te llega por mail. Para que **nadie más** pueda crearse una cuenta:

1. En Supabase, entrá a **Authentication → Sign In / Providers**.
   - Verificá que **Email** esté activado.
   - Desactivá **Allow new users to sign up** y guardá.
2. Entrá a **Authentication → Users** y tocá **Add user → Create new user**.
   - Poné tu email.
   - Poné cualquier contraseña (la app no la usa).
   - Dejá tildado **Auto Confirm User** y tocá **Create user**.

## Paso 3 · Copiar los dos datos de conexión

1. En Supabase, tocá **Connect** (arriba) o entrá a **Project Settings → API Keys**.
2. Vas a necesitar dos datos. Dejá esta pestaña abierta para el paso 4:
   - **Project URL**: algo como `https://abcdefgh.supabase.co`
   - **anon public key** (a veces figura como *publishable key*): un texto largo.

> La *anon key* está hecha para usarse en apps web: no da acceso a tus datos sin tu login. Aun así, pegala solo en Vercel. **Nunca** copies la que dice *service_role* o *secret*.

## Paso 4 · Publicar la app en Vercel

1. Entrá a <https://vercel.com> y registrate con **Continue with GitHub**.
2. Tocá **Add New… → Project** y elegí el repositorio **ALGO_NUESTRO_COSTOS** → **Import**.
3. Antes de publicar, abrí **Environment Variables** y agregá dos:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | el *Project URL* del paso 3 |
   | `VITE_SUPABASE_ANON_KEY` | la *anon public key* del paso 3 |

4. Tocá **Deploy** y esperá un minuto. Vercel te da una dirección, algo como `https://algo-nuestro-costos.vercel.app`. Guardala en favoritos.

## Paso 5 · Avisarle a Supabase cuál es la dirección de la app

Así el link del mail te lleva a la app.

1. En Supabase, entrá a **Authentication → URL Configuration**.
2. En **Site URL** pegá la dirección que te dio Vercel.
3. En **Redirect URLs** tocá **Add URL** y pegá la misma dirección con `/**` al final (por ejemplo `https://algo-nuestro-costos.vercel.app/**`). Guardá.

## Paso 6 · Entrar

1. Abrí la dirección de Vercel.
2. Escribí tu email y tocá **Mandarme el link**.
3. Abrí el mail **desde la misma compu** y tocá el link. Entrás directo.

La primera vez, la app carga sola los 3 productos con sus fichas técnicas, los gastos de muestras y moldes, la cotización de packaging y la lista de datos que faltan.

---

## El logo

Para que aparezca el logo caligráfico en vez del nombre escrito:

1. Guardá el logo como **PNG con fondo transparente** y nombralo `logo.png`.
2. En GitHub, entrá al repositorio, abrí la carpeta `public`, tocá **Add file → Upload files**, subí `logo.png` y tocá **Commit changes**.
3. Vercel vuelve a publicar la app sola en un minuto.

En la cabecera (fondo chocolate) el logo se ve en color crema; en la pantalla de entrada, con sus colores originales.

## Modo prueba

Si abrís la app sin haber hecho los pasos de Supabase, arriba aparece una franja amarilla que dice **Modo prueba**. En ese modo todo funciona, pero los datos quedan guardados solo en ese navegador. Sirve para mirar la app, no para cargar datos reales.
