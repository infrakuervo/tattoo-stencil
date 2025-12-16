import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, FileUp } from 'lucide-react';

interface UploaderProps {
  onImageLoad: (dataUrl: string) => void;
}

const Uploader: React.FC<UploaderProps> = ({ onImageLoad }) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageLoad(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8 text-center animate-fade-in">
      <div 
        className={`
          relative group cursor-pointer
          w-full max-w-2xl aspect-video
          flex flex-col items-center justify-center
          border-2 border-dashed rounded-3xl
          transition-all duration-300 ease-in-out
          ${isDragging 
            ? 'border-primary-500 bg-primary-500/10 scale-[1.02]' 
            : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-850'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <div className="p-8 flex flex-col items-center gap-6">
          <div className={`
            p-6 rounded-full bg-zinc-800 shadow-xl
            transition-transform duration-300
            group-hover:scale-110 group-hover:rotate-3
          `}>
            <Upload className="w-12 h-12 text-primary-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">Subir Imagen de Referencia</h3>
            <p className="text-zinc-400">Arrastra y suelta o haz clic para buscar</p>
          </div>
          <div className="flex gap-4 text-xs font-mono text-zinc-500">
            <span className="bg-zinc-800 px-3 py-1 rounded-full">JPG</span>
            <span className="bg-zinc-800 px-3 py-1 rounded-full">PNG</span>
            <span className="bg-zinc-800 px-3 py-1 rounded-full">WEBP</span>
          </div>
        </div>
        <input 
          type="file" 
          id="fileInput"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <ImageIcon className="w-8 h-8 text-zinc-400 mb-4" />
          <h4 className="font-semibold text-white mb-2">Alta Resolución</h4>
          <p className="text-sm text-zinc-400">Mantiene la calidad original para impresiones térmicas nítidas.</p>
        </div>
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <FileUp className="w-8 h-8 text-zinc-400 mb-4" />
          <h4 className="font-semibold text-white mb-2">Procesamiento IA</h4>
          <p className="text-sm text-zinc-400">Potenciado por Gemini Nano Banana para máxima fidelidad.</p>
        </div>
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <Upload className="w-8 h-8 text-zinc-400 mb-4" />
          <h4 className="font-semibold text-white mb-2">Privacidad</h4>
          <p className="text-sm text-zinc-400">Tus diseños son tuyos. Procesamiento seguro.</p>
        </div>
      </div>
    </div>
  );
};

export default Uploader;