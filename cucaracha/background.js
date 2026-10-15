"use strict";

export function drawFloor(game, floor, floorContext) {
  const pixelSize = 4;
  const greys = ["#c9c9c6", "#d2d2cf", "#d9d9d6", "#e0e0dd"];
  const width = game.clientWidth;
  const height = game.clientHeight;
  const scale = window.devicePixelRatio || 1;

  floor.width = Math.round(width * scale);
  floor.height = Math.round(height * scale);
  floorContext.setTransform(scale, 0, 0, scale, 0, 0);

  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      floorContext.fillStyle =
        greys[Math.floor(Math.random() * greys.length)];
      floorContext.fillRect(x, y, pixelSize, pixelSize);
    }
  }
}