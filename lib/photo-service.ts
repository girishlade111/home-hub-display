export interface Photo {
  id: string
  src: string
  title: string
  location?: string
  date: string
  source: string
  metadata?: {
    width?: number
    height?: number
    size?: number
    camera?: string
  }
}

export interface PhotoSource {
  id: string
  name: string
  type: "immich" | "google-photos" | "local" | "url"
  enabled: boolean
  config: {
    url?: string
    apiKey?: string
    albumId?: string
    folder?: string
    refreshInterval?: number
    urls?: string
    uploadedFiles?: any[]
  }
}

class PhotoService {
  private photos: Photo[] = []
  private sources: PhotoSource[] = []

  // Default sample photos for demo
  private samplePhotos: Photo[] = [
    {
      id: "1",
      src: "/mountain-sunset.png",
      title: "Mountain Sunset",
      location: "Rocky Mountains, Colorado",
      date: "2024-03-15",
      source: "sample",
    },
    {
      id: "2",
      src: "/serene-lake-reflection.png",
      title: "Lake Reflection",
      location: "Lake Tahoe, California",
      date: "2024-06-08",
      source: "sample",
    },
    {
      id: "3",
      src: "/cozy-living-room.png",
      title: "Cozy Living Room",
      location: "Home Sweet Home",
      date: "2024-01-22",
      source: "sample",
    },
    {
      id: "4",
      src: "/modern-kitchen-natural-light.png",
      title: "Modern Kitchen",
      location: "Downtown Loft",
      date: "2024-04-03",
      source: "sample",
    },
    {
      id: "5",
      src: "/peaceful-flower-garden.png",
      title: "Flower Garden",
      location: "Botanical Gardens",
      date: "2024-05-12",
      source: "sample",
    },
  ]

  constructor() {
    this.loadFromStorage()
    if (this.photos.length === 0) {
      this.photos = [...this.samplePhotos]
    }
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      const storedSources = localStorage.getItem("photoSources")
      const storedPhotos = localStorage.getItem("photos")

      if (storedSources) {
        this.sources = JSON.parse(storedSources)
      }

      if (storedPhotos) {
        this.photos = JSON.parse(storedPhotos)
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      localStorage.setItem("photoSources", JSON.stringify(this.sources))
      localStorage.setItem("photos", JSON.stringify(this.photos))
    }
  }

  async fetchPhotosFromImmich(source: PhotoSource): Promise<Photo[]> {
    if (!source.config.url || !source.config.apiKey) {
      throw new Error("Immich URL and API key are required")
    }

    try {
      const response = await fetch("/api/photos/immich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: source.config.url,
          apiKey: source.config.apiKey,
          albumId: source.config.albumId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Immich API error (${response.status}): ${errorText}`)
      }

      const assets = await response.json()

      if (!Array.isArray(assets)) {
        console.warn("Immich API returned non-array response:", assets)
        return []
      }

      return assets.slice(0, 50).map((asset: any, index: number) => ({
        id: asset.id || `immich-${index}`,
        src: asset.thumbnailUrl || `${source.config.url}/api/assets/${asset.id}/thumbnail?size=preview`,
        title: asset.originalFileName || asset.filename || `Photo ${index + 1}`,
        location: asset.exifInfo?.city || asset.exifInfo?.state || "Unknown",
        date: asset.fileCreatedAt || asset.createdAt || new Date().toISOString().split("T")[0],
        source: source.name,
        metadata: {
          width: asset.exifInfo?.imageWidth || asset.width,
          height: asset.exifInfo?.imageHeight || asset.height,
          camera:
            asset.exifInfo?.make && asset.exifInfo?.model
              ? `${asset.exifInfo.make} ${asset.exifInfo.model}`
              : undefined,
        },
      }))
    } catch (error) {
      console.error("Error fetching from Immich:", error)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to connect to Immich server. Check URL and network connectivity.")
      }
      throw error
    }
  }

  async fetchPhotosFromGooglePhotos(source: PhotoSource): Promise<Photo[]> {
    if (!source.config.apiKey) {
      console.log("Google Photos integration requires API key")
      return []
    }

    try {
      // This would require proper OAuth flow in a real implementation
      // For now, we'll return a placeholder structure
      const response = await fetch(
        `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=50${
          source.config.albumId ? `&albumId=${source.config.albumId}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${source.config.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Google Photos API error: ${response.statusText}`)
      }

      const data = await response.json()

      return (data.mediaItems || []).map((item: any, index: number) => ({
        id: item.id || `google-${index}`,
        src: `${item.baseUrl}=w2048-h1536`,
        title: item.filename || `Photo ${index + 1}`,
        location: item.mediaMetadata?.photo?.cameraMake || "Google Photos",
        date: item.mediaMetadata?.creationTime?.split("T")[0] || new Date().toISOString().split("T")[0],
        source: source.name,
        metadata: {
          width: Number.parseInt(item.mediaMetadata?.width) || undefined,
          height: Number.parseInt(item.mediaMetadata?.height) || undefined,
          camera: item.mediaMetadata?.photo?.cameraMake
            ? `${item.mediaMetadata.photo.cameraMake} ${item.mediaMetadata.photo.cameraModel || ""}`
            : undefined,
        },
      }))
    } catch (error) {
      console.error("Error fetching from Google Photos:", error)
      return []
    }
  }

