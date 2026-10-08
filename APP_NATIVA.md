# ProfitLab Academy — App nativa (Android / iOS)

La misma aula virtual, empaquetada como **app nativa** con
[Capacitor](https://capacitorjs.com). El código es el mismo de la web: se
construye el export estático de Next (`out/`) y se mete dentro de un WebView
nativo publicable en **Google Play** y la **App Store**.

La app usa la API que ya tienes en `https://profitlab-academy.com/aulavirtual/api`
(por eso se añadió CORS para los orígenes de la app). No necesitas un servidor
nuevo.

---

## 0) Qué necesitas (una sola vez)

| Para… | Necesitas |
|---|---|
| **Android** | [Android Studio](https://developer.android.com/studio) (Windows/Mac/Linux) + una cuenta de **Google Play Console** (pago único **$25**) |
| **iOS** | Una **Mac** con [Xcode](https://developer.apple.com/xcode/) + cuenta **Apple Developer** (**$99/año**) |
| Ambos | [Node.js 20+](https://nodejs.org) |

> iOS **solo** se puede compilar en una Mac (es requisito de Apple). Android se
> compila en cualquier sistema.

---

## 1) Preparar el proyecto (cualquier sistema)

```bash
npm install
# Construye la web para la app (basePath vacío + API absoluta) y la copia
# dentro de los proyectos nativos:
npm run sync:app
```

`npm run sync:app` hace dos cosas: `build:app` (genera `out/` apuntando a la API
de producción) y `npx cap sync` (copia `out/` a Android e iOS y actualiza
plugins). **Repite este comando cada vez que cambies la app** y quieras llevar
los cambios a las apps.

---

## 2) Android — generar el APK / AAB

```bash
npm run open:android     # abre el proyecto en Android Studio
```

En Android Studio:

1. Espera a que termine el *Gradle sync*.
2. Para **probar en tu teléfono**: conéctalo por USB (con *Depuración USB*
   activada) y pulsa ▶ **Run**.
3. Para **publicar**: menú **Build → Generate Signed Bundle / APK → Android App
   Bundle (.aab)**.
   - La primera vez crea un *keystore* (archivo `.jks`) y **guárdalo muy bien**:
     es la firma de tu app para siempre. Si lo pierdes, no podrás actualizar la
     app en Play.
4. Sube el `.aab` en <https://play.google.com/console> → crea la ficha de la app
   (nombre, iconos —ya incluidos—, capturas, descripción) → envía a revisión.

Datos ya configurados: **nombre** "ProfitLab Academy", **ID** `com.profitlabacademy.aula`,
iconos y splash en verde/negro de la marca.

---

## 3) iOS — generar el IPA (solo en Mac)

```bash
npm run open:ios         # abre el proyecto en Xcode
```

En Xcode:

1. Selecciona el target **App** → pestaña **Signing & Capabilities** → elige tu
   *Team* de Apple Developer (Xcode firma automáticamente).
2. Para **probar**: elige un simulador o tu iPhone y pulsa ▶.
3. Para **publicar**: menú **Product → Archive** → **Distribute App → App Store
   Connect** → sube el build.
4. Completa la ficha en <https://appstoreconnect.apple.com> y envía a revisión.

---

## 4) Actualizar la app más adelante

Cada vez que cambie la web del aula:

```bash
git pull
npm install
npm run sync:app
```

Y vuelve a generar el `.aab` (Android) o a hacer *Archive* (iOS). Sube la nueva
versión a cada tienda (recuerda subir el número de versión en
`android/app/build.gradle` y en Xcode).

---

## Notas técnicas

- **basePath**: la web vive en `/aulavirtual`; la app carga desde la raíz del
  WebView. Se controla con `NEXT_PUBLIC_BASE_PATH` (`npm run build:app` lo deja
  vacío). No toques esto a mano.
- **API**: la app apunta a `https://profitlab-academy.com/aulavirtual/api`
  (absoluta). Cambia la URL en el script `build:app` de `package.json` si tu
  dominio cambia.
- **CORS**: `api/lib/helpers.php` ya permite los orígenes de Capacitor
  (`capacitor://localhost`, `https://localhost`). Sube ese archivo al servidor
  si aún no lo has hecho.
- **Iconos/splash**: fuente en `assets/`. Para regenerarlos tras cambiar el
  logo: `npx @capacitor/assets generate --android --ios`.
- Los proyectos `android/` e `ios/` ya vienen incluidos y listos para abrir.
