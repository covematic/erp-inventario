import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** Botón "Instalar aplicación" del menú lateral. En iPhone muestra cómo agregarla a la pantalla de inicio. */
export default function InstallApp() {
  const [evento, setEvento] = useState(null);
  const [ayudaIOS, setAyudaIOS] = useState(false);
  const [yaInstalada, setYaInstalada] = useState(instalada);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setEvento(e); };
    const onInstalled = () => { setYaInstalada(true); setEvento(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (yaInstalada || (!evento && !esIOS())) return null;

  async function instalar() {
    if (evento) {
      evento.prompt();
      await evento.userChoice;
      setEvento(null);
    } else {
      setAyudaIOS(true);
    }
  }

  return (
    <div className="px-3 pb-2">
      <button onClick={instalar} className="flex w-full items-center gap-3 rounded-lg bg-brand-600/15 px-3 py-2 text-sm font-medium text-brand-300 hover:bg-brand-600/25">
        <Download className="h-[18px] w-[18px]" /> Instalar aplicación
      </button>
      {ayudaIOS && (
        <div className="relative mt-2 rounded-lg bg-slate-800 p-3 text-xs leading-relaxed text-slate-300">
          <button onClick={() => setAyudaIOS(false)} className="absolute right-2 top-2 text-slate-500 hover:text-white" aria-label="Cerrar"><X className="h-4 w-4" /></button>
          En Safari toca <Share className="inline h-3.5 w-3.5" /> <b>Compartir</b> y luego <b>“Agregar a pantalla de inicio”</b>.
        </div>
      )}
    </div>
  );
}
