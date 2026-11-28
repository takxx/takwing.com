const mosaicCanvas = document.querySelector("#mosaic-bg");
const mosaicCtx = mosaicCanvas.getContext("2d");

function drawMosaic() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  mosaicCanvas.width = Math.round(width * dpr);
  mosaicCanvas.height = Math.round(height * dpr);
  mosaicCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const tileSize = 8;
  const cols = Math.ceil(width / tileSize);
  const rows = Math.ceil(height / tileSize);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      mosaicCtx.fillStyle =
        mosaicColors[Math.floor(Math.random() * mosaicColors.length)];

      mosaicCtx.fillRect(
        col * tileSize,
        row * tileSize,
        tileSize - 2,
        tileSize - 2
      );
    }
  }
}

drawMosaic();
window.addEventListener("resize", drawMosaic);