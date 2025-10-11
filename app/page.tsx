"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Settings,
  Cloud,
  Sun,
  CloudRain,
  CloudSnowIcon as Snow,
  Zap,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from "lucide-react"
import PhotoSourceSettings, { type PhotoSource, type DisplaySettings } from "@/components/photo-source-settings"
import { photoService, type Photo } from "@/lib/photo-service"
import { toggleFullscreen } from "@/lib/fullscreen-utils"

const WeatherIcon = ({ condition }: { condition: string }) => {
  switch (condition.toLowerCase()) {
    case "sunny":
      return <Sun className="w-8 h-8 text-primary" />
    case "partly cloudy":
      return <Cloud className="w-8 h-8 text-primary" />
    case "rainy":
      return <CloudRain className="w-8 h-8 text-primary" />
    case "snowy":
      return <Snow className="w-8 h-8 text-primary" />
    case "stormy":
      return <Zap className="w-8 h-8 text-primary" />
    default:
      return <Sun className="w-8 h-8 text-primary" />
  }
}

export default function GoogleHomeHub() {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isPlaying, setIsPlaying] = useState(true)
  const [showPhotoInfo, setShowPhotoInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photoSources, setPhotoSources] = useState<PhotoSource[]>([])
  const [isNightMode, setIsNightMode] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [lastActivity, setLastActivity] = useState(Date.now())

  const [weatherData, setWeatherData] = useState({
    temperature: 72,
    condition: "Partly Cloudy",
    location: "San Francisco, CA",
    humidity: 65,
    windSpeed: 8,
  })

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    weather: {
      enabled: true,
      location: "San Francisco, CA",
      units: "fahrenheit",
      position: "bottom-left",
    },
    time: {
      enabled: true,
      format: "12h",
      timezone: "America/Los_Angeles",
      showDate: true,
      dateFormat: "long",
      position: "top-left",
      showSeconds: false,
    },
    display: {
      photoTransitionSpeed: 10,
      autoHideControlsDelay: 5,
      screenBrightness: 100,
      darkMode: false,
    },
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const loadSettingsFromStorage = () => {
      try {
        const stored = localStorage.getItem("hub-settings")
        if (stored) {
          const settings = JSON.parse(stored)
          if (settings.sources) {
            setPhotoSources(settings.sources)
            photoService.updateSources(settings.sources)
          }
          if (settings.displaySettings) {
            setDisplaySettings(settings.displaySettings)
          }
        }
      } catch (error) {
        console.error("Failed to load settings from storage:", error)
      }
    }

    loadSettingsFromStorage()
  }, [])

  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now())
      setShowControls(true)

      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }

      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, displaySettings.display.autoHideControlsDelay * 1000)
    }

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"]
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true)
    })

    handleActivity() // Initialize

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true)
      })
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [displaySettings.display.autoHideControlsDelay])

  useEffect(() => {
    setIsNightMode(displaySettings.display.darkMode)
  }, [displaySettings.display.darkMode])

  useEffect(() => {
    const loadPhotos = async () => {
      setIsLoading(true)
      await photoService.refreshPhotos()
      const loadedPhotos = await photoService.getPhotos()
      const loadedSources = await photoService.getSources()

      setPhotos(loadedPhotos)
      setPhotoSources(loadedSources)
      setIsLoading(false)
    }
    loadPhotos()
  }, [])

  useEffect(() => {
    if (isPlaying && photos.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
      }, displaySettings.display.photoTransitionSpeed * 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, photos.length, displaySettings.display.photoTransitionSpeed])

  // Update time every second for smoother experience
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: displaySettings.time.format === "12h",
      timeZone: displaySettings.time.timezone,
    }

    if (displaySettings.time.showSeconds) {
      options.second = "2-digit"
    }

    return date.toLocaleTimeString("en-US", options)
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: displaySettings.time.timezone,
    }

    switch (displaySettings.time.dateFormat) {
      case "short":
        return date.toLocaleDateString("en-US", { ...options, month: "short", day: "numeric" })
      case "long":
        return date.toLocaleDateString("en-US", { ...options, weekday: "long", month: "long", day: "numeric" })
      case "numeric":
        return date.toLocaleDateString("en-US", { ...options, month: "numeric", day: "numeric", year: "numeric" })
      default:
        return date.toLocaleDateString("en-US", { ...options, weekday: "long", month: "long", day: "numeric" })
    }
  }

  const goToNextPhoto = useCallback(() => {
    if (photos.length === 0) return
    setIsLoading(true)
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
    setTimeout(() => setIsLoading(false), 300)
  }, [photos.length])

  const goToPrevPhoto = useCallback(() => {
    if (photos.length === 0) return
    setIsLoading(true)
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
    setTimeout(() => setIsLoading(false), 300)
  }, [photos.length])

  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const goToPhoto = (index: number) => {
    setIsLoading(true)
    setCurrentPhotoIndex(index)
    setTimeout(() => setIsLoading(false), 300)
  }

  const refreshPhotos = async () => {
    setIsRefreshing(true)
    await photoService.refreshPhotos()
    const refreshedPhotos = await photoService.getPhotos()
    setPhotos(refreshedPhotos)
    setIsRefreshing(false)
  }

  const handleUpdateSources = async (sources: PhotoSource[]) => {
    setPhotoSources(sources)
    photoService.updateSources(sources)
    await refreshPhotos()
  }

  const handleUpdateDisplaySettings = (settings: DisplaySettings) => {
    setDisplaySettings(settings)

    // Save to localStorage
    const settingsToSave = {
      sources: photoSources,
      displaySettings: settings,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem("hub-settings", JSON.stringify(settingsToSave))
  }

  const getPositionClasses = (position: string) => {
    switch (position) {
      case "top-left":
        return "top-8 left-8"
      case "top-right":
        return "top-8 right-8"
      case "bottom-left":
        return "bottom-8 left-8"
      case "bottom-right":
        return "bottom-8 right-8"
      default:
        return "top-8 left-8"
    }
  }

  const getTemperature = () => {
    if (displaySettings.weather.units === "celsius") {
      return Math.round(((weatherData.temperature - 32) * 5) / 9)
    }
    return weatherData.temperature
  }

  const getTemperatureUnit = () => {
    return displaySettings.weather.units === "celsius" ? "°C" : "°F"
  }

  const currentPhoto = photos[currentPhotoIndex]

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(`/api/weather?location=${encodeURIComponent(displaySettings.weather.location)}`)
        if (response.ok) {
          const data = await response.json()
          setWeatherData(data)
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error)
      }
    }

    if (displaySettings.weather.enabled && displaySettings.weather.location) {
      fetchWeather()
      // Refresh weather every 30 minutes
      const interval = setInterval(fetchWeather, 30 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [displaySettings.weather.location, displaySettings.weather.enabled])

  return (
    <div
      className={`relative w-full h-screen overflow-hidden bg-background transition-all duration-500`}
      style={{
        filter: `brightness(${displaySettings.display.screenBrightness}%) ${isNightMode ? "contrast(110%)" : ""}`,
      }}
    >
      {/* Enhanced Background Photo Carousel */}
      <div className="absolute inset-0">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentPhotoIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
          >
            <img
              src={photo.src || "/placeholder.svg"}
              alt={photo.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
        <div
          className={`absolute inset-0 transition-all duration-500 ${
            isNightMode ? "bg-black/60" : isLoading ? "bg-background/40" : "bg-background/20"
          }`}
        />

        {(isLoading || isRefreshing) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin shadow-lg" />
          </div>
        )}
      </div>

      {displaySettings.time.enabled && (
        <div className={`absolute ${getPositionClasses(displaySettings.time.position)} z-20`}>
          <div className="text-white">
            <h1 className="text-6xl font-bold mb-2 drop-shadow-2xl tracking-tight">{formatTime(currentTime)}</h1>
            {displaySettings.time.showDate && (
              <p className="text-xl opacity-90 drop-shadow-lg font-medium">{formatDate(currentTime)}</p>
            )}
          </div>
        </div>
      )}

      {displaySettings.weather.enabled && (
        <div className={`absolute ${getPositionClasses(displaySettings.weather.position)} z-20`}>
          <Card
            className={`${isNightMode ? "bg-black/70" : "bg-card/90"} backdrop-blur-md p-6 max-w-sm shadow-2xl border-0`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <WeatherIcon condition={weatherData.condition} />
              </div>
              <div>
                <h2
                  className={`text-4xl font-bold tracking-tight ${isNightMode ? "text-white" : "text-card-foreground"}`}
                >
                  {getTemperature()}
                  {getTemperatureUnit()}
                </h2>
                <p className={`font-medium ${isNightMode ? "text-white/80" : "text-muted-foreground"}`}>
                  {weatherData.condition}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <p
                className={`font-semibold text-base flex items-center gap-2 ${isNightMode ? "text-white" : "text-card-foreground"}`}
              >
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                {displaySettings.weather.location}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="text-center">
                  <p className={`text-xs ${isNightMode ? "text-white/60" : "text-muted-foreground"}`}>Humidity</p>
                  <p className={`font-semibold ${isNightMode ? "text-white" : "text-card-foreground"}`}>
                    {weatherData.humidity}%
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${isNightMode ? "text-white/60" : "text-muted-foreground"}`}>Wind</p>
                  <p className={`font-semibold ${isNightMode ? "text-white" : "text-card-foreground"}`}>
                    {weatherData.windSpeed} mph
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Content Overlay - now only contains controls */}
      <div
        className={`relative z-10 flex flex-col h-full p-8 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top Bar - now only contains control buttons */}
        <div className="flex justify-end items-start mb-8">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all duration-200 shadow-lg"
              title="Toggle Sound (M)"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleFullscreen}
              className="bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all duration-200 shadow-lg"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={refreshPhotos}
              disabled={isRefreshing}
              className="bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all duration-200 shadow-lg"
              title="Refresh Photos"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowPhotoInfo(!showPhotoInfo)}
              className="bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all duration-200 shadow-lg"
              title="Photo Info (I)"
            >
              <Info className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all duration-200 shadow-lg"
              title="Settings (S)"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {showPhotoInfo && currentPhoto && (
          <Card className="absolute top-24 left-8 bg-card/95 backdrop-blur-md p-6 max-w-sm animate-in slide-in-from-left-5 duration-300 shadow-2xl border-0">
            <h3 className="font-semibold text-card-foreground mb-2 text-lg">{currentPhoto.title}</h3>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              {currentPhoto.location}
            </p>
            <p className="text-xs text-muted-foreground mb-3">{currentPhoto.date}</p>
            <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
              <p className="font-medium">Source: {currentPhoto.source}</p>
              {currentPhoto.metadata?.camera && <p>Camera: {currentPhoto.metadata.camera}</p>}
              {currentPhoto.metadata?.width && currentPhoto.metadata?.height && (
                <p>
                  Resolution: {currentPhoto.metadata.width} × {currentPhoto.metadata.height}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Main Content Area - now only contains photo controls */}
        <div className="flex-1 flex items-end justify-center">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              onClick={goToPrevPhoto}
              disabled={photos.length === 0}
              className="bg-card/90 backdrop-blur-md hover:bg-card/95 transition-all duration-200 shadow-lg border-0 w-12 h-12"
              title="Previous Photo (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={togglePlayPause}
              disabled={photos.length === 0}
              className="bg-card/90 backdrop-blur-md hover:bg-card/95 transition-all duration-200 shadow-lg border-0 w-14 h-14"
              title="Play/Pause (Space)"
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={goToNextPhoto}
              disabled={photos.length === 0}
              className="bg-card/90 backdrop-blur-md hover:bg-card/95 transition-all duration-200 shadow-lg border-0 w-12 h-12"
              title="Next Photo (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Always visible minimal controls indicator */}
      <div
        className={`absolute bottom-4 right-4 transition-opacity duration-300 ${
          showControls ? "opacity-0" : "opacity-60"
        }`}
      >
        <div className="text-white/60 text-xs bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
          Move mouse to show controls
        </div>
      </div>

      <PhotoSourceSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        sources={photoSources}
        onUpdateSources={handleUpdateSources}
        displaySettings={displaySettings}
        onUpdateDisplaySettings={handleUpdateDisplaySettings}
        isNightMode={isNightMode}
      />
    </div>
  )
}