  async fetchPhotosFromLocal(source: PhotoSource): Promise<Photo[]> {
    if (!source.config.uploadedFiles || source.config.uploadedFiles.length === 0) {
      console.log("No uploaded files found for local source")
      return []
    }

    try {
      const photos: Photo[] = []

      for (let i = 0; i < source.config.uploadedFiles.length; i++) {
        const file = source.config.uploadedFiles[i]
        photos.push({
          id: `local-${file.name}-${i}`,
          src: file.url,
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          location: "Uploaded Files",
          date: new Date(file.modified).toISOString().split("T")[0],
          source: source.name,
          metadata: {
            width: file.metadata?.width,
            height: file.metadata?.height,
            size: file.size,
          },
        })
      }

      return photos
    } catch (error) {
      console.error("Error processing uploaded files:", error)
      return []
    }
  }

  async fetchPhotosFromUrl(source: PhotoSource): Promise<Photo[]> {
    const urlsString = source.config.urls || source.config.url
    if (!urlsString?.trim()) {
      throw new Error("URLs are required for URL source")
    }

    try {
      const urls = urlsString
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url.length > 0)

      if (urls.length === 0) {
        throw new Error("At least one valid URL is required")
      }

      if (source.name.toLowerCase().includes("picsum") || urls.some((url) => url.includes("picsum.photos"))) {
        return this.fetchPhotosFromPicsum(source)
      }

      const photos: Photo[] = []

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]

