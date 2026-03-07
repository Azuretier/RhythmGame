// =============================================================
// Voxel World Background - Procedural Textures
// Block detail, bump, roughness, and enemy armor textures
// =============================================================

import * as THREE from 'three';
import { seededRandom, smoothNoise } from './voxel-terrain';

// Procedural detail texture
export function createBlockDetailTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const rng = seededRandom(54321);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let val = 0.78;
      val += (smoothNoise(x * 0.06, y * 0.06, 7000) - 0.5) * 0.18;
      val += (smoothNoise(x * 0.14, y * 0.14, 7100) - 0.5) * 0.10;
      val += (smoothNoise(x * 0.3, y * 0.3, 7200) - 0.5) * 0.06;
      val += (rng() - 0.5) * 0.08;

      const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
      const edgeWidth = 5;
      if (edgeDist < edgeWidth) {
        const t = edgeDist / edgeWidth;
        val *= 0.45 + 0.55 * (t * t);
      }
      if (y < 3) val += 0.12 * (1 - y / 3);
      if (x < 2) val += 0.06 * (1 - x / 2);
      if (y > size - 3) val -= 0.08 * (1 - (size - 1 - y) / 2);
      if (x > size - 3) val -= 0.05 * (1 - (size - 1 - x) / 2);

      val = Math.max(0, Math.min(1, val));
      const byte = Math.round(val * 255);
      imgData.data[idx] = byte;
      imgData.data[idx + 1] = byte;
      imgData.data[idx + 2] = byte;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.globalCompositeOperation = 'multiply';
  const cRng = seededRandom(99999);
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(${160 + Math.floor(cRng() * 40)}, ${160 + Math.floor(cRng() * 40)}, ${160 + Math.floor(cRng() * 40)}, 1)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    let cx = cRng() * size;
    let cy = cRng() * size;
    ctx.moveTo(cx, cy);
    const segments = 2 + Math.floor(cRng() * 3);
    for (let j = 0; j < segments; j++) {
      cx += (cRng() - 0.5) * 28;
      cy += (cRng() - 0.5) * 28;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural bump map
export function createBlockBumpMap(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const rng = seededRandom(11111);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let h = 0.5;
      h += (smoothNoise(x * 0.08, y * 0.08, 8000) - 0.5) * 0.3;
      h += (smoothNoise(x * 0.2, y * 0.2, 8100) - 0.5) * 0.18;
      h += (smoothNoise(x * 0.5, y * 0.5, 8200) - 0.5) * 0.08;
      h += (rng() - 0.5) * 0.06;
      const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edgeDist < 4) h *= edgeDist / 4;
      h = Math.max(0, Math.min(1, h));
      const byte = Math.round(h * 255);
      imgData.data[idx] = byte;
      imgData.data[idx + 1] = byte;
      imgData.data[idx + 2] = byte;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// Procedural enemy armor texture — dark panels with glowing energy veins
export function createEnemyArmorTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rng = seededRandom(77777);

  // Dark base with slight variation
  const imgData = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let v = 0.12 + (smoothNoise(x * 0.07, y * 0.07, 3300) - 0.5) * 0.08;
      v += (rng() - 0.5) * 0.03;
      v = Math.max(0, Math.min(1, v));
      imgData.data[idx]     = Math.round(v * 60);  // R — slightly purple-tinted
      imgData.data[idx + 1] = Math.round(v * 30);  // G
      imgData.data[idx + 2] = Math.round(v * 90);  // B
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Armor plate grid lines
  ctx.strokeStyle = 'rgba(80, 20, 140, 0.7)';
  ctx.lineWidth = 1.5;
  const plateSize = 32;
  for (let y = 0; y < size; y += plateSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  for (let x = 0; x < size; x += plateSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
  }

  // Glowing energy vein lines (purple/magenta)
  const veinRng = seededRandom(88888);
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const alpha = 0.5 + veinRng() * 0.4;
    ctx.strokeStyle = `rgba(180, 60, 255, ${alpha})`;
    ctx.beginPath();
    let px = veinRng() * size;
    let py = veinRng() * size;
    ctx.moveTo(px, py);
    const segs = 3 + Math.floor(veinRng() * 4);
    for (let j = 0; j < segs; j++) {
      px += (veinRng() - 0.5) * 40;
      py += (veinRng() - 0.5) * 40;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Subtle rivets/bolts at plate corners
  ctx.fillStyle = 'rgba(140, 80, 200, 0.5)';
  for (let y = plateSize; y < size; y += plateSize) {
    for (let x = plateSize; x < size; x += plateSize) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural roughness map
export function createBlockRoughnessMap(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const rng = seededRandom(22222);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let r = 0.7;
      r += (smoothNoise(x * 0.1, y * 0.1, 9000) - 0.5) * 0.2;
      r += (rng() - 0.5) * 0.1;
      const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edgeDist < 3) r -= 0.15 * (1 - edgeDist / 3);
      r = Math.max(0, Math.min(1, r));
      const byte = Math.round(r * 255);
      imgData.data[idx] = byte;
      imgData.data[idx + 1] = byte;
      imgData.data[idx + 2] = byte;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}
