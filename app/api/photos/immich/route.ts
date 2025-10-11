import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url: serverUrl, apiKey, albumId, test, listAlbums } = body

    if (!serverUrl || !apiKey) {
      return NextResponse.json({ error: "Missing serverUrl or apiKey" }, { status: 400 })
    }

    if (test) {
      try {
        const testResponse = await fetch(`${serverUrl}/api/server-info`, {
          headers: {
            "x-api-key": apiKey,
            Accept: "application/json",
          },
        })
        return NextResponse.json({ success: testResponse.ok })
      } catch (error) {
        return NextResponse.json({ success: false })
      }
    }

    if (listAlbums) {
      try {
        const albumsResponse = await fetch(`${serverUrl}/api/albums`, {
          headers: {
            "x-api-key": apiKey,
            Accept: "application/json",
          },
        })

        if (!albumsResponse.ok) {
          const errorText = await albumsResponse.text()
          console.error(`Immich albums API error (${albumsResponse.status}):`, errorText)
          return NextResponse.json(
            { error: `Failed to fetch albums: ${albumsResponse.status} ${albumsResponse.statusText}` },
            { status: albumsResponse.status },
          )
        }

        const albums = await albumsResponse.json()
        return NextResponse.json({
          albums: Array.isArray(albums)
            ? albums.map((album: any) => ({
                id: album.id,
                name: album.albumName || album.name || "Unnamed Album",
                assetCount: album.assetCount || 0,
                description: album.description,
              }))
            : [],
        })
      } catch (error) {
        console.error("Error fetching albums:", error)
        return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 })
      }
    }

    let response: Response

    if (albumId) {
      // Use album-specific endpoint
      response = await fetch(`${serverUrl}/api/albums/${albumId}`, {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
      })
    } else {
      // Use search metadata endpoint for all assets
      response = await fetch(`${serverUrl}/api/search/metadata`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          size: 50,
          type: "IMAGE",
        }),
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Immich API error (${response.status}):`, errorText)
      return NextResponse.json(
        { error: `Immich API error: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    const assets = albumId ? data.assets || [] : data.assets?.items || []

    if (!Array.isArray(assets)) {
      console.error("Immich API returned non-array assets:", data)
      return NextResponse.json({ error: "Invalid response format from Immich" }, { status: 500 })
    }

    const photos = assets.map((asset: any, index: number) => ({
      id: asset.id || `immich-${index}`,
      thumbnailUrl: `${serverUrl}/api/assets/${asset.id}/thumbnail?size=preview`,
      src: `${serverUrl}/api/assets/${asset.id}/original`,
      originalFileName: asset.originalFileName,
      filename: asset.originalPath?.split("/").pop() || asset.originalFileName,
      fileCreatedAt: asset.fileCreatedAt,
      createdAt: asset.createdAt,
      exifInfo: asset.exifInfo,
      width: asset.exifInfo?.exifImageWidth,
      height: asset.exifInfo?.exifImageHeight,
    }))

    return NextResponse.json(photos)
  } catch (error) {
    console.error("Immich API route error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch photos from Immich" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const serverUrl = searchParams.get("serverUrl")
  const apiKey = searchParams.get("apiKey")
  const albumId = searchParams.get("albumId")

  if (!serverUrl || !apiKey) {
    return NextResponse.json({ error: "Missing serverUrl or apiKey" }, { status: 400 })
  }

  try {
    let response: Response

    if (albumId) {
      response = await fetch(`${serverUrl}/api/albums/${albumId}`, {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
      })
    } else {
      response = await fetch(`${serverUrl}/api/search/metadata`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          size: 50,
          type: "IMAGE",
        }),
      })
    }

    if (!response.ok) {
      throw new Error(`Immich API error: ${response.status}`)
    }

    const data = await response.json()
    const assets = albumId ? data.assets || [] : data.assets?.items || []

    // Transform Immich assets to our photo format
    const photos = assets.map((asset: any, index: number) => ({
      id: asset.id || `immich-${index}`,
      src: `${serverUrl}/api/assets/${asset.id}/original`,
      title: asset.originalFileName || `Photo ${index + 1}`,
      location: asset.exifInfo?.city || asset.exifInfo?.state || "Unknown Location",
      date: asset.fileCreatedAt ? new Date(asset.fileCreatedAt).toLocaleDateString() : "Unknown Date",
      source: "Immich",
      metadata: {
        camera:
          asset.exifInfo?.make && asset.exifInfo?.model ? `${asset.exifInfo.make} ${asset.exifInfo.model}` : undefined,
        width: asset.exifInfo?.exifImageWidth,
        height: asset.exifInfo?.exifImageHeight,
      },
    }))

    return NextResponse.json({ photos })
  } catch (error) {
    console.error("Immich API error:", error)
    return NextResponse.json({ error: "Failed to fetch photos from Immich" }, { status: 500 })
  }
}
