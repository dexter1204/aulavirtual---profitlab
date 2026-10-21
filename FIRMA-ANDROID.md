# Firma Android — generar el .aab para Google Play

Ya te generé una **llave de firma** (upload key). Con ella, GitHub arma el
`.aab` **firmado** listo para subir a Google Play, sin que instales nada.

> ⚠️ **Guarda la llave y su contraseña en un lugar seguro.** Es la firma de tu
> app. Con Play App Signing la *upload key* es recuperable, pero igual
> consérvala. No la publiques.

## Archivos que te entregué (por el chat)
- `upload-keystore.jks` — la llave (guárdala a buen recaudo).
- `upload-keystore.b64` — la misma llave en texto base64 (para el Secret).
- `keystore-password.txt` — la contraseña.

## Paso 1 · Añadir 4 Secrets en GitHub (una sola vez)
En tu repo: **Settings → Secrets and variables → Actions → New repository secret**.
Crea estos cuatro:

| Nombre del Secret | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | pega **todo** el contenido de `upload-keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | la contraseña de `keystore-password.txt` |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | la **misma** contraseña de `keystore-password.txt` |

## Paso 2 · Generar el .aab
En GitHub → pestaña **Actions** → **Build Android AAB (Google Play)** →
**Run workflow**. En unos minutos:
- entra al run → **Artifacts** → descarga **`ProfitLab-Academy-aab`**
  (adentro está `app-release.aab`).

## Paso 3 · Subir a Google Play
1. En <https://play.google.com/console> crea la app (nombre, ícono —ya
   incluido—, capturas, descripción, política de privacidad).
2. Ve a **Producción → Crear nueva versión** y sube el `app-release.aab`.
3. La primera vez Play te ofrecerá **Play App Signing** (acéptalo): Google
   guarda la llave de firma final y tu `upload-keystore.jks` queda como
   *llave de subida*.
4. Completa la ficha y envía a revisión.

## Subir la versión más adelante
Cada nueva versión debe tener un **versionCode** mayor. Edita en
`android/app/build.gradle`:

```gradle
versionCode 2        // súbelo en cada entrega: 1 → 2 → 3 …
versionName "1.1"    // la versión visible
```

Luego vuelve a **Run workflow** y sube el nuevo `.aab`.

## Nota
El `.aab` es **solo para Google Play**. Para probar en tu teléfono usa el
**APK** del workflow "Build Android APK".
