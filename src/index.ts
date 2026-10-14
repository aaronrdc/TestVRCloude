import { RayInteractable, ReferenceSpaceType, SessionMode, World } from '@iwsdk/core';
import { Student, buildRoom, buildScreen, buildStudent, drawLabel } from './classroom';
import { CanvasPanel } from './panel';
import { endTeaching, goToSlide, session, startTeaching } from './state';
import { ButtonId, ClassroomSystem, Scene3D, bindScene, beep } from './systems';

const container = document.getElementById('scene-container') as HTMLDivElement;
const enterBtn = document.getElementById('enter-vr') as HTMLButtonElement;
const hint = document.getElementById('hint') as HTMLDivElement;

async function main() {
  const world = await World.create(container, {
    xr: {
      sessionMode: SessionMode.ImmersiveVR,
      referenceSpace: ReferenceSpaceType.LocalFloor,
      offer: 'none',
      features: { handTracking: true },
    },
    features: { locomotion: false, grabbing: false },
  });

  const scene = world.scene;
  buildRoom(scene);
  const screen = buildScreen(scene);

  // --- Estudiantes: 2 filas de 4 ---
  const rigs: Scene3D['rigs'] = new Map();
  const xs = [-2.25, -0.75, 0.75, 2.25];
  const rows = [-3.3, -4.9];
  let n = 0;
  for (const z of rows) {
    for (const x of xs) {
      const rig = buildStudent(scene, n++, x, z);
      const ent = world.createTransformEntity(rig.group);
      ent.addComponent(Student);
      ent.addComponent(RayInteractable);
      rigs.set(ent.index, rig);
    }
  }

  // --- Paneles y botones ---
  const center = new CanvasPanel(1.8, 1.3, 640);
  center.mesh.position.set(0, 1.85, -1.9);
  scene.add(center.mesh);

  const hud = new CanvasPanel(1.2, 0.3, 700);
  hud.mesh.position.set(-0.75, 1.95, -1.5);
  hud.mesh.rotation.y = 0.35;
  scene.add(hud.mesh);

  const dialog = new CanvasPanel(1.5, 0.6, 720);
  dialog.mesh.position.set(0, 1.45, -1.55);
  dialog.mesh.visible = false;
  scene.add(dialog.mesh);

  const labels: Record<ButtonId, string> = {
    start: 'Comenzar clase',
    retry: 'Repetir sesión',
    prev: '◀ Anterior',
    next: 'Siguiente ▶',
    end: 'Terminar',
    opt0: '',
    opt1: '',
    opt2: '',
  };
  const panels = {} as Record<ButtonId, CanvasPanel>;
  const buttonByEntity: Scene3D['buttonByEntity'] = new Map();
  const place: Record<ButtonId, [number, number, number, number, number]> = {
    // [x, y, z, ancho, alto]
    start: [0, 1.0, -1.85, 0.7, 0.18],
    retry: [0, 1.0, -1.85, 0.7, 0.18],
    prev: [-0.4, 0.98, -0.78, 0.36, 0.13],
    next: [0, 0.98, -0.78, 0.36, 0.13],
    end: [0.4, 0.98, -0.78, 0.36, 0.13],
    opt0: [0, 1.0, -1.5, 1.5, 0.16],
    opt1: [0, 0.82, -1.5, 1.5, 0.16],
    opt2: [0, 0.64, -1.5, 1.5, 0.16],
  };
  for (const id of Object.keys(place) as ButtonId[]) {
    const [x, y, z, w, h] = place[id];
    const p = new CanvasPanel(w, h, 700);
    p.mesh.position.set(x, y, z);
    if (id === 'prev' || id === 'next' || id === 'end') p.mesh.rotation.x = -0.6;
    scene.add(p.mesh);
    if (id.startsWith('opt')) p.mesh.visible = false;
    if (!id.startsWith('opt')) drawLabel(p, labels[id]);
    const ent = world.createTransformEntity(p.mesh);
    ent.addComponent(RayInteractable);
    panels[id] = p;
    buttonByEntity.set(ent.index, id);
  }

  bindScene({ rigs, buttonByEntity, buttons: { panels, labels }, screen, center, hud, dialog });
  world.registerSystem(ClassroomSystem);

  // --- Botón DOM para entrar en VR ---
  const xr = navigator.xr;
  const supported = xr ? await xr.isSessionSupported('immersive-vr').catch(() => false) : false;
  if (supported) {
    enterBtn.disabled = false;
    enterBtn.textContent = 'Entrar en VR';
    hint.textContent = 'Con el Quest 3: abre esta página en el Quest Browser y pulsa el botón.';
    enterBtn.onclick = () => {
      beep(440, 0.05); // desbloquea el audio con el gesto del usuario
      world.launchXR();
    };
  } else {
    enterBtn.textContent = 'WebXR no disponible';
    hint.textContent = 'Abre esta página en el Quest Browser (HTTPS). En escritorio, usa el emulador de desarrollo (npm run dev).';
  }
  // Para depuración desde la consola.
  (window as unknown as { world: World; aula: unknown }).world = world;
  (window as unknown as { aula: unknown }).aula = { session, startTeaching, endTeaching, goToSlide, Student, sys: () => world.getSystem(ClassroomSystem) };
}

main().catch((err) => {
  console.error(err);
  hint.textContent = 'Error al iniciar: ' + (err instanceof Error ? err.message : String(err));
});
