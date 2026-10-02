/**
 * Después de un envío fallido, lleva el foco al primer campo marcado como inválido
 * (los errores siguen visibles junto a cada campo). Se ejecuta tras el render.
 */
export function enfocarPrimerError(contenedor = document) {
  setTimeout(() => {
    const campo = contenedor.querySelector('[aria-invalid="true"], .input-error');
    if (campo) {
      campo.focus({ preventScroll: true });
      campo.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, 0);
}
