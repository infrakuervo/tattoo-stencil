export enum StencilMode {
  AI_PRO = 'AI_PRO',         // Topográfico estándar (Líneas + Puntos)
  AI_PRECISION = 'AI_PRECISION', // Nuevo: Topográfico Estricto (Isolíneas densas)
  AI_SKETCH = 'AI_SKETCH'    // Artístico
}

export interface FilterSettings {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  threshold: number;  // 0 to 255
  sharpen: number;    // 0 to 100
  inverted: boolean;
  opacity: number;    // 0 to 1
}

export const DEFAULT_SETTINGS: FilterSettings = {
  brightness: 0,
  contrast: 0,
  threshold: 200, // Higher default to keep background clean
  sharpen: 0,
  inverted: false,
  opacity: 1
};