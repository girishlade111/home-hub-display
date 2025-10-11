import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const accessToken = searchParams.get("accessToken")

  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token" }, { status: 400 })
  }

  try {
    // Get photos from Google Photos API
    const response = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=50", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Google Photos API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform Google Photos items to our photo format
    const photos =
      data.mediaItems?.map((item: any, index: number) => ({
        id: item.id,
        src: `${item.baseUrl}=w2048-h1536`,
        title: item.filename || `Photo ${index + 1}`,
        location: item.mediaMetadata?.photo?.cameraMake || "Unknown Location",
        date: item.mediaMetadata?.creationTime
          ? new Date(item.mediaMetadata.creationTime).toLocaleDateString()
          : "Unknown Date",
        source: "Google Photos",
        metadata: {
          camera:
            item.mediaMetadata?.photo?.cameraMake && item.mediaMetadata?.photo?.cameraModel
              ? `${item.mediaMetadata.photo.cameraMake} ${item.mediaMetadata.photo.cameraModel}`
              : undefined,
          width: Number.parseInt(item.mediaMetadata?.width) || undefined,
          height: Number.parseInt(item.mediaMetadata?.height) || undefined,
        },
      })) || []

    return NextResponse.json({ photos })
  } catch (error) {
    console.error("Google Photos API error:", error)
    return NextResponse.json({ error: "Failed to fetch photos from Google Photos" }, { status: 500 })
  }
}
