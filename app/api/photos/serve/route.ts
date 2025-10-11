import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get("path")

    if (!filePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 })
    }

    const normalizedPath = path.normalize(filePath)
    if (normalizedPath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const fileBuffer = await fs.readFile(normalizedPath)
    const ext = path.extname(normalizedPath).toLowerCase()

    let contentType = "image/jpeg"
    switch (ext) {
      case ".png":
        contentType = "image/png"
        break
      case ".gif":
        contentType = "image/gif"
        break
      case ".webp":
        contentType = "image/webp"
        break
      case ".bmp":
        contentType = "image/bmp"
        break
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error) {
    console.error("Error serving photo:", error)
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
