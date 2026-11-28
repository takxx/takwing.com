function drawMosaicBackground() {
  const canvas = document.getElementById("mosaic-bg");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const pixelSize = 12; 

  const scale = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, width, height);

  const radius = pixelSize;
  const columnStep = radius * 1.5;
  const rowStep = Math.sqrt(3) * radius;

  for (let col = -1; col * columnStep < width + radius; col++) {
    const x = col * columnStep;
    const yOffset = (Math.abs(col) % 2) * rowStep / 2;

    for (let row = -1; row * rowStep + yOffset < height + rowStep; row++) {
      const y = row * rowStep + yOffset;

      context.beginPath();
      for (let point = 0; point < 6; point++) {
        const angle = (Math.PI / 3) * point;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);

        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }

      context.closePath();
      context.fillStyle = mosaicColors[Math.floor(Math.random() * mosaicColors.length)];
      context.fill();
    }
  }
}

drawMosaicBackground();
window.addEventListener("resize", drawMosaicBackground);