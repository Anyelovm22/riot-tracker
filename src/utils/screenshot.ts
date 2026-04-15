export async function captureDisplayScreenshot(filename = 'riot-tracker-dashboard.png') {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Tu navegador no soporta captura de pantalla');
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 1 },
    audio: false,
  });

  try {
    const track = stream.getVideoTracks()[0];
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No se pudo preparar el lienzo de captura');
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();

    track.stop();
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

export async function captureAppSnapshot(
  filename = 'riot-tracker-snapshot.png',
  rootSelector = '#root'
) {
  const root = document.querySelector(rootSelector) as HTMLElement | null;
  if (!root) {
    throw new Error(`No se encontró el contenedor "${rootSelector}" para snapshot.`);
  }

  const width = Math.max(root.scrollWidth, root.clientWidth);
  const height = Math.max(root.scrollHeight, root.clientHeight);

  const cloned = root.cloneNode(true) as HTMLElement;
  cloned.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  cloned.style.margin = '0';

  const serialized = new XMLSerializer().serializeToString(cloned);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo renderizar el snapshot de la app.'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo preparar el lienzo para snapshot.');

    ctx.drawImage(image, 0, 0);
    const png = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = png;
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
