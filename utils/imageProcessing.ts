import { FilterSettings } from '../types';

/**
 * Advanced processing that preserves the white background 
 * while allowing deep adjustments to the stencil lines/shading.
 */
export const processImage = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: FilterSettings
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Calculate luminance (perceived brightness)
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // PROTECTION LOGIC:
    // If the pixel is already very light (background), we keep it white 
    // to prevent the "brightness" slider from making the paper gray.
    // We only process pixels that are part of the design (darker than 245).
    if (gray < 245) {
        
        // Apply Contrast first
        let newGray = contrastFactor * (gray - 128) + 128;

        // Apply Brightness (inverted logic for intuitive feel on black ink: 
        // dragging brightness DOWN makes the black ink DARKER/STRONGER, 
        // dragging UP makes it lighter/faded)
        newGray += settings.brightness;

        // Clamp
        newGray = Math.max(0, Math.min(255, newGray));

        // Threshold Logic (Cleanup)
        // If user wants to remove light gray noise from the AI generation
        if (settings.threshold < 255) {
             // If the resulting gray is lighter than threshold, snap to white
             if (newGray > settings.threshold) {
                 newGray = 255;
             }
             // If it's dark enough, keep it (or snap to black if we wanted binary, 
             // but for realism we keep the gray value)
        }

        r = newGray;
        g = newGray;
        b = newGray;
    } else {
        // Force pure white for background
        r = 255;
        g = 255;
        b = 255;
    }
    
    // Invert if requested (Classic stencil blue/negative view)
    if (settings.inverted) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
    }

    // Apply back to pixel data
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;

    // Handle Opacity (make white transparent if needed)
    if (settings.opacity < 1) {
        // If it's white, make it transparent based on settings
        if (r > 240 && g > 240 && b > 240) {
            data[i+3] = 0; 
        } else {
            data[i+3] = 255 * settings.opacity;
        }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};