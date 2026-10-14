// Banco de preguntas de los estudiantes (diálogos nivel A: texto).
// Cada pregunta se asocia a las diapositivas donde tiene sentido; al levantar la mano
// un estudiante recibe una pregunta aún no usada de la diapositiva actual.
export type Quality = 'good' | 'ok' | 'poor';

export interface Option {
  text: string; // lo que el docente responde
  quality: Quality;
  reply: string; // reacción breve del estudiante (globo)
  feedback: string; // retroalimentación pedagógica para el docente
}

export interface Question {
  slides: number[]; // diapositivas (índice base 0) donde aplica; [] = genérica
  text: string;
  options: [Option, Option, Option];
}

export const QUALITY_SCORE: Record<Quality, number> = { good: 1, ok: 0.6, poor: 0 };

const f = {
  good: 'Respuesta precisa y completa.',
  ok: 'Correcta pero incompleta: profundiza o da un ejemplo.',
  poor: 'Respuesta incorrecta o evasiva: revisa el concepto antes de responder.',
};

export const questions: Question[] = [
  {
    slides: [0, 1],
    text: '¿Por qué es tan importante la fotosíntesis para los demás seres vivos?',
    options: [
      { text: 'Produce el oxígeno que respiramos y la glucosa que sostiene las cadenas alimentarias.', quality: 'good', reply: '¡Claro, es la base de todo!', feedback: f.good },
      { text: 'Porque las plantas necesitan luz para vivir.', quality: 'ok', reply: 'Mmm, pero ¿y los demás seres vivos?', feedback: f.ok },
      { text: 'Eso lo verás en el examen, no es relevante ahora.', quality: 'poor', reply: 'Ok…', feedback: 'Evitar la pregunta desmotiva la participación.' },
    ],
  },
  {
    slides: [1],
    text: 'En la ecuación, ¿qué sustancia se produce además del oxígeno?',
    options: [
      { text: 'Glucosa (C₆H₁₂O₆): la planta la usa como energía y materia.', quality: 'good', reply: '¡Ah, la glucosa!', feedback: f.good },
      { text: 'Algún azúcar, ahora no recuerdo cuál.', quality: 'ok', reply: '¿Cuál azúcar?', feedback: f.ok },
      { text: 'Dióxido de carbono.', quality: 'poor', reply: 'Pero ese entra, ¿no?', feedback: 'El CO₂ es un reactivo, no un producto.' },
    ],
  },
  {
    slides: [2],
    text: '¿Dónde está la clorofila exactamente?',
    options: [
      { text: 'En las membranas de los tilacoides, dentro del cloroplasto.', quality: 'good', reply: 'Entendido, gracias.', feedback: f.good },
      { text: 'En el cloroplasto.', quality: 'ok', reply: 'Sí, pero ¿en qué parte?', feedback: f.ok },
      { text: 'En el estroma.', quality: 'poor', reply: 'Mmm, creí que era otra parte.', feedback: 'La clorofila está en los tilacoides, no en el estroma.' },
    ],
  },
  {
    slides: [2],
    text: '¿Qué diferencia hay entre grana y estroma?',
    options: [
      { text: 'Las granas son pilas de tilacoides (donde se capta la luz); el estroma es el fluido donde ocurre el ciclo de Calvin.', quality: 'good', reply: '¡Ahora sí lo veo!', feedback: f.good },
      { text: 'Son partes distintas del cloroplasto.', quality: 'ok', reply: '¿Y qué hace cada una?', feedback: f.ok },
      { text: 'Son lo mismo con distinto nombre.', quality: 'poor', reply: 'Qué raro…', feedback: f.poor },
    ],
  },
  {
    slides: [3],
    text: '¿De dónde sale el oxígeno que se libera?',
    options: [
      { text: 'De la división (fotólisis) del agua en las reacciones dependientes de luz.', quality: 'good', reply: '¡Qué interesante!', feedback: f.good },
      { text: 'De la etapa con luz, pero no estoy seguro del origen exacto.', quality: 'ok', reply: 'Hmm, quedo con la duda.', feedback: f.ok },
      { text: 'Del dióxido de carbono que absorbe la planta.', quality: 'poor', reply: 'Ah… ¿seguro?', feedback: 'El O₂ proviene del agua, no del CO₂.' },
    ],
  },
  {
    slides: [3, 4],
    text: '¿Para qué sirven el ATP y el NADPH?',
    options: [
      { text: 'Aportan energía y poder reductor al ciclo de Calvin para fijar el CO₂.', quality: 'good', reply: 'Eso conecta las dos etapas.', feedback: f.good },
      { text: 'Son moléculas con energía.', quality: 'ok', reply: '¿Y luego qué hacen con ella?', feedback: f.ok },
      { text: 'Son los productos finales de la fotosíntesis.', quality: 'poor', reply: 'Creí que era la glucosa…', feedback: 'Son intermediarios; el producto final es la glucosa.' },
    ],
  },
  {
    slides: [4],
    text: '¿Por qué se le llama "ciclo" de Calvin?',
    options: [
      { text: 'Porque se regenera la molécula inicial (RuBP) y el proceso se repite continuamente.', quality: 'good', reply: 'Tiene sentido, gracias.', feedback: f.good },
      { text: 'Porque se repite varias veces.', quality: 'ok', reply: '¿Y qué se repite?', feedback: f.ok },
      { text: 'Porque ocurre durante todo el día.', quality: 'poor', reply: 'No me convence…', feedback: f.poor },
    ],
  },
  {
    slides: [4],
    text: '¿El ciclo de Calvin necesita luz?',
    options: [
      { text: 'No directamente, pero depende del ATP y NADPH que se producen con luz.', quality: 'good', reply: '¡Eso aclara mucho!', feedback: f.good },
      { text: 'Depende, no lo tengo del todo claro.', quality: 'ok', reply: 'Ok, ¿lo revisamos luego?', feedback: f.ok },
      { text: 'Sí, solo funciona con luz directa.', quality: 'poor', reply: 'Mmm, ok.', feedback: 'Es una simplificación incorrecta: la dependencia es indirecta.' },
    ],
  },
  {
    slides: [5],
    text: '¿Qué pasaría si la planta se queda sin agua?',
    options: [
      { text: 'Cerraría estomas, bajaría el CO₂ y faltaría agua para la fotólisis: la fotosíntesis disminuiría.', quality: 'good', reply: 'Muy claro, gracias.', feedback: f.good },
      { text: 'Se marchitaría.', quality: 'ok', reply: 'Sí, ¿pero por qué afecta a la fotosíntesis?', feedback: f.ok },
      { text: 'Nada, usaría más luz.', quality: 'poor', reply: 'Eh… no creo.', feedback: f.poor },
    ],
  },
  {
    slides: [5],
    text: '¿Podría resumir la idea central en una frase?',
    options: [
      { text: 'La luz se convierte en ATP y NADPH, que se usan para fijar CO₂ y formar azúcares.', quality: 'good', reply: '¡Perfecto, eso me sirve!', feedback: f.good },
      { text: 'Las plantas hacen comida con luz.', quality: 'ok', reply: 'Un poco vago, pero vale.', feedback: f.ok },
      { text: 'No hay una idea central, son muchos datos.', quality: 'poor', reply: 'Vaya…', feedback: f.poor },
    ],
  },
];

