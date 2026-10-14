import { Entity, Pressed, RayInteractable, createSystem } from '@iwsdk/core';
import * as THREE from 'three';
import { Mood, Student, StudentRig } from './classroom';
import {
  endTeaching,
  goToSlide,
  now,
  resetSession,
  session,
  startTeaching,
  toast,
} from './state';
import { CanvasPanel } from './panel';
import { drawCenter, drawHud, drawScreen } from './ui';
import { drawLabel } from './classroom';
import { lesson } from './lesson';

export type ButtonId = 'start' | 'retry' | 'prev' | 'next' | 'end';


export interface Buttons {
  panels: Record<ButtonId, CanvasPanel>;
  labels: Record<ButtonId, string>;
}

export interface Scene3D {
  rigs: Map<number, StudentRig>; // entity.index -> rig
  buttonByEntity: Map<number, ButtonId>;
  buttons: Buttons;
  screen: CanvasPanel;
  center: CanvasPanel;
  hud: CanvasPanel;
}

let ctxRef: Scene3D;
export const bindScene = (s: Scene3D) => (ctxRef = s);

// ---- audio mínimo para dar retroalimentación sin assets ----
let audio: AudioContext | undefined;
export function beep(freq: number, dur = 0.12, type: OscillatorType = 'sine') {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.06;
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur);
  } catch {
    /* sin audio: no es crítico */
  }
}

const HAND_TIMEOUT = 12;
const DISTRACT_TIMEOUT = 20;
const MAX_ACTIVE = 3;

