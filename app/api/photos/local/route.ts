import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const imageFiles = []
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = "." + file.name.split(".").pop()?.toLowerCase()

      if (imageExtensions.includes(ext)) {
        // Convert file to base64 data URL for immediate use
        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString("base64")
        const dataUrl = `data:${file.type};base64,${base64}`

        imageFiles.push({
          name: file.name,
          url: dataUrl,
          modified: new Date(file.lastModified),
          size: file.size,
          type: file.type,
          metadata: {
            width: null, // Would need image processing to get dimensions
            height: null,
          },
        })
      }
    }

    return NextResponse.json(imageFiles)
  } catch (error) {
    console.error("Error processing uploaded files:", error)
    return NextResponse.json({ error: "Failed to process files" }, { status: 500 })
  }
}

// Keep GET method for backward compatibility but return empty array
export async function GET() {
  return NextResponse.json([])
}