// Pregunta genérica por si se agotan las específicas.
export const fallbackQuestion: Question = {
  slides: [],
  text: '¿Puede repetir el último concepto, por favor?',
  options: [
    { text: 'Claro: lo explico con un ejemplo cotidiano y verifico si quedó claro.', quality: 'good', reply: 'Gracias, ahora sí.', feedback: f.good },
    { text: 'Lo repito igual, pero más despacio.', quality: 'ok', reply: 'Gracias.', feedback: f.ok },
    { text: 'Ya lo dije, presta más atención.', quality: 'poor', reply: 'Perdón…', feedback: 'Una respuesta defensiva reduce la confianza del grupo.' },
  ],
};

export const distractedLines = [
  'psst… ¿qué hacemos hoy?',
  '¿Viste el mensaje?',
  'jeje… luego te cuento',
  '¿Ya es la hora de salida?',
];

export const recoveredLines = [
  'Perdón, ¿puede repetir?',
  'Disculpe, ya estoy atento.',
  'Gracias por avisarme.',
  'Lo siento, sigo con usted.',
];

/** Elige una pregunta no usada que aplique a la diapositiva actual. */
export function pickQuestion(slide: number, asked: Set<number>): { id: number; q: Question } {
  const pool = (pred: (q: Question) => boolean) =>
    questions.map((q, id) => ({ q, id })).filter(({ q, id }) => !asked.has(id) && pred(q));
  const candidates = pool((q) => q.slides.includes(slide));
  const any = candidates.length ? candidates : pool(() => true);
  if (!any.length) return { id: -1, q: fallbackQuestion };
  return any[Math.floor(Math.random() * any.length)];
}

export function shuffle<T>(xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
