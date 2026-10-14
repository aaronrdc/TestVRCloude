import { lesson } from './lesson';
import { Option, Question } from './questions';

export type Phase = 'menu' | 'teaching' | 'summary';
export type ToastTone = 'info' | 'good' | 'warn';

export interface Dialogue {
  entity: number; // entity.index del estudiante que pregunta
  name: string;
  question: Question;
  options: Option[]; // ya barajadas
  stage: 'asking' | 'feedback';
  chosen?: Option;
  closeAt: number;
}

export interface Session {
  phase: Phase;
  slide: number;
  startAt: number;
  endAt: number;
  slideEnterAt: number;
  slideSeconds: number[];
  visited: Set<number>;
  hands: { raised: number; attended: number; missed: number; responseTimes: number[] };
  distractions: { total: number; recovered: number; ignored: number };
  answers: { good: number; ok: number; poor: number };
  asked: Set<number>;
  dialogue: Dialogue | null;
  directed: number; // clics sobre estudiantes sin necesidad
  toast: { text: string; tone: ToastTone; until: number };
  summaryPage: number;
  dirty: boolean; // fuerza redibujar paneles
}

export const now = () => performance.now() / 1000;

function fresh(): Session {
  return {
    phase: 'menu',
    slide: 0,
    startAt: 0,
    endAt: 0,
    slideEnterAt: 0,
    slideSeconds: lesson.slides.map(() => 0),
    visited: new Set(),
    hands: { raised: 0, attended: 0, missed: 0, responseTimes: [] },
    distractions: { total: 0, recovered: 0, ignored: 0 },
    answers: { good: 0, ok: 0, poor: 0 },
    asked: new Set(),
    dialogue: null,
    directed: 0,
    toast: { text: '', tone: 'info', until: 0 },
    summaryPage: 0,
    dirty: true,
  };
}

export const session: Session = fresh();

export function resetSession() {
  Object.assign(session, fresh());
}

export function toast(text: string, tone: ToastTone = 'info', seconds = 3) {
  session.toast = { text, tone, until: now() + seconds };
  session.dirty = true;
}

/** Cierra el tiempo acumulado de la diapositiva actual. */
export function commitSlideTime() {
  session.slideSeconds[session.slide] += now() - session.slideEnterAt;
  session.slideEnterAt = now();
}

export function goToSlide(next: number) {
  const clamped = Math.max(0, Math.min(lesson.slides.length - 1, next));
  if (clamped === session.slide) return;
  commitSlideTime();
  session.slide = clamped;
  session.visited.add(clamped);
  session.dirty = true;
}

export function startTeaching() {
  resetSession();
  session.phase = 'teaching';
  session.startAt = now();
  session.slideEnterAt = session.startAt;
  session.visited.add(0);
  toast('¡Comienza la clase! Usa los botones del atril.', 'info', 4);
}

export function endTeaching() {
  commitSlideTime();
  session.phase = 'summary';
  session.dialogue = null;
  session.endAt = now();
  session.dirty = true;
}

export const elapsed = () => (session.phase === 'teaching' ? now() - session.startAt : session.endAt - session.startAt);
