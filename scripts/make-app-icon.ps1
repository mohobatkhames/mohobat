Add-Type -AssemblyName System.Drawing

$source = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Runtime.InteropServices;

public static class MohobatIconMaker {
  public static void Build(string srcPath, string outDir, string applePath) {
    using (var src = new Bitmap(srcPath)) {
      var work = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
      using (var g = Graphics.FromImage(work)) {
        g.DrawImage(src, 0, 0, src.Width, src.Height);
      }
      var rect = new Rectangle(0, 0, work.Width, work.Height);
      var data = work.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride = data.Stride;
      byte[] bytes = new byte[stride * work.Height];
      Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
      int minX = work.Width, minY = work.Height, maxX = 0, maxY = 0;
      for (int y = 0; y < work.Height; y++) {
        int row = y * stride;
        for (int x = 0; x < work.Width; x++) {
          int i = row + x * 4;
          int b = bytes[i], gg = bytes[i + 1], r = bytes[i + 2];
          int max = r > gg ? r : gg;
          if (b > max) max = b;
          if (max < 22) bytes[i + 3] = 0;
          else if (max < 46) bytes[i + 3] = (byte)((max - 22) * 255 / 24);
          if (bytes[i + 3] > 28) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      ClearEdgeBackdrop(bytes, stride, work.Width, work.Height);
      minX = work.Width; minY = work.Height; maxX = 0; maxY = 0;
      for (int y = 0; y < work.Height; y++) {
        int row = y * stride;
        for (int x = 0; x < work.Width; x++) {
          if (bytes[row + x * 4 + 3] <= 28) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
      work.UnlockBits(data);
      int pad = 2;
      minX = Math.Max(0, minX - pad);
      minY = Math.Max(0, minY - pad);
      maxX = Math.Min(work.Width - 1, maxX + pad);
      maxY = Math.Min(work.Height - 1, maxY + pad);
      var cropRect = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
      using (var crop = work.Clone(cropRect, PixelFormat.Format32bppArgb)) {
        work.Dispose();
        Directory.CreateDirectory(outDir);
        Save(crop, 192, Path.Combine(outDir, "icon-192.png"));
        Save(crop, 512, Path.Combine(outDir, "icon-512.png"));
        Save(crop, 512, Path.Combine(outDir, "icon-maskable-512.png"));
        Save(crop, 180, applePath);
      }
    }
  }

  static bool IsBackdrop(byte[] bytes, int i) {
    int a = bytes[i + 3];
    if (a < 24) return true;
    int b = bytes[i], g = bytes[i + 1], r = bytes[i + 2];
    int max = r > g ? r : g;
    if (b > max) max = b;
    int min = r < g ? r : g;
    if (b < min) min = b;
    if (max < 36) return true;
    return min > 242 && (max - min) < 16;
  }

  static void ClearEdgeBackdrop(byte[] bytes, int stride, int width, int height) {
    var queue = new Queue<int>();
    var seen = new bool[width * height];
    Action<int, int> push = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      int id = y * width + x;
      if (seen[id]) return;
      if (!IsBackdrop(bytes, y * stride + x * 4)) return;
      seen[id] = true;
      queue.Enqueue(id);
    };
    for (int x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
    for (int y = 0; y < height; y++) { push(0, y); push(width - 1, y); }
    while (queue.Count > 0) {
      int id = queue.Dequeue();
      int x = id % width;
      int y = id / width;
      bytes[y * stride + x * 4 + 3] = 0;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
  }

  static void Save(Bitmap crop, int size, string path) {
    using (var bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
    using (var g = Graphics.FromImage(bmp)) {
      g.SmoothingMode = SmoothingMode.HighQuality;
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      g.Clear(Color.Transparent);
      int logoMax = (int)(size * 0.98f);
      float scale = Math.Min((float)logoMax / crop.Width, (float)logoMax / crop.Height);
      int lw = Math.Max(1, (int)(crop.Width * scale));
      int lh = Math.Max(1, (int)(crop.Height * scale));
      g.DrawImage(crop, new Rectangle((size - lw) / 2, (size - lh) / 2, lw, lh));
      var rect = new Rectangle(0, 0, size, size);
      var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride = data.Stride;
      byte[] bytes = new byte[stride * size];
      Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
      float radius = size * 0.49f;
      float cx = (size - 1) / 2f;
      float cy = (size - 1) / 2f;
      for (int y = 0; y < size; y++) {
        int row = y * stride;
        for (int x = 0; x < size; x++) {
          float dx = x - cx, dy = y - cy;
          int i = row + x * 4;
          if ((dx * dx) + (dy * dy) > radius * radius) bytes[i + 3] = 0;
        }
      }
      Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
      bmp.UnlockBits(data);
      bmp.Save(path, ImageFormat.Png);
    }
  }
}
"@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing
$root = Split-Path $PSScriptRoot -Parent
[MohobatIconMaker]::Build(
  (Join-Path $root "429361.png"),
  (Join-Path $root "public\icons"),
  (Join-Path $root "public\apple-touch-icon.png")
)
Write-Output "icons-ready"
