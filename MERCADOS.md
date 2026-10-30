# Sección "Mercados" — integración del dashboard Quant

La sección **Mercados** del aula muestra el dashboard de exposiciones
(gamma/beta · GEX, DEX, niveles, régimen, IV) de tu proyecto
[`profitlab_quant`](https://github.com/dexter1204/profitlab_quant), **embebido**
dentro del aula y con **login compartido**.

El acceso es **aparte**: cada usuario entra solo si **canjea un cupón** o
**compra** el acceso. Sin acceso activo, la sección muestra un paywall que
obliga a canjear o comprar.

## Cómo funciona

- El aula ya tiene los endpoints que el quant espera: `GET /quant/me`,
  `POST /quant/redeem`, `POST /quant/checkout` (Mercado Pago).
- Cuando el usuario tiene acceso, el aula **embebe** `/quantsistem` pasándole la
  sesión por el hash `#plq=<token>` (sin segundo login).
- El backend del quant (en Render) valida ese token con el **mismo
  `JWT_SECRET`** del aula.

---

## Pasos para activarlo

### 1) Base de datos (aula)
phpMyAdmin → tu base → SQL → pega y ejecuta **`migracion_quant.sql`**
(crea `quant_access`, `quant_coupons`, `quant_coupon_uses`). Es seguro
re-ejecutarlo.

### 2) API (aula)
Sube a `public_html/aulavirtual/api/`:
- `index.php`
- `lib/helpers.php` (trae además el CORS para la app nativa)

Y en tu `config.php` (no se sube; edítalo en el servidor) añade/ajusta:

```php
'quant_price'       => 0,     // precio del acceso (0 = solo por cupón)
'quant_currency'    => 'PEN',
'quant_access_days' => 30,     // días que da una compra (0 = vitalicio)
```

> Con `quant_price => 0` el paywall solo ofrece canjear cupón. Si pones un
> precio > 0, además aparece el botón de comprar con Mercado Pago.

### 3) Aula (frontend)
Sube el contenido de **`aulavirtual/`** a `public_html/aulavirtual/`
(incluye la nueva sección `/aulavirtual/mercados/` y el panel admin
`/aulavirtual/admin/mercados/`).

### 4) Dashboard quant (frontend embebido)
Sube **`quantsistem/`** a `public_html/quantsistem/`.
- Este `quantsistem/` ya trae el parche en `auth.js` para aceptar la sesión del
  aula cuando va embebido (si ya tenías `/quantsistem` subido, basta con
  reemplazar **`auth.js`**).
- En `quantsistem/config.js` confirma que `window.PROFITLAB_API` apunta a tu
  backend de Render.

### 5) Backend quant (Render)
En el servicio `quantsistem-api` de Render → **Environment**:
- `JWT_SECRET` = el **mismo** `jwt_secret` de `aulavirtual/api/config.php`
  (así valida las sesiones del aula). **Imprescindible.**
- `POLYGON_API_KEY` = tu clave de datos (para datos en vivo).

---

## Dar acceso a los alumnos

En el aula: **Master Study → Mercados**. Ahí puedes:
- **Crear cupones** (días de acceso, usos máximos, nota). Los alumnos los
  canjean en la sección Mercados.
- Ver y eliminar cupones.

Acceso directo sin cupón (manual): el endpoint `POST /quant/grant`
(`{user_id, days}`) otorga acceso a un usuario; los **administradores** siempre
tienen acceso.

---

## Notas
- URL del dashboard embebido: por defecto `/quantsistem/` (mismo dominio). Para
  la app nativa se usa el dominio absoluto automáticamente. Para forzar otra URL,
  define `NEXT_PUBLIC_QUANT_URL` al construir el aula.
- Si Render está en plan gratuito, la primera carga tras un rato puede tardar
  unos segundos (se "despierta" el servicio).
