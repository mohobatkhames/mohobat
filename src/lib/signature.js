function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('تعذرت قراءة صورة التوقيع.'));
    image.src = src;
  });
}

function cornerColor(data, width, height) {
  const points = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + width - 1) * 4];
  let red = 0;
  let green = 0;
  let blue = 0;
  points.forEach((index) => {
    red += data[index];
    green += data[index + 1];
    blue += data[index + 2];
  });
  return [red / points.length, green / points.length, blue / points.length];
}

function trimTransparent(image) {
  const { data, width, height } = image;
  let top = height;
  let left = width;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 12) continue;
      top = Math.min(top, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return null;
  const pad = 8;
  const x = Math.max(0, left - pad);
  const y = Math.max(0, top - pad);
  const w = Math.min(width - x, right - left + 1 + pad * 2);
  const h = Math.min(height - y, bottom - top + 1 + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d');
  const cropped = context.createImageData(w, h);
  for (let row = 0; row < h; row += 1) {
    const source = ((y + row) * width + x) * 4;
    cropped.data.set(data.slice(source, source + w * 4), row * w * 4);
  }
  context.putImageData(cropped, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function signatureFromFile(file) {
  const address = URL.createObjectURL(file);
  try {
    const image = await loadImage(address);
    const scale = Math.min(1, 720 / image.width, 280 / image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);
    const frame = context.getImageData(0, 0, width, height);
    const [red, green, blue] = cornerColor(frame.data, width, height);
    for (let index = 0; index < frame.data.length; index += 4) {
      const distance = Math.hypot(frame.data[index] - red, frame.data[index + 1] - green, frame.data[index + 2] - blue);
      const light = (frame.data[index] + frame.data[index + 1] + frame.data[index + 2]) / 3;
      if (distance < 38 || light > 246) frame.data[index + 3] = 0;
      else if (distance < 68) frame.data[index + 3] = Math.round(frame.data[index + 3] * ((distance - 38) / 30));
    }
    const png = trimTransparent(frame);
    if (!png) throw new Error('لم يظهر حبر في صورة التوقيع.');
    return png;
  } finally {
    URL.revokeObjectURL(address);
  }
}
