Add-Type -AssemblyName System.Drawing

$source = @"
using System;
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
      Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
      work.UnlockBits(data);
      int pad = 6;
      minX = Math.Max(0, minX - pad);
      minY = Math.Max(0, minY - pad);
      maxX = Math.Min(work.Width - 1, maxX + pad);
      maxY = Math.Min(work.Height - 1, maxY + pad);
      var cropRect = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
      using (var crop = work.Clone(cropRect, PixelFormat.Format32bppArgb)) {
        work.Dispose();
        Directory.CreateDirectory(outDir);
        Save(crop, 192, Path.Combine(outDir, "icon-192.png"), 0.74f, true);
        Save(crop, 512, Path.Combine(outDir, "icon-512.png"), 0.74f, true);
        Save(crop, 512, Path.Combine(outDir, "icon-maskable-512.png"), 0.68f, false);
        Save(crop, 180, applePath, 0.72f, true);
      }
    }
  }

  static void Save(Bitmap crop, int size, string path, float fill, bool withLabel) {
    using (var bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
    using (var g = Graphics.FromImage(bmp)) {
      g.SmoothingMode = SmoothingMode.HighQuality;
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      g.TextRenderingHint = TextRenderingHint.AntiAlias;
      g.Clear(Color.Transparent);
      int textH = withLabel ? (int)(size * 0.18f) : 0;
      int logoMax = (int)((size - textH) * fill);
      float scale = Math.Min((float)logoMax / crop.Width, (float)logoMax / crop.Height);
      int lw = Math.Max(1, (int)(crop.Width * scale));
      int lh = Math.Max(1, (int)(crop.Height * scale));
      int x = (size - lw) / 2;
      int y = Math.Max(0, ((size - textH) - lh) / 2);
      g.DrawImage(crop, new Rectangle(x, y, lw, lh));
      if (withLabel) {
        float fontSize = Math.Max(16f, size * 0.09f);
        using (var font = new Font("Tahoma", fontSize, FontStyle.Bold, GraphicsUnit.Pixel))
        using (var brush = new SolidBrush(Color.FromArgb(255, 11, 58, 102)))
        using (var format = new StringFormat()) {
          format.Alignment = StringAlignment.Center;
          format.LineAlignment = StringAlignment.Center;
          format.FormatFlags = StringFormatFlags.DirectionRightToLeft | StringFormatFlags.NoWrap;
          g.DrawString("\u0645\u0648\u0647\u0648\u0628\u0627\u062A", font, brush, new RectangleF(0, size - textH, size, textH), format);
        }
      }
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
