const LANDSCAPE_MAX = { width: 1920, height: 1080 }
const PORTRAIT_MAX = { width: 1080, height: 1920 }
const SQUARE_MAX = 1440
const QUALITY = 0.85
const SKIP_UNDER_BYTES = 350 * 1024

export type ImageOrientation = "portrait" | "landscape" | "square"

export function imageOrientation(width: number, height: number): ImageOrientation {
  const ratio = width / Math.max(height, 1)
  if (ratio < 0.92) return "portrait"
  if (ratio > 1.08) return "landscape"
  return "square"
}

function fitBox(width: number, height: number) {
  const orientation = imageOrientation(width, height)
  const maxWidth =
    orientation === "portrait"
      ? PORTRAIT_MAX.width
      : orientation === "landscape"
        ? LANDSCAPE_MAX.width
        : SQUARE_MAX
  const maxHeight =
    orientation === "portrait"
      ? PORTRAIT_MAX.height
      : orientation === "landscape"
        ? LANDSCAPE_MAX.height
        : SQUARE_MAX
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    orientation,
    scale,
  }
}

function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") || fileName
}

export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file
  if (/svg|gif|heic|heif/i.test(file.type) || /\.(svg|gif|heic|heif)$/i.test(file.name)) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const fitted = fitBox(bitmap.width, bitmap.height)
    const alreadySmall =
      file.size <= SKIP_UNDER_BYTES && fitted.scale === 1
    if (alreadySmall) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement("canvas")
    canvas.width = fitted.width
    canvas.height = fitted.height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(bitmap, 0, 0, fitted.width, fitted.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    )
    if (!blob || blob.size >= file.size * 0.95) return file

    return new File([blob], `${baseName(file.name)}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}

export async function prepareUploadFiles(files: File[]) {
  return Promise.all(files.map((file) => compressImageIfNeeded(file)))
}
