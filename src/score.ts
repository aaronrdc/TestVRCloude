import { lesson } from './lesson';
import { QUALITY_SCORE } from './questions';
import { Session } from './state';

export interface ScoreItem {
  label: string;
  value: number; // 0-100
  detail: string;
}

export interface Summary {
  items: ScoreItem[];
  total: number;
  seconds: number;
  tips: string[];
}

const pct = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 100);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function computeSummary(s: Session): Summary {
  const seconds = s.endAt - s.startAt;
  const total = lesson.slides.length;

  const coverage = s.visited.size / total;

  const handsTotal = s.hands.raised;
  const participation = handsTotal ? s.hands.attended / handsTotal : 1;

  const { good, ok, poor } = s.answers;
  const answered = good + ok + poor;
  const quality = answered ? (good * QUALITY_SCORE.good + ok * QUALITY_SCORE.ok + poor * QUALITY_SCORE.poor) / answered : 1;

  const distTotal = s.distractions.total;
  const attention = distTotal ? s.distractions.recovered / distTotal : 1;

  const visitedIdx = [...s.visited];
  const [lo, hi] = lesson.paceWindow;
  const inWindow = visitedIdx.filter((i) => s.slideSeconds[i] >= lo && s.slideSeconds[i] <= hi).length;
  const pace = visitedIdx.length ? inWindow / visitedIdx.length : 0;

  const items: ScoreItem[] = [
    { label: 'Cobertura del contenido', value: pct(coverage), detail: `${s.visited.size} de ${total} diapositivas` },
    { label: 'Atención a participaciones', value: pct(participation), detail: handsTotal ? `${s.hands.attended} de ${handsTotal} manos atendidas` : 'Sin manos levantadas' },
    { label: 'Calidad de las respuestas', value: pct(quality), detail: answered ? `${good} precisas · ${ok} parciales · ${poor} débiles` : 'Sin preguntas respondidas' },
    { label: 'Manejo de la atención', value: pct(attention), detail: distTotal ? `${s.distractions.recovered} de ${distTotal} distracciones recuperadas` : 'Sin distracciones' },
    { label: 'Ritmo de la clase', value: pct(pace), detail: `${inWindow} de ${visitedIdx.length} diapositivas entre ${lo}-${hi} s` },
  ];

  const totalScore = Math.round(avg(items.map((i) => i.value)));

  const tips: string[] = [];
  if (coverage < 1) tips.push('No cubriste todo el contenido: planifica el tiempo para llegar al cierre.');
  if (s.hands.missed > 0) tips.push(`Dejaste ${s.hands.missed} mano(s) sin atender: haz pausas para dar la palabra.`);
  if (poor > 0) tips.push(`${poor} respuesta(s) imprecisa(s) o evasiva(s): repasa el contenido y responde con ejemplos.`);
  if (ok > good && ok > 0) tips.push('Muchas respuestas fueron parciales: añade ejemplos o conecta con lo visto.');
  if (s.distractions.ignored > 0) tips.push(`Ignoraste ${s.distractions.ignored} distracción(es): mira al grupo y llama la atención con calma.`);
  const slow = visitedIdx.filter((i) => s.slideSeconds[i] > hi).length;
  const fast = visitedIdx.filter((i) => s.slideSeconds[i] < lo).length;
  if (fast > slow && fast > 0) tips.push('Ritmo acelerado en varias diapositivas: da tiempo para asimilar.');
  if (slow > fast && slow > 0) tips.push('Te detuviste mucho en algunas diapositivas: sintetiza para mantener el interés.');
  if (s.hands.responseTimes.length) tips.push(`Tiempo medio de respuesta a manos: ${avg(s.hands.responseTimes).toFixed(1)} s.`);
  if (!tips.length) tips.push('¡Muy buena sesión! Intenta de nuevo para mejorar tu puntuación.');

  return { items, total: totalScore, seconds, tips: tips.slice(0, 8) };
}

export const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
