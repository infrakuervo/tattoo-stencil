import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Download, 
  RotateCcw, 
  Sliders, 
  Wand2, 
  Pencil,
  Trash2,
  Loader2,
  ScanLine,
  ZoomIn,
  ZoomOut,
  Crosshair, 
  Maximize2,
  X,
  Crown, 
  Hand,
  Layers,
  ImagePlus,
  Move
} from 'lucide-react';
import { FilterSettings, DEFAULT_SETTINGS, StencilMode } from '../types';
import { processImage } from '../utils/imageProcessing';

interface EditorProps {
  imageSrc: string;
  onClose: () => void;
}

interface LayerTransform {
    x: number; // Percentage -50 to 50
    y: number; // Percentage -50 to 50
    scale: number; // 0.1 to 3
    rotation: number; // 0 to 360
    opacity: number; // 0 to 1
}

const DEFAULT_LAYER_TRANSFORM: LayerTransform = {
    x: 0,
    y: 0,
    scale: 0.5,
    rotation: 0,
    opacity: 0.8
};

const Editor: React.FC<EditorProps> = ({ imageSrc, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLImageElement | null>(null);
  
  // Layer State
  const [secondImage, setSecondImage] = useState<HTMLImageElement | null>(null);
  const [layerTransform, setLayerTransform] = useState<LayerTransform>(DEFAULT_LAYER_TRANSFORM);
  
  const [settings, setSettings] = useState<FilterSettings>(DEFAULT_SETTINGS);
  const [scale, setScale] = useState(1);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<StencilMode | null>(null);
  
  // Pan / Drag State for Viewport
  const [isDragging, setIsDragging] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Full Screen State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenSrc, setFullScreenSrc] = useState<string | null>(null);
  const [fullScreenScale, setFullScreenScale] = useState(1);

  // Initialize Base Image
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setOriginalImage(img);
    };
  }, [imageSrc]);

  // Handle re-rendering of processed canvas
  useEffect(() => {
    if (processedImage) {
        const timeoutId = setTimeout(() => {
            renderResultCanvas(processedImage, settings);
        }, 10);
        return () => clearTimeout(timeoutId);
    }
  }, [settings, processedImage]);

  const renderResultCanvas = (img: HTMLImageElement, currentSettings: FilterSettings) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);
    processImage(ctx, img.width, img.height, currentSettings);
  };

  const updateSetting = (key: keyof FilterSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const updateLayerTransform = (key: keyof LayerTransform, value: number) => {
    setLayerTransform(prev => ({ ...prev, [key]: value }));
  };

  const handleLayerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => setSecondImage(img);
              img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  const removeLayer = () => {
      setSecondImage(null);
      setLayerTransform(DEFAULT_LAYER_TRANSFORM);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `inkflow-stencil-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      if (canvasRef.current) {
        setFullScreenSrc(canvasRef.current.toDataURL('image/png'));
        setIsFullScreen(true);
        setFullScreenScale(1); 
      }
    } else {
      setIsFullScreen(false);
      setFullScreenSrc(null);
    }
  };

  // --- PANNING LOGIC ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if we aren't interacting with a control overlay (if any)
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- COMPOSITION HELPER ---
  // Draws the base image and the second layer onto a temporary canvas
  // to create the composite image sent to the AI.
  const getCompositeDataUrl = (): string => {
      if (!originalImage) return '';
      
      const canvas = document.createElement('canvas');
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // 1. Draw Base
      ctx.drawImage(originalImage, 0, 0);

      // 2. Draw Layer if exists
      if (secondImage) {
          ctx.save();
          // Calculate center
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          
          // Move to center + offset
          // Offset is percentage of base dimensions
          const offsetX = (layerTransform.x / 100) * canvas.width;
          const offsetY = (layerTransform.y / 100) * canvas.height;
          
          ctx.translate(cx + offsetX, cy + offsetY);
          ctx.rotate((layerTransform.rotation * Math.PI) / 180);
          ctx.scale(layerTransform.scale, layerTransform.scale);
          ctx.globalAlpha = layerTransform.opacity;
          
          // Draw centered around origin
          ctx.drawImage(secondImage, -secondImage.width / 2, -secondImage.height / 2);
          ctx.restore();
      }

      return canvas.toDataURL('image/jpeg', 0.9); // High quality for AI
  };

  // --- AI GENERATION ---
  const generateAI = async (mode: StencilMode) => {
    if (!originalImage || isAiLoading) return;
    if (!process.env.API_KEY) {
        alert("Falta la API Key. Por favor configura tu entorno.");
        return;
    }

    setIsAiLoading(true);
    setActiveMode(mode);

    try {
        // GET COMPOSITE IMAGE
        const dataUrl = getCompositeDataUrl();
        const base64Data = dataUrl.split(',')[1];

        // --- PROMPT ENGINEERING ---
        let prompt = "";
        
        if (mode === StencilMode.AI_MASTER) {
            prompt = `
              Eres un "Grand Master Tattoo Artist" con 30 años de experiencia.
              Tu tarea: Analizar esta imagen y crear el STENCIL DEFINITIVO.
              
              ANÁLISIS INTELIGENTE:
              1. Observa la imagen (puede ser una composición de varias fotos).
              2. Decide la mejor técnica basada en la imagen:
                 - Si es realista: Usa un híbrido de líneas finas y micropuntos.
                 - Si es neotradicional: Usa líneas de contorno gruesas y sólidas.
                 - Si es geométrica: Usa precisión matemática.
              
              TU OBJETIVO "MASTER":
              Genera una versión "Evolucionada" del stencil. No te limites a copiar contornos.
              Interpreta los volúmenes. Convierte sombras confusas en tramas de diseño claras.
              Haz que el diseño se vea "Listo para tatuar" y estéticamente superior.
              
              REGLAS DE SALIDA:
              - Fondo: Blanco Puro.
              - Tinta: Negra.
              - Estilo: Limpio, legible, artístico y OPTIMIZADO para la piel.
            `;
        }
        else if (mode === StencilMode.AI_PRO) {
            prompt = `
              Genera un STENCIL DE TATUAJE PROFESIONAL.
              Estilo: Mapa Topográfico Limpio.
              1. BORDES: Línea sólida negra, grosor medio.
              2. SOMBRAS: Punteado (Stippling) gradiente suave.
              3. CONTRASTE: Alto. Sin grises medios sólidos, solo blanco y negro (puntos).
              4. CLARIDAD: Maximiza la legibilidad para la plantilla térmica.
              5. Fondo: Blanco absoluto.
            `;
        } 
        else if (mode === StencilMode.AI_PRECISION) {
            prompt = `
              Genera un STENCIL DE "TOPOGRAFÍA ESTRICTA" (ISOLINEAS).
              Objetivo: Mapear CADA cambio de volumen con precisión matemática (como un mapa geográfico).
              Reglas Estrictas:
              1. LÍNEAS SÓLIDAS: Usa líneas continuas para definir cortes duros y sombras principales.
              2. LÍNEAS DISCONTINUAS (Dashed): Manda OBLIGATORIAMENTE líneas discontinuas para definir las transiciones suaves hacia la luz y los brillos.
              3. DENSIDAD: Alta. Queremos ver la "malla" estructural del objeto.
              4. PROHIBIDO: Sombras difusas, grises, punteado o tramas. SOLO LÍNEAS (Sólidas o Discontinuas).
              5. RESULTADO: Un plano técnico limpio y quirúrgico.
              6. Fondo blanco absoluto.
            `;
        }
        else if (mode === StencilMode.AI_SKETCH) {
            prompt = `
              Actúa como un maestro de dibujo clásico.
              Técnica: LÁPIZ DE GRAFITO Y CARBONCILLO sobre papel.
              Estilo: "Rough Sketch" / Boceto de Estudio.
              1. CONSTRUCCIÓN: Deja visibles todas las líneas guía, ejes geométricos y garabatos de estructura. No limpies el dibujo.
              2. SOMBREADO: Exclusivamente TRAMADO CRUZADO (Cross-hatching) y líneas gestuales.
              3. TEXTURA: Debe parecer hecho a mano, sucio, auténtico, con presión variable del lápiz.
              4. DETALLE: Prioriza la expresión artística y la soltura sobre la precisión fotográfica.
              5. Fondo: Blanco papel limpio (para que funcione como stencil).
            `;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: prompt }
                ]
            }
        });

        let newImageUrl = null;
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    newImageUrl = `data:image/png;base64,${part.inlineData.data}`;
                    break;
                }
            }
        }

        if (newImageUrl) {
            const img = new Image();
            img.onload = () => {
                setProcessedImage(img);
                // We keep current settings or reset? Let's reset for fresh result
                setSettings({ ...DEFAULT_SETTINGS });
            };
            img.src = newImageUrl;
        } else {
            alert("La IA terminó pero no devolvió imagen. Intenta de nuevo.");
        }

    } catch (error) {
        console.error("Error IA", error);
        alert("Error al generar el stencil. Intenta de nuevo.");
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      
      {/* Top Bar */}
      <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 z-50 relative shrink-0">
         <div className="flex items-center gap-4">
             <button onClick={onClose} className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Trash2 className="w-4 h-4" />
                Nueva Imagen
             </button>
             <div className="h-4 w-[1px] bg-zinc-700 mx-2"></div>
             
             {/* MAIN ZOOM CONTROL */}
             <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50">
                 <button 
                    onClick={() => setScale(s => Math.max(0.1, s - 0.1))} 
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Reducir"
                 >
                    <ZoomOut className="w-3.5 h-3.5" />
                 </button>
                 
                 <input 
                    type="range" 
                    min="0.1" 
                    max="3.0" 
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary-500 hover:accent-primary-400"
                 />
                 
                 <button 
                    onClick={() => setScale(s => Math.min(3, s + 0.1))} 
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                    title="Ampliar"
                 >
                    <ZoomIn className="w-3.5 h-3.5" />
                 </button>

                 <div className="w-[1px] h-3 bg-zinc-700 mx-1"></div>
                 <button 
                    onClick={toggleFullScreen}
                    disabled={!processedImage}
                    title="Pantalla Completa"
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                 >
                    <Maximize2 className="w-3.5 h-3.5" />
                 </button>
             </div>
         </div>

         <div className="text-sm font-bold text-zinc-200 hidden md:block">
            {activeMode === StencilMode.AI_MASTER && <span className="text-amber-400 flex items-center gap-2"><Crown className="w-4 h-4" /> Modo Master AI</span>}
            {activeMode === StencilMode.AI_PRO && 'Modo: Pro (Líneas + Puntos)'}
            {activeMode === StencilMode.AI_PRECISION && 'Modo: Topográfico Estricto'}
            {activeMode === StencilMode.AI_SKETCH && 'Modo: Sketch Lápiz'}
            {!activeMode && 'Editor'}
         </div>
         <button 
            onClick={handleDownload}
            disabled={!processedImage}
            className="bg-primary-600 hover:bg-primary-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold py-1.5 px-4 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
         >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
         </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT: Work Area (Split View with PANNING) */}
          <div 
            ref={containerRef}
            className={`
                flex-1 bg-[#121214] relative overflow-hidden custom-pattern flex items-center justify-center p-8
                ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            `}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
             
             {/* Hint for user about panning */}
             <div className="absolute top-4 left-4 z-10 pointer-events-none opacity-50 flex items-center gap-2 text-xs text-zinc-500">
                <Hand className="w-3 h-3" />
                <span>Click y arrastra para mover</span>
             </div>

             <div 
                className="flex gap-4 transition-transform duration-75 ease-out origin-center will-change-transform"
                style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` 
                }}
             >
                {/* Original Composition View */}
                {originalImage && (
                    <div className="relative shadow-2xl group select-none">
                        <div className="absolute -top-8 left-0 text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                           {secondImage ? 'Composición' : 'Original'}
                           {secondImage && <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-primary-400">2 Capas</span>}
                        </div>
                        
                        {/* Base Image Container - Acts as the anchor */}
                        <div className="relative border border-zinc-700 bg-zinc-800">
                            {/* 1. Base Image */}
                            <img 
                                src={originalImage.src} 
                                alt="Base" 
                                className="max-h-[70vh] w-auto object-contain pointer-events-none"
                            />

                            {/* 2. Second Layer (Overlay) */}
                            {secondImage && (
                                <div 
                                    className="absolute top-1/2 left-1/2 w-full h-full pointer-events-none flex items-center justify-center"
                                    style={{
                                        // We use a container that matches the base image size, then transform inside it
                                        transform: `translate(-50%, -50%)`, 
                                    }}
                                >
                                    <img 
                                        src={secondImage.src}
                                        alt="Layer 2"
                                        style={{
                                            transform: `
                                                translate(${layerTransform.x}%, ${layerTransform.y}%) 
                                                rotate(${layerTransform.rotation}deg) 
                                                scale(${layerTransform.scale})
                                            `,
                                            opacity: layerTransform.opacity,
                                        }}
                                        className="origin-center"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Generated Stencil */}
                {processedImage ? (
                    <div className="relative shadow-2xl pointer-events-none select-none">
                         <div className="absolute -top-8 left-0 text-xs font-bold text-primary-500 uppercase tracking-widest flex items-center gap-2">
                            <span>Stencil Final</span>
                            <ScanLine className="w-3 h-3" />
                         </div>
                         <canvas 
                            ref={canvasRef}
                            className="max-h-[70vh] w-auto border border-zinc-700 bg-white object-contain pointer-events-none"
                         />
                    </div>
                ) : (
                    <div className="max-h-[70vh] aspect-[3/4] w-96 border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/50 p-6 text-center select-none">
                        <Wand2 className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">Configura tu composición y selecciona un estilo.</p>
                    </div>
                )}
             </div>
          </div>

          {/* RIGHT: Sidebar Controls */}
          <div className="w-full md:w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shadow-xl shrink-0">
             
             <div className="p-4 border-b border-zinc-800">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary-500" />
                    Panel de Control
                </h2>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* --- LAYER CONTROL SECTION --- */}
                <div className="space-y-3 bg-zinc-850 p-3 rounded-xl border border-zinc-800">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                            <Layers className="w-3 h-3" /> Capas / Composición
                        </label>
                        {secondImage && (
                            <button 
                                onClick={removeLayer}
                                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" /> Quitar capa
                            </button>
                        )}
                    </div>

                    {!secondImage ? (
                        <div 
                            onClick={() => layerInputRef.current?.click()}
                            className="w-full h-16 border border-dashed border-zinc-700 rounded-lg flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 cursor-pointer transition-colors"
                        >
                            <ImagePlus className="w-5 h-5" />
                            <span className="text-xs">Añadir 2ª Imagen Referencia</span>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div className="text-[10px] text-zinc-500 bg-zinc-900 p-2 rounded border border-zinc-800">
                                Ajusta la segunda capa sobre la base. La IA combinará ambas para crear el stencil.
                            </div>
                            
                            {/* Position Controls */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-zinc-400">Posición X</span>
                                    <input 
                                        type="range" min="-50" max="50" step="1"
                                        value={layerTransform.x}
                                        onChange={(e) => updateLayerTransform('x', parseInt(e.target.value))}
                                        className="w-full h-1 bg-zinc-700 rounded-lg accent-primary-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-zinc-400">Posición Y</span>
                                    <input 
                                        type="range" min="-50" max="50" step="1"
                                        value={layerTransform.y}
                                        onChange={(e) => updateLayerTransform('y', parseInt(e.target.value))}
                                        className="w-full h-1 bg-zinc-700 rounded-lg accent-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Scale & Rotation */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-zinc-400">
                                    <span>Escala ({Math.round(layerTransform.scale * 100)}%)</span>
                                </div>
                                <input 
                                    type="range" min="0.1" max="2.0" step="0.05"
                                    value={layerTransform.scale}
                                    onChange={(e) => updateLayerTransform('scale', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-zinc-700 rounded-lg accent-primary-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-zinc-400">
                                    <span>Rotación ({layerTransform.rotation}°)</span>
                                </div>
                                <input 
                                    type="range" min="0" max="360" step="1"
                                    value={layerTransform.rotation}
                                    onChange={(e) => updateLayerTransform('rotation', parseInt(e.target.value))}
                                    className="w-full h-1 bg-zinc-700 rounded-lg accent-primary-500"
                                />
                            </div>

                             <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-zinc-400">
                                    <span>Opacidad ({Math.round(layerTransform.opacity * 100)}%)</span>
                                </div>
                                <input 
                                    type="range" min="0.1" max="1" step="0.1"
                                    value={layerTransform.opacity}
                                    onChange={(e) => updateLayerTransform('opacity', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-zinc-700 rounded-lg accent-primary-500"
                                />
                            </div>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={layerInputRef} 
                        onChange={handleLayerUpload} 
                        className="hidden" 
                        accept="image/*"
                    />
                </div>
                
                {/* AI Generators */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Estilos de Stencil</label>
                    
                    {/* BUTTON 0: MASTER (NEW) */}
                    <button 
                        onClick={() => generateAI(StencilMode.AI_MASTER)}
                        disabled={isAiLoading}
                        className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all text-left relative overflow-hidden group cursor-pointer
                            ${activeMode === StencilMode.AI_MASTER
                                ? 'bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-900/20' 
                                : 'bg-gradient-to-r from-amber-950/10 to-zinc-800/50 border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800'
                            }
                        `}
                    >
                        <div className="p-2 rounded-lg bg-zinc-900 text-amber-500 group-hover:scale-110 transition-transform shadow-inner shadow-amber-900/20">
                            <Crown className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-amber-100">Master AI</div>
                            <div className="text-[10px] text-amber-400/70 mt-0.5">Análisis Experto & Optimización</div>
                        </div>
                        {isAiLoading && activeMode === StencilMode.AI_MASTER && (
                            <div className="absolute right-3 top-3">
                                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                            </div>
                        )}
                    </button>

                    <div className="h-[1px] bg-zinc-800 my-2"></div>

                    {/* BUTTON 1: PRO */}
                    <button 
                        onClick={() => generateAI(StencilMode.AI_PRO)}
                        disabled={isAiLoading}
                        className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all text-left relative overflow-hidden group cursor-pointer
                            ${activeMode === StencilMode.AI_PRO 
                                ? 'bg-zinc-800 border-primary-500 shadow-lg shadow-primary-900/20' 
                                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
                            }
                        `}
                    >
                        <div className="p-2 rounded-lg bg-zinc-900 text-primary-500 group-hover:scale-110 transition-transform">
                            <ScanLine className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white">Topográfico Pro</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">Líneas + Punteado Suave</div>
                        </div>
                        {isAiLoading && activeMode === StencilMode.AI_PRO && (
                            <div className="absolute right-3 top-3">
                                <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                            </div>
                        )}
                    </button>

                    {/* BUTTON 2: PRECISION */}
                    <button 
                        onClick={() => generateAI(StencilMode.AI_PRECISION)}
                        disabled={isAiLoading}
                        className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all text-left relative overflow-hidden group cursor-pointer
                            ${activeMode === StencilMode.AI_PRECISION 
                                ? 'bg-zinc-800 border-cyan-500 shadow-lg shadow-cyan-900/20' 
                                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
                            }
                        `}
                    >
                        <div className="p-2 rounded-lg bg-zinc-900 text-cyan-400 group-hover:scale-110 transition-transform">
                            <Crosshair className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white">Topográfico Estricto</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">Sólida (Duro) + Discontinua (Suave)</div>
                        </div>
                        {isAiLoading && activeMode === StencilMode.AI_PRECISION && (
                            <div className="absolute right-3 top-3">
                                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                            </div>
                        )}
                    </button>

                    {/* BUTTON 3: SKETCH */}
                    <button 
                        onClick={() => generateAI(StencilMode.AI_SKETCH)}
                        disabled={isAiLoading}
                        className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all text-left relative overflow-hidden group cursor-pointer
                            ${activeMode === StencilMode.AI_SKETCH 
                                ? 'bg-zinc-800 border-indigo-500 shadow-lg shadow-indigo-900/20' 
                                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
                            }
                        `}
                    >
                        <div className="p-2 rounded-lg bg-zinc-900 text-indigo-400 group-hover:scale-110 transition-transform">
                            <Pencil className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white">Sketch Lápiz</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">Construcción y Tramado</div>
                        </div>
                        {isAiLoading && activeMode === StencilMode.AI_SKETCH && (
                            <div className="absolute right-3 top-3">
                                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                            </div>
                        )}
                    </button>
                </div>

                {/* Post Processing */}
                {processedImage && (
                    <div className="space-y-6 pt-4 border-t border-zinc-800 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Ajustes de Diseño</label>
                            <button 
                                onClick={() => setSettings(DEFAULT_SETTINGS)}
                                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                            >
                                <RotateCcw className="w-3 h-3" /> Reset
                            </button>
                        </div>

                        <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 mb-2">
                             <p className="text-[10px] text-zinc-400 text-center">
                                Estos controles solo afectan a la tinta. El fondo blanco se mantiene puro.
                             </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-300">Intensidad Tinta (Brillo)</span>
                                </div>
                                <input 
                                    type="range" min="-100" max="100" 
                                    value={settings.brightness} 
                                    onChange={(e) => updateSetting('brightness', parseInt(e.target.value))}
                                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-300">Contraste</span>
                                </div>
                                <input 
                                    type="range" min="-100" max="100" 
                                    value={settings.contrast} 
                                    onChange={(e) => updateSetting('contrast', parseInt(e.target.value))}
                                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-300">Limpieza Ruido (Threshold)</span>
                                </div>
                                <input 
                                    type="range" min="0" max="255" 
                                    value={settings.threshold} 
                                    onChange={(e) => updateSetting('threshold', parseInt(e.target.value))}
                                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                             <button 
                                onClick={() => updateSetting('inverted', !settings.inverted)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all
                                    ${settings.inverted 
                                        ? 'bg-zinc-800 border-primary-500/50 text-white' 
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                                    }
                                `}
                             >
                                <span className="text-xs font-medium">Invertir Colores</span>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${settings.inverted ? 'bg-primary-600' : 'bg-zinc-700'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${settings.inverted ? 'left-4.5' : 'left-0.5'}`} />
                                </div>
                             </button>
                        </div>
                    </div>
                )}
             </div>
          </div>
      </div>
      
      {/* Full Screen Overlay */}
      {isFullScreen && fullScreenSrc && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col animate-fade-in">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-50 pointer-events-none">
                <div className="bg-black/50 p-2 rounded-lg backdrop-blur pointer-events-auto">
                    <span className="text-zinc-400 text-xs font-mono">Modo Pantalla Completa</span>
                </div>
                <button 
                    onClick={toggleFullScreen}
                    className="p-3 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-full transition-colors cursor-pointer pointer-events-auto border border-zinc-700"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Scrollable Canvas Area */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                <img 
                    src={fullScreenSrc} 
                    alt="Full Screen Stencil" 
                    style={{ 
                        height: `${80 * fullScreenScale}vh`, 
                        width: 'auto',
                        maxWidth: 'none', // Allow it to overflow horizontal if needed
                        transition: 'height 0.15s ease-out' 
                    }}
                    className="shadow-2xl border border-zinc-800 bg-white"
                />
            </div>

            {/* Floating Zoom Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
                 <div className="flex items-center gap-4 bg-zinc-900/90 backdrop-blur border border-zinc-700 p-3 rounded-2xl shadow-2xl">
                     <button 
                        onClick={() => setFullScreenScale(s => Math.max(0.5, s - 0.25))} 
                        className="p-2 hover:bg-zinc-700 rounded-xl text-zinc-300 hover:text-white transition-colors"
                     >
                        <ZoomOut className="w-5 h-5" />
                     </button>
                     
                     <div className="flex flex-col items-center gap-1 w-48">
                         <input 
                            type="range" 
                            min="0.5" 
                            max="4.0" 
                            step="0.1"
                            value={fullScreenScale}
                            onChange={(e) => setFullScreenScale(parseFloat(e.target.value))}
                            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary-500 hover:accent-primary-400"
                         />
                         <span className="text-[10px] text-zinc-500 font-mono">{Math.round(fullScreenScale * 100)}%</span>
                     </div>
                     
                     <button 
                        onClick={() => setFullScreenScale(s => Math.min(4, s + 0.25))} 
                        className="p-2 hover:bg-zinc-700 rounded-xl text-zinc-300 hover:text-white transition-colors"
                     >
                        <ZoomIn className="w-5 h-5" />
                     </button>

                     <div className="w-[1px] h-6 bg-zinc-700 mx-1"></div>

                     <button 
                        onClick={() => setFullScreenScale(1)} 
                        className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider px-2"
                        title="Reset Zoom"
                     >
                        Reset
                     </button>
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Editor;