        try {
          new URL(url)

          const response = await fetch(url, { method: "HEAD" })

          if (response.ok) {
            const contentType = response.headers.get("content-type")
            if (contentType?.startsWith("image/")) {
              photos.push({
                id: `url-${source.id}-${i}`,
                src: url,
                title: `${source.name} Photo ${i + 1}`,
                location: new URL(url).hostname,
                date: new Date().toISOString().split("T")[0],
                source: source.name,
                metadata: {
                  size: Number.parseInt(response.headers.get("content-length") || "0"),
                },
              })
            }
          }
        } catch (urlError) {
          console.warn(`Skipping invalid URL: ${url}`, urlError)
        }
      }

      return photos
    } catch (error) {
      console.error("Error fetching from URL source:", error)
      return []
    }
  }

  async fetchPhotosFromPicsum(source: PhotoSource): Promise<Photo[]> {
    try {
      const photos: Photo[] = []
      const count = 20

      for (let i = 0; i < count; i++) {
        const width = 1920
        const height = 1080
        const seed = Math.floor(Math.random() * 1000) + i

        photos.push({
          id: `picsum-${seed}`,
          src: `https://picsum.photos/${width}/${height}?random=${seed}`,
          title: `Random Photo ${i + 1}`,
          location: "Lorem Picsum",
          date: new Date().toISOString().split("T")[0],
          source: source.name,
          metadata: {
            width,
            height,
          },
        })
      }

      return photos
    } catch (error) {
      console.error("Error fetching from Picsum:", error)
      return []
    }
  }

  async refreshPhotos(): Promise<void> {
    const enabledSources = this.sources.filter((s) => s.enabled)
    const newPhotos: Photo[] = enabledSources.length > 0 ? [] : [...this.samplePhotos]
    const invalidSources: string[] = []

    for (const source of this.sources) {
      if (!source.enabled) continue

      let isValid = true
      let validationMessage = ""

      switch (source.type) {
        case "url":
          const urlsString = source.config.urls || source.config.url
          if (!urlsString?.trim()) {
            isValid = false
            validationMessage = "URLs are required"
          }
          break
        case "immich":
          if (!source.config.url?.trim() || !source.config.apiKey?.trim()) {
            isValid = false
            validationMessage = "URL and API key are required"
          }
          break
        case "local":
          if (!source.config.uploadedFiles || source.config.uploadedFiles.length === 0) {
            isValid = false
            validationMessage = "No files uploaded"
          }
          break
        case "google-photos":
          if (!source.config.apiKey?.trim()) {
            isValid = false
            validationMessage = "API key is required"
          }
          break
      }

      if (!isValid) {
        console.warn(`Skipping ${source.type} source "${source.name}": ${validationMessage}`)
        invalidSources.push(`${source.name} (${validationMessage})`)
        continue
      }

      try {
        let sourcePhotos: Photo[] = []

        switch (source.type) {
          case "immich":
            sourcePhotos = await this.fetchPhotosFromImmich(source)
            break
          case "google-photos":
            sourcePhotos = await this.fetchPhotosFromGooglePhotos(source)
            break
          case "local":
            sourcePhotos = await this.fetchPhotosFromLocal(source)
            break
          case "url":
            sourcePhotos = await this.fetchPhotosFromUrl(source)
            break
        }

        newPhotos.push(...sourcePhotos)
        console.log(`[v0] Successfully loaded ${sourcePhotos.length} photos from ${source.name}`)
      } catch (error) {
        console.error(`Error fetching from source ${source.name}:`, error)
        invalidSources.push(`${source.name} (${error instanceof Error ? error.message : "Unknown error"})`)
      }
    }

    if (invalidSources.length > 0) {
      console.warn(`[v0] Found ${invalidSources.length} invalid photo sources:`, invalidSources)
    }

    this.photos = newPhotos
    this.saveToStorage()

    console.log(
      `[v0] Photo refresh complete: ${newPhotos.length} total photos from ${enabledSources.length} enabled sources`,
    )
  }

  getPhotos(): Photo[] {
    return this.photos
  }

  getSources(): PhotoSource[] {
    return this.sources
  }

  updateSources(sources: PhotoSource[]): void {
    this.sources = sources
    this.saveToStorage()
    this.refreshPhotos()
  }

  async testConnection(source: PhotoSource): Promise<boolean> {
    try {
      switch (source.type) {
        case "immich":
          if (!source.config.url || !source.config.apiKey) return false
          const response = await fetch("/api/photos/immich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: source.config.url,
              apiKey: source.config.apiKey,
              test: true,
            }),
          })
          return response.ok
        case "local":
          return !!(source.config.uploadedFiles && source.config.uploadedFiles.length > 0)
        case "url":
          const urlsString = source.config.urls || source.config.url
          if (!urlsString?.trim()) return false

          const firstUrl = urlsString.split("\n")[0]?.trim()
          if (!firstUrl) return false

          const urlResponse = await fetch(firstUrl, { method: "HEAD" })
          return urlResponse.ok && urlResponse.headers.get("content-type")?.startsWith("image/") === true
        case "google-photos":
          return !!source.config.apiKey
        default:
          return true
      }
    } catch {
      return false
    }
  }

  getInvalidSources(): { source: PhotoSource; reason: string }[] {
    const invalid: { source: PhotoSource; reason: string }[] = []

    for (const source of this.sources) {
      if (!source.enabled) continue

      let reason = ""

      switch (source.type) {
        case "url":
          const urlsString = source.config.urls || source.config.url
          if (!urlsString?.trim()) {
            reason = "URLs are required"
          }
          break
        case "immich":
          if (!source.config.url?.trim() || !source.config.apiKey?.trim()) {
            reason = "URL and API key are required"
          }
          break
        case "local":
          if (!source.config.uploadedFiles || source.config.uploadedFiles.length === 0) {
            reason = "No files uploaded"
          }
          break
        case "google-photos":
          if (!source.config.apiKey?.trim()) {
            reason = "API key is required"
          }
          break
      }

      if (reason) {
        invalid.push({ source, reason })
      }
    }

    return invalid
  }
}

export const photoService = new PhotoService()
