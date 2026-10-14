// Contenido de la clase. Para cambiar de tema basta con editar este archivo
// (o exportar otra lección y seleccionarla en index.ts).
export interface Slide {
  title: string;
  bullets: string[];
}

export interface Lesson {
  topic: string;
  level: string;
  slides: Slide[];
  /** Rango de tiempo recomendado por diapositiva (segundos) para evaluar el ritmo. */
  paceWindow: [number, number];
}

export const lesson: Lesson = {
  topic: 'Introducción a la fotosíntesis',
  level: 'Educación superior · Biología general',
  paceWindow: [25, 80],
  slides: [
    {
      title: 'Introducción a la fotosíntesis',
      bullets: ['Proceso por el cual las plantas convierten luz en energía química', 'Base de casi todas las cadenas alimentarias', 'Objetivo de hoy: entender entradas, salidas y etapas'],
    },
    {
      title: 'La ecuación general',
      bullets: ['6 CO₂ + 6 H₂O + luz → C₆H₁₂O₆ + 6 O₂', 'Entradas: dióxido de carbono, agua y luz', 'Salidas: glucosa y oxígeno'],
    },
    {
      title: 'Dónde ocurre: el cloroplasto',
      bullets: ['Tilacoides: membranas con clorofila', 'Granas: pilas de tilacoides', 'Estroma: fluido donde ocurre el ciclo de Calvin'],
    },
    {
      title: 'Etapa 1: reacciones dependientes de luz',
      bullets: ['Ocurren en la membrana del tilacoide', 'La luz excita la clorofila y se divide el agua', 'Se produce ATP, NADPH y se libera O₂'],
    },
    {
      title: 'Etapa 2: ciclo de Calvin',
      bullets: ['Ocurre en el estroma', 'Usa ATP y NADPH para fijar CO₂', 'Resultado: azúcares (G3P) que forman glucosa'],
    },
    {
      title: 'Cierre y preguntas',
      bullets: ['Luz → ATP/NADPH → azúcares', '¿Qué pasaría si falta agua o luz?', '¿Dudas? Atiende a quienes levantan la mano'],
    },
  ],
};
