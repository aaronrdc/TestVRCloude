# Aula VR · Práctica docente (demo WebXR para Meta Quest 3)

Demo **individual** (sin servidor) donde un estudiante de educación superior practica dar una
mini-clase a 8 estudiantes virtuales. Construida con [IWSDK](https://github.com/facebook/immersive-web-sdk)
(`@iwsdk/core` + Three.js) y Vite.

## Qué hace
- Aula 3D con pantalla de apoyo al fondo (la diapositiva activa) y atril con botones **Anterior / Siguiente / Terminar**.
- Tema fijo: *Introducción a la fotosíntesis* (6 diapositivas, editable en `src/lesson.ts`).
- Los estudiantes **levantan la mano (`?`)** o **se distraen (`…`)** de forma aleatoria. Apunta con el rayo del control
  (o pellizca con la mano) y presiona sobre ellos.
- **Diálogos (nivel A, texto):** al dar la palabra, el estudiante hace una **pregunta ligada a la diapositiva actual** y eliges entre
  3 respuestas (precisa, parcial o débil) con retroalimentación inmediata. Los estudiantes también hablan con globos de texto
  (distraídos y al recuperar su atención). Las preguntas están en `src/questions.ts` (editable).
- Al terminar: **rúbrica** con cobertura, atención a participaciones, calidad de las respuestas, manejo de la atención y ritmo, más sugerencias.

## Ejecutar
Requiere Node ≥ 22.12 (o ≥ 20.19).

```bash
npm install
npm run dev        # https://<tu-ip>:8081 (HTTPS local con mkcert, necesario para WebXR)
npm run build      # genera dist/ (sitio estático)
```

### En el Meta Quest 3
1. PC y Quest en la misma red Wi-Fi. Abre en el **Quest Browser** la URL HTTPS que imprime `npm run dev`
   (acepta el certificado local si lo pide).
2. Pulsa **Entrar en VR**.
3. Alternativa sin PC: publica `dist/` en cualquier hosting estático con HTTPS (GitHub Pages, Netlify, Vercel) y abre esa URL.

En escritorio, `npm run dev` inyecta el emulador XR de IWSDK para iterar sin casco.

## Estructura
```
src/index.ts      Mundo IWSDK, escena, botón "Entrar en VR"
src/classroom.ts  Aula, estudiantes (componente ECS Student) y botones
src/systems.ts    ClassroomSystem: interacción, eventos aleatorios, animación
src/state.ts      Estado y métricas de la sesión
src/score.ts      Cálculo de rúbrica y sugerencias
src/ui.ts         Dibujo de pantalla, panel central y HUD (canvas 2D)
src/lesson.ts     Contenido de la clase
src/questions.ts  Preguntas, opciones de respuesta y frases de los estudiantes
```

## Diagnóstico dentro del casco
Abre la URL con `?debug` al final (`.../TestVRCloude/?debug`). Aparece un panel con FPS, peor frame, draw calls, texturas y los últimos errores.

## Estado y pendientes
- Verificado: typecheck, `vite build` y render/flujo de la sesión en Chromium headless (sin XR).
- **Sin verificar aún en el casco:** la selección con rayo/pellizco sobre estudiantes y botones, el confort y el rendimiento (~70 draw calls previstos).
- Las APIs de IWSDK se usaron según la documentación de la skill y los tipos del paquete; no se pudo consultar la documentación oficial de Meta (`metavr`) desde el sandbox.
- El bundle pesa ~6 MB por las fuentes de UIKit incluidas en IWSDK; aceptable para un piloto.
- Ideas siguientes: audios pregrabados para las preguntas (nivel B), voz del estudiante (medir muletillas/tiempo hablado con micrófono), más lecciones, multiusuario, MR (passthrough).