export class ClassroomSystem extends createSystem({
  students: { required: [Student] },
  clickables: { required: [RayInteractable] },
}) {
  private wasPressed = new Set<number>();
  private nextEventAt = 0;
  private lastPhase = '';
  private nextHudAt = 0;
  private tmp = new THREE.Vector3();

  update(delta: number, _time: number) {
    const t = now();
    const s = ctxRef;
    if (!s) return;

    if (session.phase !== this.lastPhase) {
      this.onPhaseChange();
      this.lastPhase = session.phase;
    }

    this.handlePresses(t);

    if (session.phase === 'teaching') this.scheduleEvents(t);
    this.animateStudents(t, delta);

    if (session.dirty || (session.phase === 'teaching' && t >= this.nextHudAt)) {
      this.redraw();
      this.nextHudAt = t + 0.5;
      session.dirty = false;
    }
  }

  private onPhaseChange() {
    const s = ctxRef;
    this.nextEventAt = now() + 15;
    // reiniciar estudiantes
    this.queries.students.entities.forEach((e) => {
      e.setValue(Student, 'mood', Mood.Idle);
    });
    const show = (id: ButtonId, on: boolean) => (s.buttons.panels[id].mesh.visible = on);
    show('start', session.phase === 'menu');
    show('retry', session.phase === 'summary');
    show('prev', session.phase === 'teaching');
    show('next', session.phase === 'teaching');
    show('end', session.phase === 'teaching');
    session.dirty = true;
  }

  private handlePresses(t: number) {
    const s = ctxRef;
    this.queries.clickables.entities.forEach((e) => {
      const down = e.hasComponent(Pressed);
      const was = this.wasPressed.has(e.index);
      if (down) this.wasPressed.add(e.index);
      else this.wasPressed.delete(e.index);
      if (!down || was) return; // solo flanco de subida

      const btn = s.buttonByEntity.get(e.index);
      if (btn) return this.onButton(btn);
      if (s.rigs.has(e.index) && session.phase === 'teaching') this.onStudent(e, t);
    });
  }

  private onButton(id: ButtonId) {
    beep(660, 0.08);
    switch (id) {
      case 'start':
      case 'retry':
        if (session.phase === 'menu' || session.phase === 'summary') {
          if (id === 'retry') resetSession();
          startTeaching();
        }
        break;
      case 'prev':
        if (session.phase === 'teaching') goToSlide(session.slide - 1);
        break;
      case 'next':
        if (session.phase !== 'teaching') break;
        if (session.slide === lesson.slides.length - 1) toast('Última diapositiva. Pulsa "Terminar" cuando acabes.', 'info');
        else goToSlide(session.slide + 1);
        break;
      case 'end':
        if (session.phase === 'teaching') endTeaching();
        break;
    }
  }

  private onStudent(ent: Entity, t: number) {
    const mood = ent.getValue(Student, 'mood') as number;
    const since = ent.getValue(Student, 'since') as number;
    if (mood === Mood.HandRaised) {
      session.hands.attended++;
      session.hands.responseTimes.push(t - since);
      ent.setValue(Student, 'mood', Mood.Happy);
      ent.setValue(Student, 'since', t);
      toast(`Participación atendida (${(t - since).toFixed(1)} s)`, 'good');
      beep(880, 0.15);
    } else if (mood === Mood.Distracted) {
      session.distractions.recovered++;
      ent.setValue(Student, 'mood', Mood.Happy);
      ent.setValue(Student, 'since', t);
      toast('Atención recuperada', 'good');
      beep(740, 0.15);
    } else {
      session.directed++;
      toast('Ese estudiante está atento. Busca ? o …', 'info', 2);
    }
    session.dirty = true;
  }

  private scheduleEvents(t: number) {
    const all = [...this.queries.students.entities];
    // vencimientos
    all.forEach((e) => {
      const mood = e.getValue(Student, 'mood') as number;
      const since = e.getValue(Student, 'since') as number;
      if (mood === Mood.HandRaised && t - since > HAND_TIMEOUT) {
        session.hands.missed++;
        e.setValue(Student, 'mood', Mood.Idle);
        toast('Una mano quedó sin atender', 'warn');
        beep(220, 0.2, 'square');
      } else if (mood === Mood.Distracted && t - since > DISTRACT_TIMEOUT) {
        session.distractions.ignored++;
        e.setValue(Student, 'mood', Mood.Idle);
        toast('Una distracción quedó sin atender', 'warn');
      } else if (mood === Mood.Happy && t - since > 2.5) {
        e.setValue(Student, 'mood', Mood.Idle);
      }
    });

    if (t < this.nextEventAt) return;
    this.nextEventAt = t + 14 + Math.random() * 12;

    const active = all.filter((e) => (e.getValue(Student, 'mood') as number) === Mood.HandRaised || (e.getValue(Student, 'mood') as number) === Mood.Distracted).length;
    if (active >= MAX_ACTIVE) return;

    const idle = all.filter((e) => (e.getValue(Student, 'mood') as number) === Mood.Idle);
    if (!idle.length) return;
    const pick = idle[Math.floor(Math.random() * idle.length)];
    if (Math.random() < 0.5) {
      session.hands.raised++;
      pick.setValue(Student, 'mood', Mood.HandRaised);
    } else {
      session.distractions.total++;
      pick.setValue(Student, 'mood', Mood.Distracted);
    }
    pick.setValue(Student, 'since', t);
    beep(520, 0.07);
  }

  private animateStudents(t: number, delta: number) {
    const cam = this.camera;
    cam.getWorldPosition(this.tmp);
    const k = Math.min(1, delta * 6);
    this.queries.students.entities.forEach((e) => {
      const rig = ctxRef.rigs.get(e.index);
      if (!rig) return;
      const mood = e.getValue(Student, 'mood') as number;
      const wobble = Math.sin(t * 1.3 + rig.phase) * 0.02;

      // Cabeza: mira al docente salvo que esté distraído
      let targetYaw = 0;
      let targetPitch = 0;
      if (mood === Mood.Distracted) {
        targetYaw = rig.neighborSide * (0.9 + Math.sin(t * 2 + rig.phase) * 0.15);
        targetPitch = 0.12;
      } else {
        const toCam = this.tmp.clone().sub(rig.group.position);
        targetYaw = THREE.MathUtils.clamp(Math.atan2(toCam.x, toCam.z), -0.6, 0.6);
        targetPitch = mood === Mood.Happy ? Math.sin(t * 12) * 0.15 : 0;
      }
      rig.head.rotation.y += (targetYaw - rig.head.rotation.y) * k;
      rig.head.rotation.x += (targetPitch - rig.head.rotation.x) * k;
      rig.head.position.y = rig.baseY + wobble;

      // Brazo
      const targetArm = mood === Mood.HandRaised ? Math.PI - 0.15 + Math.sin(t * 6) * 0.08 : -1.2;
      rig.arm.rotation.x += (targetArm - rig.arm.rotation.x) * k;

      // Icono
      const icon = rig.icon;
      if (mood === Mood.HandRaised) {
        icon.material = rig.iconMaterials.hand;
        icon.visible = true;
      } else if (mood === Mood.Distracted) {
        icon.material = rig.iconMaterials.chat;
        icon.visible = true;
      } else if (mood === Mood.Happy) {
        icon.material = rig.iconMaterials.ok;
        icon.visible = true;
      } else icon.visible = false;
      icon.position.y = 1.85 + Math.sin(t * 4 + rig.phase) * 0.03;
    });
  }

  private redraw() {
    const s = ctxRef;
    drawScreen(s.screen);
    drawCenter(s.center);
    drawHud(s.hud);
    const nextLabel = session.slide === lesson.slides.length - 1 ? 'Final' : 'Siguiente ▶';
    drawLabel(s.buttons.panels.start, s.buttons.labels.start);
    drawLabel(s.buttons.panels.retry, s.buttons.labels.retry);
    drawLabel(s.buttons.panels.prev, '◀ Anterior', session.slide > 0);
    drawLabel(s.buttons.panels.next, nextLabel, session.slide < lesson.slides.length - 1);
    drawLabel(s.buttons.panels.end, 'Terminar');
  }
}
