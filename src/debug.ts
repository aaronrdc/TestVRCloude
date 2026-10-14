import { createSystem, World } from '@iwsdk/core';
import { CanvasPanel, FONT, roundRect } from './panel';

/** Panel de diagnóstico dentro del casco. Se activa con `?debug` en la URL. */
const errors: string[] = [];
const remember = (msg: string) => {
  errors.push(msg.slice(0, 90));
  if (errors.length > 3) errors.shift();
};

let panel: CanvasPanel | undefined;
let worldRef: World | undefined;

export function installDebug(world: World) {
  worldRef = world;
  panel = new CanvasPanel(1.1, 0.55, 600);
  panel.mesh.position.set(1.0, 1.5, -1.3);
  panel.mesh.rotation.y = -0.45;
  panel.mesh.raycast = () => {}; // nunca intercepta el rayo
  world.scene.add(panel.mesh);

  window.addEventListener('error', (e) => remember(`error: ${e.message}`));
  window.addEventListener('unhandledrejection', (e) => remember(`promesa: ${String(e.reason)}`));
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    remember(`console: ${args.map(String).join(' ')}`);
    origError.apply(console, args);
  };
  world.registerSystem(DebugSystem);
}

export class DebugSystem extends createSystem({}) {
  private acc = 0;
  private frames = 0;
  private worst = 0;

  update(delta: number) {
    if (!panel || !worldRef) return;
    this.acc += delta;
    this.frames++;
    this.worst = Math.max(this.worst, delta);
    if (this.acc < 0.5) return;
    const fps = this.frames / this.acc;
    const info = worldRef.renderer.info;
    const lines = [
      `FPS ${fps.toFixed(0)}  ·  peor frame ${(this.worst * 1000).toFixed(0)} ms`,
      `Draw calls ${info.render.calls}  ·  triángulos ${info.render.triangles}`,
      `Texturas ${info.memory.textures}  ·  geometrías ${info.memory.geometries}`,
      worldRef.session ? 'Sesión XR activa' : 'Sin sesión XR',
      ...(errors.length ? errors : ['Sin errores']),
    ];
    panel.draw((ctx, w, h) => {
      roundRect(ctx, 0, 0, w, h, 18);
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fill();
      ctx.font = `${h * 0.065}px ${FONT}`;
      ctx.textBaseline = 'top';
      lines.forEach((l, i) => {
        ctx.fillStyle = i >= 5 && errors.length ? '#f87171' : '#a7f3d0';
        ctx.fillText(l, w * 0.04, h * 0.05 + i * h * 0.12);
      });
    });
    this.acc = 0;
    this.frames = 0;
    this.worst = 0;
  }
}
