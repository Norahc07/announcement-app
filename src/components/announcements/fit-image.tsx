import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

type ImageItem = { id: string; url?: string; file_name: string }

export function AnnouncementImages({
  images,
  focused = false,
}: {
  images: ImageItem[]
  focused?: boolean
}) {
  const visible = images.filter((image) => image.url)
  if (!visible.length) return null

  const count = visible.length
  const shown =
    count <= 4 ? visible : visible.slice(0, 4)
  const extra = count - shown.length

  if (count === 1) {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shown[0].url}
          alt={shown[0].file_name}
          className="mx-auto block h-auto w-auto max-w-full object-contain"
          style={{ maxHeight: focused ? "38rem" : "28rem" }}
        />
      </div>
    )
  }

  return (
    <div
      className={cn("grid gap-0.5 bg-background")}
      style={gridStyle(count, focused)}
    >
      {shown.map((image, index) => (
        <div
          key={image.id}
          className={cn("relative min-h-0 overflow-hidden", cellClass(count, index))}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.file_name}
            className="size-full object-cover"
          />
          {extra > 0 && index === shown.length - 1 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-3xl font-semibold">
              +{extra}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function gridStyle(count: number, focused: boolean): CSSProperties {
  const tall = focused ? 26 : 20
  if (count === 2) {
    return {
      gridTemplateColumns: "1fr 1fr",
      height: `${tall}rem`,
    }
  }
  if (count === 3) {
    return {
      gridTemplateColumns: "1.2fr 1fr",
      gridTemplateRows: "1fr 1fr",
      height: `${tall + 4}rem`,
    }
  }
  return {
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    height: `${tall + 4}rem`,
  }
}

function cellClass(count: number, index: number) {
  if (count === 3 && index === 0) return "row-span-2"
  return undefined
}
