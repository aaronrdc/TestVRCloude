import { Entity, Pressed, RayInteractable, createSystem } from '@iwsdk/core';
import * as THREE from 'three';
import { Mood, Student, StudentRig, drawOption, say } from './classroom';
import { distractedLines, pickQuestion, recoveredLines, shuffle } from './questions';
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
import { drawCenter, drawDialog, drawHud, drawScreen } from './ui';
import { drawLabel } from './classroom';
import { lesson } from './lesson';

export type ButtonId = 'start' | 'retry' | 'prev' | 'next' | 'end' | 'opt0' | 'opt1' | 'opt2';
const OPTION_IDS: ButtonId[] = ['opt0', 'opt1', 'opt2'];


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
  dialog: CanvasPanel;
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
  private tmp2 = new THREE.Vector3();

  update(delta: number, _time: number) {
    const t = now();
    const s = ctxRef;
    if (!s) return;

    if (session.phase !== this.lastPhase) {
      this.onPhaseChange();
      this.lastPhase = session.phase;
    }

    this.handlePresses(t);

    this.updateDialogue(t, delta);
    if (session.phase === 'teaching' && !session.dialogue) this.scheduleEvents(t);
    this.animateStudents(t, delta);
    this.updateBubbles(t);
    const asking = session.dialogue?.stage === 'asking';
    OPTION_IDS.forEach((id) => (s.buttons.panels[id].mesh.visible = !!asking));

    if (session.dirty) {
      this.redraw();
      this.nextHudAt = t + 0.5;
      session.dirty = false;
    } else if (session.phase === 'teaching' && t >= this.nextHudAt) {
      drawHud(s.hud); // solo el reloj/toast: evita resubir texturas grandes cada 0.5 s
      this.nextHudAt = t + 0.5;
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
    this.queries.students.entities.forEach((e) => {
      const rig = s.rigs.get(e.index);
      if (rig) rig.bubble.mesh.visible = false;
    });
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
      case 'opt0':
      case 'opt1':
      case 'opt2':
        this.answer(OPTION_IDS.indexOf(id));
        break;
      case 'prev':
        if (session.phase === 'teaching' && !session.dialogue) goToSlide(session.slide - 1);
        break;
      case 'next':
        if (session.phase !== 'teaching' || session.dialogue) break;
        if (session.slide === lesson.slides.length - 1) toast('Última diapositiva. Pulsa "Terminar" cuando acabes.', 'info');
        else goToSlide(session.slide + 1);
        break;
      case 'end':
        if (session.phase === 'teaching') endTeaching();
        break;
    }
  }

  private onStudent(ent: Entity, t: number) {
    if (session.dialogue) {
      toast('Responde primero la pregunta abierta', 'info', 2);
      return;
    }
    const mood = ent.getValue(Student, 'mood') as number;
    const since = ent.getValue(Student, 'since') as number;
    if (mood === Mood.HandRaised) {
      session.hands.attended++;
      session.hands.responseTimes.push(t - since);
      ent.setValue(Student, 'mood', Mood.Speaking);
      ent.setValue(Student, 'since', t);
      this.openDialogue(ent.index);
      beep(880, 0.15);
    } else if (mood === Mood.Distracted) {
      session.distractions.recovered++;
      ent.setValue(Student, 'mood', Mood.Happy);
      ent.setValue(Student, 'since', t);
      const rig = ctxRef.rigs.get(ent.index);
      if (rig) say(rig, recoveredLines[Math.floor(Math.random() * recoveredLines.length)], t);
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
      const rig = ctxRef.rigs.get(pick.index);
      if (rig) say(rig, distractedLines[Math.floor(Math.random() * distractedLines.length)], t, 4);
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
        const toCam = this.tmp2.copy(this.tmp).sub(rig.group.position);
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
      } else if (mood === Mood.Speaking) {
        icon.material = rig.iconMaterials.talk;
        icon.visible = true;
      } else icon.visible = false;
      icon.position.y = 1.85 + Math.sin(t * 4 + rig.phase) * 0.03;
    });
  }

  private openDialogue(entityIndex: number) {
    const rig = ctxRef.rigs.get(entityIndex);
    if (!rig) return;
    const { id, q } = pickQuestion(session.slide, session.asked);
    if (id >= 0) session.asked.add(id);
    session.dialogue = {
      entity: entityIndex,
      name: rig.name,
      question: q,
      options: shuffle(q.options),
      stage: 'asking',
      closeAt: 0,
    };
    session.dirty = true;
  }

  private answer(i: number) {
    const d = session.dialogue;
    if (!d || d.stage !== 'asking') return;
    const opt = d.options[i];
    if (!opt) return;
    d.chosen = opt;
    d.stage = 'feedback';
    d.closeAt = now() + 4.5;
    session.answers[opt.quality]++;
    const rig = ctxRef.rigs.get(d.entity);
    if (rig) say(rig, opt.reply, now(), 4);
    beep(opt.quality === 'good' ? 880 : opt.quality === 'ok' ? 600 : 260, 0.18, opt.quality === 'poor' ? 'square' : 'sine');
    session.dirty = true;
  }

  /** Cierra el diálogo tras la retroalimentación y pausa los temporizadores mientras está abierto. */
  private updateDialogue(t: number, delta: number) {
    const d = session.dialogue;
    if (!d) return;
    // mientras hay diálogo, los temporizadores de manos/distracciones no avanzan
    this.nextEventAt += delta;
    this.queries.students.entities.forEach((e) => {
      const mood = e.getValue(Student, 'mood') as number;
      if (mood === Mood.HandRaised || mood === Mood.Distracted) e.setValue(Student, 'since', (e.getValue(Student, 'since') as number) + delta);
    });
    if (d.stage === 'feedback' && t >= d.closeAt) {
      const ent = [...this.queries.students.entities].find((e) => e.index === d.entity);
      if (ent) {
        ent.setValue(Student, 'mood', Mood.Happy);
        ent.setValue(Student, 'since', t);
      }
      session.dialogue = null;
      session.dirty = true;
    }
  }

  private updateBubbles(t: number) {
    ctxRef.rigs.forEach((rig) => {
      if (rig.bubble.mesh.visible && t > rig.bubbleUntil) rig.bubble.mesh.visible = false;
    });
  }

  private redraw() {
    const s = ctxRef;
    drawScreen(s.screen);
    drawCenter(s.center);
    drawHud(s.hud);
    drawDialog(s.dialog);
    const d = session.dialogue;
    OPTION_IDS.forEach((id, i) => {
      if (d && d.stage === 'asking' && d.options[i]) drawOption(s.buttons.panels[id], i, d.options[i].text);
    });
    const nextLabel = session.slide === lesson.slides.length - 1 ? 'Final' : 'Siguiente ▶';
    drawLabel(s.buttons.panels.start, s.buttons.labels.start);
    drawLabel(s.buttons.panels.retry, s.buttons.labels.retry);
    drawLabel(s.buttons.panels.prev, '◀ Anterior', session.slide > 0 && !d);
    drawLabel(s.buttons.panels.next, nextLabel, session.slide < lesson.slides.length - 1 && !d);
    drawLabel(s.buttons.panels.end, 'Terminar');
  }
}
