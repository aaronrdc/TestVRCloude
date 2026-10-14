import * as THREE from 'three';
import { Types, createComponent } from '@iwsdk/core';
import { CanvasPanel, FONT, roundRect, wrapText } from './panel';

export const enum Mood {
  Idle = 0,
  Distracted = 1,
  HandRaised = 2,
  Happy = 3,
  Speaking = 4,
}

export const Student = createComponent(
  'Student',
  {
    mood: { type: Types.Int8, default: Mood.Idle },
    since: { type: Types.Float32, default: 0 },
  },
  'Estado del estudiante virtual',
);

export const NAMES = ['Ana', 'Luis', 'Marta', 'Diego', 'Sofía', 'Pablo', 'Valeria', 'Andrés'];

export interface StudentRig {
  name: string;
  bubble: CanvasPanel;
  bubbleUntil: number;
  group: THREE.Group;
  head: THREE.Mesh;
  arm: THREE.Mesh;
  icon: THREE.Mesh;
  iconMaterials: Record<'hand' | 'chat' | 'ok' | 'talk', THREE.MeshBasicMaterial>;
  baseY: number;
  phase: number; // desfase para que no se muevan al unísono
  neighborSide: number; // hacia qué lado voltea al distraerse
}

const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xd8a47f, 0xb77a50, 0xf3d1a5];
const SHIRT = [0x2563eb, 0x16a34a, 0xdb2777, 0x9333ea, 0xea580c, 0x0891b2, 0xca8a04, 0x475569];

function makeIcon(label: string, color: string): THREE.MeshBasicMaterial {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold 78px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthTest: false });
}

export function buildRoom(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x0f172a);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(2, 5, 3);
  scene.add(sun);

  const mat = (c: number, rough = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(11, 10), mat(0x8b7355));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -2.5);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(11, 10), mat(0xdbe3ee));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 3.2, -2.5);
  scene.add(ceiling);

  const wallMat = mat(0xcbd5e1);
  const walls: [number, number, number, number, number][] = [
    // [ancho, x, z, rotY, alto]
    [11, 0, -7.5, 0, 3.2], // fondo
    [11, 0, 2.5, Math.PI, 3.2], // detrás del docente
    [10, -5.5, -2.5, Math.PI / 2, 3.2], // izquierda
    [10, 5.5, -2.5, -Math.PI / 2, 3.2], // derecha
  ];
  for (const [w, x, z, ry, h] of walls) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    wall.position.set(x, h / 2, z);
    wall.rotation.y = ry;
    scene.add(wall);
  }

  // Atril del docente
  const lectern = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.5), mat(0x5b3a1e));
  lectern.position.set(0, 0.45, -0.9);
  scene.add(lectern);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.6), mat(0x3f2a14));
  top.position.set(0, 0.92, -0.9);
  top.rotation.x = -0.15;
  scene.add(top);
}

/** Pantalla de apoyo al fondo del aula (el docente la lee mientras mira al grupo). */
export function buildScreen(scene: THREE.Scene): CanvasPanel {
  const panel = new CanvasPanel(3.6, 2.025, 480);
  panel.mesh.position.set(0, 1.9, -7.45);
  scene.add(panel.mesh);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.2), new THREE.MeshBasicMaterial({ color: 0x111827 }));
  frame.position.set(0, 1.9, -7.46);
  scene.add(frame);
  return panel;
}

