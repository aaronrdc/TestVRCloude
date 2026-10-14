import { CanvasPanel, FONT, roundRect, wrapText } from './panel';
import { lesson } from './lesson';
import { computeSummary, fmtTime } from './score';
import { elapsed, now, session } from './state';

const BG = '#0f172a';

export function drawScreen(panel: CanvasPanel) {
  const { phase, slide } = session;
  panel.draw((ctx, w, h) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, w, h * 0.04);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    if (phase === 'menu') {
      ctx.fillStyle = BG;
      ctx.font = `700 ${h * 0.11}px ${FONT}`;
      wrapText(ctx, lesson.topic, w * 0.06, h * 0.2, w * 0.88, h * 0.13);
      ctx.fillStyle = '#475569';
      ctx.font = `${h * 0.06}px ${FONT}`;
      ctx.fillText(lesson.level, w * 0.06, h * 0.55);
      return;
    }

    const s = lesson.slides[slide];
    ctx.fillStyle = BG;
    ctx.font = `700 ${h * 0.09}px ${FONT}`;
    const afterTitle = wrapText(ctx, s.title, w * 0.06, h * 0.12, w * 0.88, h * 0.1);
    ctx.font = `${h * 0.065}px ${FONT}`;
    ctx.fillStyle = '#1e293b';
    let y = Math.max(afterTitle + h * 0.04, h * 0.32);
    for (const b of s.bullets) {
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(w * 0.06, y + h * 0.02, h * 0.03, h * 0.03);
      ctx.fillStyle = '#1e293b';
      y = wrapText(ctx, b, w * 0.06 + h * 0.06, y, w * 0.82, h * 0.082) + h * 0.03;
    }
    ctx.fillStyle = '#64748b';
    ctx.font = `${h * 0.045}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${slide + 1} / ${lesson.slides.length}`, w * 0.96, h * 0.92);
  });
}

/** Panel central: bienvenida (menu) o resumen final (summary). */
export function drawCenter(panel: CanvasPanel) {
  panel.mesh.visible = session.phase !== 'teaching';
  if (session.phase === 'teaching') return;
  panel.draw((ctx, w, h) => {
    roundRect(ctx, 0, 0, w, h, 28);
    ctx.fillStyle = 'rgba(15,23,42,0.94)';
    ctx.fill();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const pad = w * 0.05;

    if (session.phase === 'menu') {
      ctx.fillStyle = '#93c5fd';
      ctx.font = `600 ${h * 0.05}px ${FONT}`;
      ctx.fillText('AULA VR · PRÁCTICA DOCENTE', pad, h * 0.07);
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${h * 0.09}px ${FONT}`;
      let y = wrapText(ctx, lesson.topic, pad, h * 0.16, w - pad * 2, h * 0.1);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `${h * 0.05}px ${FONT}`;
      y += h * 0.03;
      const lines = [
        'Darás una mini-clase a 8 estudiantes virtuales.',
        'Avanza las diapositivas con los botones del atril.',
        'Apunta y presiona sobre quien levante la mano (?) para darle la palabra.',
        'Si alguien se distrae (…), apúntale para recuperar su atención.',
        'Al terminar verás tu resumen y rúbrica.',
      ];
      for (const l of lines) y = wrapText(ctx, '• ' + l, pad, y, w - pad * 2, h * 0.065) + h * 0.01;
      return;
    }

    // Resumen
    const sum = computeSummary(session);
    ctx.fillStyle = '#93c5fd';
    ctx.font = `600 ${h * 0.05}px ${FONT}`;
    ctx.fillText('RESUMEN DE LA SESIÓN', pad, h * 0.06);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${h * 0.12}px ${FONT}`;
    ctx.fillText(`${sum.total}/100`, pad, h * 0.12);
    ctx.font = `${h * 0.05}px ${FONT}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`Duración: ${fmtTime(sum.seconds)}`, w * 0.36, h * 0.17);

    let y = h * 0.3;
    const barW = w * 0.42;
    for (const it of sum.items) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `600 ${h * 0.045}px ${FONT}`;
      ctx.fillText(it.label, pad, y);
      ctx.fillStyle = '#334155';
      roundRect(ctx, pad, y + h * 0.058, barW, h * 0.03, 8);
      ctx.fill();
      ctx.fillStyle = it.value >= 70 ? '#22c55e' : it.value >= 40 ? '#f59e0b' : '#ef4444';
      roundRect(ctx, pad, y + h * 0.058, Math.max(10, (barW * it.value) / 100), h * 0.03, 8);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${h * 0.036}px ${FONT}`;
      ctx.fillText(`${it.value}% · ${it.detail}`, pad + barW + w * 0.02, y + h * 0.05);
      y += h * 0.125;
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = `600 ${h * 0.045}px ${FONT}`;
    ctx.fillText('Sugerencias', pad, y + h * 0.01);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `${h * 0.04}px ${FONT}`;
    y += h * 0.075;
    for (const t of sum.tips) y = wrapText(ctx, '• ' + t, pad, y, w - pad * 2, h * 0.052);
  });
}

/** HUD flotante con tiempo, diapositiva y mensajes de retroalimentación. */
export function drawHud(panel: CanvasPanel) {
  panel.mesh.visible = session.phase === 'teaching';
  if (session.phase !== 'teaching') return;
  const showToast = session.toast.until > now();
  panel.draw((ctx, w, h) => {
    roundRect(ctx, 0, 0, w, h, h * 0.3);
    ctx.fillStyle = 'rgba(15,23,42,0.82)';
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `600 ${h * 0.26}px ${FONT}`;
    ctx.fillText(`${fmtTime(elapsed())}  ·  Diap. ${session.slide + 1}/${lesson.slides.length}`, w * 0.05, h * 0.3);
    ctx.font = `${h * 0.24}px ${FONT}`;
    ctx.fillStyle = showToast ? (session.toast.tone === 'good' ? '#4ade80' : session.toast.tone === 'warn' ? '#fbbf24' : '#93c5fd') : '#64748b';
    ctx.fillText(showToast ? session.toast.text : 'Atiende ? y … en los estudiantes', w * 0.05, h * 0.72);
  });
}
