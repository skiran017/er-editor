import Konva from 'konva';

/**
 * Download image from data URL
 */
function downloadImage(dataURL: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export canvas as image (PNG or JPEG)
 * Exports visible area
 * Based on Konva documentation: https://konvajs.org/docs/react/Canvas_Export.html
 */
export async function exportCanvasAsImage(
  stage: Konva.Stage,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.92
): Promise<void> {
  try {
    const layers = stage.getLayers();
    if (layers.length === 0) {
      throw new Error('No layer found in stage');
    }
    const layer = layers[0];

    // Temporarily hide Transformer
    const transformer = layer.findOne<Konva.Transformer>('Transformer');
    const transformerVisible = transformer ? transformer.visible() : false;
    if (transformer) {
      transformer.visible(false);
    }

    // Force a draw to ensure everything is rendered
    layer.draw();
    stage.draw();

    // Wait a moment for rendering
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      // Get all nodes excluding Transformer
      const nodes = layer.getChildren().filter((node) => {
        return node.getClassName() !== 'Transformer';
      });

      if (nodes.length === 0) {
        throw new Error('No content found to export');
      }

      // For now, export the entire visible area (simpler and more reliable)
      // We can add bounding box calculation later if needed
      const dataURL = stage.toDataURL({
        mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
        quality: format === 'jpeg' ? quality : undefined,
        pixelRatio: 2,
      });

      // Validate data URL
      if (!dataURL || dataURL.length < 100 || dataURL.startsWith('data:,') || !dataURL.startsWith('data:image/')) {
        console.error('Invalid data URL received. Length:', dataURL?.length, 'Starts with:', dataURL?.substring(0, 50));
        throw new Error('Failed to generate image data - invalid data URL');
      }

      // Trigger download
      const extension = format === 'png' ? 'png' : 'jpg';
      const filename = `er-diagram-${Date.now()}.${extension}`;
      downloadImage(dataURL, filename);
    } finally {
      // Restore transformer visibility
      if (transformer) {
        transformer.visible(transformerVisible);
        layer.draw();
      }
    }
  } catch (error) {
    console.error('Error exporting canvas:', error);
    throw error;
  }
}
