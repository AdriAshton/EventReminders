export async function compressImageFile(file: File, maxWidth = 1200, quality = 0.78) {
  if (typeof window === "undefined") {
    return file;
  }

  if (!file.type.startsWith("image/")) {
    return file;
  }

  let imageBitmap: ImageBitmap;
  try {
    imageBitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, maxWidth / imageBitmap.width);
  const width = Math.max(1, Math.round(imageBitmap.width * scale));
  const height = Math.max(1, Math.round(imageBitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    imageBitmap.close();
    return file;
  }

  context.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/webp", quality);
  });

  if (!blob) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: file.lastModified,
  });
}