export function buildStudent(scene: THREE.Scene, i: number, x: number, z: number): StudentRig {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const std = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });

  const desk = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 0.5), std(0x6b7280));
  desk.position.set(0, 0.36, 0.5);
  g.add(desk);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.35, 4, 10), std(SHIRT[i % SHIRT.length]));
  torso.position.set(0, 0.95, 0);
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), std(SKIN[i % SKIN.length]));
  head.position.set(0, 1.4, 0);
  g.add(head);
  // nariz: indica hacia dónde mira
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), std(0xd1a07a));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.01, 0.15);
  head.add(nose);

  // brazo derecho con pivote en el hombro
  const armGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.5, 8);
  armGeo.translate(0, -0.25, 0);
  const arm = new THREE.Mesh(armGeo, std(SHIRT[i % SHIRT.length]));
  arm.position.set(0.27, 1.15, 0.05);
  arm.rotation.x = -1.2; // reposo: apoyado sobre el escritorio
  g.add(arm);

  // Zona de impacto generosa y casi invisible para apuntar con el rayo.
  // (opacity 0 pero visible=true: algunos raycasters ignoran objetos invisibles)
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.2, 0.7),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.position.set(0, 0.95, 0.25);
  g.add(hit);

  const iconMaterials = {
    hand: makeIcon('?', '#16a34a'),
    chat: makeIcon('…', '#f59e0b'),
    ok: makeIcon('✓', '#2563eb'),
    talk: makeIcon('…', '#2563eb'),
  };
  // Plano (no Sprite): los estudiantes miran siempre a +z, no hace falta billboard.
  // OJO: Sprite.raycast lanza TypeError si el Raycaster no tiene cámara (caso de los
  // punteros XR de IWSDK) y eso congela el bucle de render dentro del casco.
  const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), iconMaterials.hand);
  icon.position.set(0, 1.85, 0);
  icon.renderOrder = 10;
  icon.visible = false;
  icon.raycast = () => {}; // decorativo: nunca intercepta el rayo
  g.add(icon);

  const bubble = new CanvasPanel(0.95, 0.32, 480);
  bubble.mesh.position.set(0, 2.2, 0.1);
  bubble.mesh.visible = false;
  bubble.mesh.raycast = () => {}; // decorativo: el clic lo recibe el estudiante
  g.add(bubble.mesh);

  g.rotation.y = 0; // mira hacia +z (el docente)
  scene.add(g);

  return { name: NAMES[i % NAMES.length], bubble, bubbleUntil: 0, group: g, head, arm, icon, iconMaterials, baseY: 1.4, phase: i * 1.7, neighborSide: i % 2 === 0 ? 1 : -1 };
}

export function drawLabel(panel: CanvasPanel, text: string, enabled = true, hovered = false) {
  panel.draw((ctx, w, h) => {
    roundRect(ctx, 6, 6, w - 12, h - 12, h * 0.28);
    ctx.fillStyle = !enabled ? '#475569' : hovered ? '#60a5fa' : '#3b82f6';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `600 ${Math.round(h * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

/** Muestra un globo de texto sobre el estudiante durante `seconds`. */
export function say(rig: StudentRig, text: string, now: number, seconds = 3.5) {
  rig.bubble.draw((ctx, w, h) => {
    roundRect(ctx, 4, 4, w - 8, h - 8, h * 0.25);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = `600 ${h * 0.24}px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    wrapText(ctx, text, w * 0.05, h * 0.14, w * 0.9, h * 0.29);
  });
  rig.bubble.mesh.visible = true;
  rig.bubbleUntil = now + seconds;
}

/** Botón de opción de respuesta (texto largo, alineado a la izquierda). */
export function drawOption(panel: CanvasPanel, index: number, text: string, hovered = false) {
  panel.draw((ctx, w, h) => {
    roundRect(ctx, 4, 4, w - 8, h - 8, h * 0.25);
    ctx.fillStyle = hovered ? '#1d4ed8' : '#1e40af';
    ctx.fill();
    ctx.fillStyle = '#bfdbfe';
    ctx.font = `700 ${h * 0.34}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`${String.fromCharCode(65 + index)}`, w * 0.025, h / 2 + 2);
    ctx.fillStyle = '#fff';
    ctx.font = `500 ${h * 0.25}px ${FONT}`;
    ctx.textBaseline = 'top';
    wrapText(ctx, text, w * 0.07, h * 0.15, w * 0.91, h * 0.3);
  });
}
