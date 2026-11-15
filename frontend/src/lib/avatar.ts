export function initialsOf(name?: string | null): string {
  return (name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('')
    .toUpperCase();
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('La imagen no es válida.'));
    image.src = src;
  });
}

/**
 * Recorta la imagen al centro y la reduce a un cuadrado de 256 px.
 * El resultado (JPEG data URL) queda por debajo del límite del backend.
 */
export async function fileToAvatar(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Seleccione un archivo de imagen (PNG, JPG o WEBP).');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('La imagen no puede superar los 8 MB.');
  }

  const source = await readFile(file);
  const image = await loadImage(source);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('El navegador no pudo procesar la imagen.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);

  const side = Math.min(image.width, image.height);
  const offsetX = (image.width - side) / 2;
  const offsetY = (image.height - side) / 2;
  context.drawImage(image, offsetX, offsetY, side, side, 0, 0, size, size);

  return canvas.toDataURL('image/jpeg', 0.86);
}
