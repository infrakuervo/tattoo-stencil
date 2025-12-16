import React, { useState } from 'react';
import Uploader from './components/Uploader';
import Editor from './components/Editor';
import { PenTool } from 'lucide-react';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const handleImageLoad = (dataUrl: string) => {
    setImageSrc(dataUrl);
  };

  const handleCloseEditor = () => {
    // Reset state immediately to go back to Uploader
    setImageSrc(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-primary-500/30">
      
      {!imageSrc ? (
        <>
          {/* Header for Landing */}
          <header className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="w-6 h-6 text-primary-500" />
                <h1 className="text-xl font-bold tracking-tight">InkFlow <span className="text-zinc-500 font-normal">Stencil</span></h1>
              </div>
              <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
                <a href="#" className="hover:text-white transition-colors">Cómo funciona</a>
                <a href="#" className="hover:text-white transition-colors">Precios</a>
                <a href="#" className="text-primary-500">Entrar</a>
              </nav>
            </div>
          </header>

          <main className="pt-16 min-h-screen flex flex-col">
            <Uploader onImageLoad={handleImageLoad} />
          </main>

          <footer className="py-8 border-t border-zinc-900 bg-zinc-950 text-center text-zinc-600 text-sm">
            <p>&copy; {new Date().getFullYear()} InkFlow Stencil Pro. Todos los derechos reservados.</p>
          </footer>
        </>
      ) : (
        <Editor imageSrc={imageSrc} onClose={handleCloseEditor} />
      )}
    </div>
  );
};

export default App;