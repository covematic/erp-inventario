import { useEffect } from 'react';

/**
 * Copia el título de cada columna (th) a sus celdas como data-label.
 * En pantallas pequeñas el CSS usa ese atributo para mostrar cada fila como una tarjeta.
 */
function etiquetar(root) {
  root.querySelectorAll('table.table-base').forEach((table) => {
    const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    if (!heads.length) return;
    table.querySelectorAll('tbody tr, tfoot tr').forEach((tr) => {
      let col = 0;
      [...tr.children].forEach((td) => {
        const span = td.colSpan || 1;
        const label = span > 1 ? '' : heads[col] || '';
        if (td.getAttribute('data-label') !== label) td.setAttribute('data-label', label);
        col += span;
      });
    });
  });
}

export default function useResponsiveTables() {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => etiquetar(document.body));
    };
    run();
    const obs = new MutationObserver(run);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); cancelAnimationFrame(frame); };
  }, []);
}
