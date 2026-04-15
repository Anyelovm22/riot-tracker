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
