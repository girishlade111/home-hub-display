"use client"

import React from "react"

import type { ReactElement } from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { X, Plus, ImageIcon, Server, Upload, Folder, Settings, Download } from "lucide-react"

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

export interface DisplaySettings {
  weather: {
    enabled: boolean
    location: string
    units: "celsius" | "fahrenheit"
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  }
  time: {
    enabled: boolean
    format: "12h" | "24h"
    timezone: string
    showDate: boolean
    dateFormat: "short" | "long" | "numeric"
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right"
    showSeconds: boolean
  }
  display: {
    photoTransitionSpeed: number
    autoHideControlsDelay: number
    screenBrightness: number
    darkMode: boolean
  }
}

interface PhotoSourceSettingsProps {
  isOpen: boolean
  onClose: () => void
  sources: PhotoSource[]
  onUpdateSources: (sources: PhotoSource[]) => void
  displaySettings: DisplaySettings
  onUpdateDisplaySettings: (settings: DisplaySettings) => void
  isNightMode?: boolean
}

export default function PhotoSourceSettings({
  isOpen,
  onClose,
  sources,
  onUpdateSources,
  displaySettings,
  onUpdateDisplaySettings,
  isNightMode = false,
}: PhotoSourceSettingsProps): ReactElement | null {
  const [editingSources, setEditingSources] = useState<PhotoSource[]>(sources)
  const [editingDisplaySettings, setEditingDisplaySettings] = useState<DisplaySettings>(displaySettings)
  const [newSource, setNewSource] = useState<Partial<PhotoSource>>({
    type: "immich",
    enabled: true,
    config: {},
  })
  const [activeTab, setActiveTab] = useState("sources")
  const [immichAlbums, setImmichAlbums] = useState<{ [sourceId: string]: any[] }>({})
  const [loadingAlbums, setLoadingAlbums] = useState<{ [sourceId: string]: boolean }>({})
  const fileInputRef = React.createRef<HTMLInputElement>()

  const saveSettingsToStorage = () => {
    const settings = {
      sources: editingSources,
      displaySettings: editingDisplaySettings,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem("hub-settings", JSON.stringify(settings))
  }

  const loadSettingsFromStorage = () => {
    try {
      const stored = localStorage.getItem("hub-settings")
      if (stored) {
        const settings = JSON.parse(stored)
        if (settings.sources) {
          setEditingSources(settings.sources)
          onUpdateSources(settings.sources)
        }
        if (settings.displaySettings) {
          setEditingDisplaySettings(settings.displaySettings)
          onUpdateDisplaySettings(settings.displaySettings)
        }
      }
    } catch (error) {
      console.error("Failed to load settings from storage:", error)
    }
  }

  const exportSettings = () => {
    const settings = {
      sources: editingSources,
      displaySettings: editingDisplaySettings,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    }

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hub-settings-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)

        if (settings.sources && Array.isArray(settings.sources)) {
          setEditingSources(settings.sources)
        }

        if (settings.displaySettings) {
          setEditingDisplaySettings(settings.displaySettings)
        }

        alert("Settings imported successfully!")
      } catch (error) {
        alert("Failed to import settings. Please check the file format.")
        console.error("Import error:", error)
      }
    }
    reader.readAsText(file)

    // Reset the input
    event.target.value = ""
  }

  useEffect(() => {
    loadSettingsFromStorage()
  }, [])

  if (!isOpen) return null

  const addNewSource = () => {
    if (!newSource.name?.trim()) {
      alert("Please enter a source name")
      return
    }

    if (newSource.type === "immich" && (!newSource.config?.url?.trim() || !newSource.config?.apiKey?.trim())) {
      alert("Please enter both Immich server URL and API key")
      return
    }

    if (
      newSource.type === "local" &&
      (!newSource.config?.uploadedFiles || newSource.config.uploadedFiles.length === 0)
    ) {
      alert("Please upload at least one photo")
      return
    }

    const source: PhotoSource = {
      id: Date.now().toString(),
      name: newSource.name.trim(),
      type: newSource.type as PhotoSource["type"],
      enabled: newSource.enabled || true,
      config: newSource.config || {},
    }

    const updatedSources = [...editingSources, source]
    setEditingSources(updatedSources)
    onUpdateSources(updatedSources)
    setNewSource({ type: "immich", enabled: true, config: {} })
    setActiveTab("sources")
  }

  const updateSource = (id: string, updates: Partial<PhotoSource>) => {
    setEditingSources(editingSources.map((source) => (source.id === id ? { ...source, ...updates } : source)))
  }

  const removeSource = (id: string) => {
    setEditingSources(editingSources.filter((source) => source.id !== id))
  }

  const saveChanges = () => {
    onUpdateSources(editingSources)
    onUpdateDisplaySettings(editingDisplaySettings)
    saveSettingsToStorage()
    onClose()
  }

  const updateDisplaySettings = (section: keyof DisplaySettings, updates: any) => {
    setEditingDisplaySettings({
      ...editingDisplaySettings,
      [section]: { ...editingDisplaySettings[section], ...updates },
    })
  }

  const getSourceIcon = (type: PhotoSource["type"]) => {
    switch (type) {
      case "immich":
        return <Server className="w-4 h-4" />
      case "google-photos":
        return <ImageIcon className="w-4 h-4" />
      case "local":
        return <Folder className="w-4 h-4" />
      case "url":
        return <Upload className="w-4 h-4" />
    }
  }

  const loadImmichAlbums = async (sourceId: string, url: string, apiKey: string) => {
    if (!url || !apiKey) {
      alert("Please enter both Immich server URL and API key first")
      return
    }

    setLoadingAlbums((prev) => ({ ...prev, [sourceId]: true }))

    try {
      const response = await fetch("/api/photos/immich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          apiKey,
          listAlbums: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setImmichAlbums((prev) => ({ ...prev, [sourceId]: data.albums || [] }))
      } else {
        const error = await response.json()
        alert(`Failed to load albums: ${error.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error loading albums:", error)
      alert("Failed to connect to Immich server")
    } finally {
      setLoadingAlbums((prev) => ({ ...prev, [sourceId]: false }))
    }
  }

  return (
    <div
      className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${
        isNightMode ? "bg-black/80" : "bg-black/50"
      }`}
    >
      <Card
        className={`w-full max-w-4xl max-h-[90vh] overflow-hidden ${
          isNightMode ? "bg-black/90 border-white/20 text-white" : "bg-card"
        }`}
      >
        <div className={`flex items-center justify-between p-6 border-b ${isNightMode ? "border-white/20" : ""}`}>
          <h2 className={`text-2xl font-semibold ${isNightMode ? "text-white" : ""}`}>Hub Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList
              className={`grid w-full grid-cols-4 ${
                isNightMode
                  ? "bg-black/70 border-white/30 text-white [&>button]:text-white [&>button[data-state=active]]:bg-white/20 [&>button[data-state=active]]:text-white"
                  : "bg-muted [&>button[data-state=active]]:bg-background [&>button[data-state=active]]:text-foreground"
              }`}
            >
              <TabsTrigger value="sources">Photo Sources</TabsTrigger>
              <TabsTrigger value="display">Display Settings</TabsTrigger>
              <TabsTrigger value="add">Add Source</TabsTrigger>
              <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
            </TabsList>

            <TabsContent value="display" className="space-y-6">
              {/* Appearance Settings */}
              <Card className={`p-4 ${isNightMode ? "bg-black/50 border-white/20" : ""}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5" />
                  <h3 className={`font-medium ${isNightMode ? "text-white" : ""}`}>Appearance</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className={isNightMode ? "text-white" : ""}>Dark Mode</Label>
                      <p className={`text-sm ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                        Manually control dark mode instead of automatic time-based switching
                      </p>
                    </div>
                    <Switch
                      checked={editingDisplaySettings.display.darkMode}
                      onCheckedChange={(darkMode) => updateDisplaySettings("display", { darkMode })}
                      className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-600"
                    />
                  </div>
                </div>
              </Card>

              {/* Weather Settings */}
              <Card className={`p-4 ${isNightMode ? "bg-black/50 border-white/20" : ""}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5" />
                  <h3 className={`font-medium ${isNightMode ? "text-white" : ""}`}>Weather Display</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className={isNightMode ? "text-white" : ""}>Show Weather</Label>
                    <Switch
                      checked={editingDisplaySettings.weather.enabled}
                      onCheckedChange={(enabled) => updateDisplaySettings("weather", { enabled })}
                      className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weather-location" className={isNightMode ? "text-white" : ""}>
                        Location
                      </Label>
                      <Input
                        id="weather-location"
                        value={editingDisplaySettings.weather.location}
                        onChange={(e) => updateDisplaySettings("weather", { location: e.target.value })}
                        placeholder="New York, NY"
                        className={
                          isNightMode ? "bg-black/50 border-white/20 text-white placeholder:text-gray-400" : ""
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="weather-units" className={isNightMode ? "text-white" : ""}>
                        Temperature Units
                      </Label>
                      <select
                        id="weather-units"
                        className={`w-full p-2 border rounded-md ${
                          isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                        }`}
                        value={editingDisplaySettings.weather.units}
                        onChange={(e) => updateDisplaySettings("weather", { units: e.target.value })}
                      >
                        <option value="celsius">Celsius (°C)</option>
                        <option value="fahrenheit">Fahrenheit (°F)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="weather-position" className={isNightMode ? "text-white" : ""}>
                      Weather Position
                    </Label>
                    <select
                      id="weather-position"
                      className={`w-full p-2 border rounded-md ${
                        isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                      }`}
                      value={editingDisplaySettings.weather.position}
                      onChange={(e) => updateDisplaySettings("weather", { position: e.target.value })}
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Time Settings */}
              <Card className={`p-4 ${isNightMode ? "bg-black/50 border-white/20" : ""}`}>
                <h3 className={`font-medium mb-4 ${isNightMode ? "text-white" : ""}`}>Time Display</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className={isNightMode ? "text-white" : ""}>Show Time</Label>
                    <Switch
                      checked={editingDisplaySettings.time.enabled}
                      onCheckedChange={(enabled) => updateDisplaySettings("time", { enabled })}
                      className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time-format" className={isNightMode ? "text-white" : ""}>
                        Time Format
                      </Label>
                      <select
                        id="time-format"
                        className={`w-full p-2 border rounded-md ${
                          isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                        }`}
                        value={editingDisplaySettings.time.format}
                        onChange={(e) => updateDisplaySettings("time", { format: e.target.value })}
                      >
                        <option value="12h">12 Hour (AM/PM)</option>
                        <option value="24h">24 Hour</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="timezone" className={isNightMode ? "text-white" : ""}>
                        Time Zone
                      </Label>
                      <select
                        id="timezone"
                        className={`w-full p-2 border rounded-md ${
                          isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                        }`}
                        value={editingDisplaySettings.time.timezone}
                        onChange={(e) => updateDisplaySettings("time", { timezone: e.target.value })}
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                        <option value="Australia/Sydney">Sydney</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time-position" className={isNightMode ? "text-white" : ""}>
                        Time Position
                      </Label>
                      <select
                        id="time-position"
                        className={`w-full p-2 border rounded-md ${
                          isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                        }`}
                        value={editingDisplaySettings.time.position}
                        onChange={(e) => updateDisplaySettings("time", { position: e.target.value })}
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="date-format" className={isNightMode ? "text-white" : ""}>
                        Date Format
                      </Label>
                      <select
                        id="date-format"
                        className={`w-full p-2 border rounded-md ${
                          isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                        }`}
                        value={editingDisplaySettings.time.dateFormat}
                        onChange={(e) => updateDisplaySettings("time", { dateFormat: e.target.value })}
                      >
                        <option value="short">Dec 25</option>
                        <option value="long">December 25, 2024</option>
                        <option value="numeric">12/25/2024</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className={isNightMode ? "text-white" : ""}>Show Date</Label>
                    <Switch
                      checked={editingDisplaySettings.time.showDate}
                      onCheckedChange={(showDate) => updateDisplaySettings("time", { showDate })}
                      className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className={isNightMode ? "text-white" : ""}>Show Seconds</Label>
                    <Switch
                      checked={editingDisplaySettings.time.showSeconds}
                      onCheckedChange={(showSeconds) => updateDisplaySettings("time", { showSeconds })}
                      className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-600"
                    />
                  </div>
                </div>
              </Card>

              {/* Display Settings */}
              <Card className={`p-4 ${isNightMode ? "bg-black/50 border-white/20" : ""}`}>
                <h3 className={`font-medium mb-4 ${isNightMode ? "text-white" : ""}`}>Display Preferences</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="transition-speed" className={isNightMode ? "text-white" : ""}>
                      Photo Transition Speed (seconds)
                    </Label>
                    <Input
                      id="transition-speed"
                      type="number"
                      min="5"
                      max="60"
                      value={editingDisplaySettings.display.photoTransitionSpeed}
                      onChange={(e) =>
                        updateDisplaySettings("display", { photoTransitionSpeed: Number(e.target.value) })
                      }
                      className={isNightMode ? "bg-black/50 border-white/20 text-white" : ""}
                    />
                  </div>

                  <div>
                    <Label htmlFor="auto-hide-delay" className={isNightMode ? "text-white" : ""}>
                      Auto-hide Controls Delay (seconds)
                    </Label>
                    <Input
                      id="auto-hide-delay"
                      type="number"
                      min="3"
                      max="30"
                      value={editingDisplaySettings.display.autoHideControlsDelay}
                      onChange={(e) =>
                        updateDisplaySettings("display", { autoHideControlsDelay: Number(e.target.value) })
                      }
                      className={isNightMode ? "bg-black/50 border-white/20 text-white" : ""}
                    />
                  </div>

                  <div>
                    <Label htmlFor="brightness" className={isNightMode ? "text-white" : ""}>
                      Screen Brightness (%)
                    </Label>
                    <Input
                      id="brightness"
                      type="number"
                      min="10"
                      max="100"
                      value={editingDisplaySettings.display.screenBrightness}
                      onChange={(e) => updateDisplaySettings("display", { screenBrightness: Number(e.target.value) })}
                      className={isNightMode ? "bg-black/50 border-white/20 text-white" : ""}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="sources" className="space-y-4">
              <div className="space-y-4">
                {editingSources.map((source) => (
                  <Card key={source.id} className={`p-4 ${isNightMode ? "bg-black/50 border-white/20" : ""}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getSourceIcon(source.type)}
                        <div>
                          <h3 className={`font-medium ${isNightMode ? "text-white" : ""}`}>{source.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {source.type.replace("-", " ")}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={source.enabled}
                          onCheckedChange={(enabled) => updateSource(source.id, { enabled })}
                          className="data-[state=checked]:bg-orange-600 data-[state=unchecked]:bg-gray-600"
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeSource(source.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {source.type === "immich" && (
                        <>
                          <div>
                            <Label htmlFor={`url-${source.id}`} className={isNightMode ? "text-white" : ""}>
                              Immich Server URL
                            </Label>
                            <Input
                              id={`url-${source.id}`}
                              value={source.config.url || ""}
                              onChange={(e) =>
                                updateSource(source.id, {
                                  config: { ...source.config, url: e.target.value },
                                })
                              }
                              placeholder="https://immich.example.com"
                              className={
                                isNightMode ? "bg-black/50 border-white/20 text-white placeholder:text-gray-400" : ""
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`key-${source.id}`} className={isNightMode ? "text-white" : ""}>
                              API Key
                            </Label>
                            <Input
                              id={`key-${source.id}`}
                              type="password"
                              value={source.config.apiKey || ""}
                              onChange={(e) =>
                                updateSource(source.id, {
                                  config: { ...source.config, apiKey: e.target.value },
                                })
                              }
                              placeholder="Your Immich API key"
                              className={
                                isNightMode ? "bg-black/50 border-white/20 text-white placeholder:text-gray-400" : ""
                              }
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className={isNightMode ? "text-white" : ""}>Album Selection</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  loadImmichAlbums(source.id, source.config.url || "", source.config.apiKey || "")
                                }
                                disabled={loadingAlbums[source.id]}
                                className={
                                  isNightMode
                                    ? "bg-white text-black border-gray-300 hover:bg-gray-100"
                                    : "bg-transparent"
                                }
                              >
                                {loadingAlbums[source.id] ? "Loading..." : "Load Albums"}
                              </Button>
                            </div>

                            {immichAlbums[source.id] && immichAlbums[source.id].length > 0 && (
                              <div>
                                <select
                                  className={`w-full p-2 border rounded-md ${
                                    isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                                  }`}
                                  value={source.config.albumId || ""}
                                  onChange={(e) =>
                                    updateSource(source.id, {
                                      config: { ...source.config, albumId: e.target.value },
                                    })
                                  }
                                >
                                  <option value="">All Photos</option>
                                  {immichAlbums[source.id].map((album: any) => (
                                    <option key={album.id} value={album.id}>
                                      {album.name} ({album.assetCount} photos)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {immichAlbums[source.id] && immichAlbums[source.id].length === 0 && (
                              <p className={`text-sm ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                                No albums found on this server
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {source.type === "google-photos" && (
                        <>
                          <div>
                            <Label htmlFor={`album-${source.id}`} className={isNightMode ? "text-white" : ""}>
                              Album ID (Optional)
                            </Label>
                            <Input
                              id={`album-${source.id}`}
                              value={source.config.albumId || ""}
                              onChange={(e) =>
                                updateSource(source.id, {
                                  config: { ...source.config, albumId: e.target.value },
                                })
                              }
                              placeholder="Leave empty for all photos"
                              className={
                                isNightMode ? "bg-black/50 border-white/20 text-white placeholder:text-gray-400" : ""
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`refresh-${source.id}`} className={isNightMode ? "text-white" : ""}>
                              Refresh Interval (minutes)
                            </Label>
                            <Input
                              id={`refresh-${source.id}`}
                              type="number"
                              value={source.config.refreshInterval || 60}
                              onChange={(e) =>
                                updateSource(source.id, {
                                  config: { ...source.config, refreshInterval: Number.parseInt(e.target.value) },
                                })
                              }
                              className={isNightMode ? "bg-black/50 border-white/20 text-white" : ""}
                            />
                          </div>
                        </>
                      )}

                      {source.type === "local" && (
                        <div className="col-span-2">
                          <Label htmlFor={`files-${source.id}`} className={isNightMode ? "text-white" : ""}>
                            Upload Photos
                          </Label>
                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                id={`files-${source.id}`}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files || [])
                                  if (files.length === 0) return

                                  const formData = new FormData()
                                  files.forEach((file) => formData.append("files", file))

                                  try {
                                    const response = await fetch("/api/photos/local", {
                                      method: "POST",
                                      body: formData,
                                    })

                                    if (response.ok) {
                                      const uploadedFiles = await response.json()
                                      updateSource(source.id, {
                                        config: { ...source.config, uploadedFiles },
                                      })
                                    } else {
                                      alert("Failed to upload files")
                                    }
                                  } catch (error) {
                                    console.error("Upload error:", error)
                                    alert("Failed to upload files")
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <Button
                                variant="outline"
                                className={`w-full ${isNightMode ? "bg-white text-black hover:bg-gray-100 hover:text-black" : "bg-transparent"}`}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Choose Photos
                              </Button>
                            </div>
                            {source.config.uploadedFiles && source.config.uploadedFiles.length > 0 && (
                              <p className={`text-sm ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                                {source.config.uploadedFiles.length} photos uploaded
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {source.type === "url" && (
                        <div className="col-span-2">
                          <Label htmlFor={`urls-${source.id}`} className={isNightMode ? "text-white" : ""}>
                            Image URLs (one per line)
                          </Label>
                          <textarea
                            id={`urls-${source.id}`}
                            className={`w-full p-2 border rounded-md min-h-[100px] ${
                              isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                            }`}
                            value={source.config.urls || ""}
                            onChange={(e) =>
                              updateSource(source.id, {
                                config: { ...source.config, urls: e.target.value },
                              })
                            }
                            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                {editingSources.length === 0 && (
                  <div className={`text-center py-8 ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                    No photo sources configured. Add one to get started.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <Card className={`p-4 ${isNightMode ? "bg-black/50 border-white/20" : ""}`}>
                <h3 className={`font-medium mb-4 ${isNightMode ? "text-white" : ""}`}>Add New Photo Source</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="source-name" className={isNightMode ? "text-white" : ""}>
                      Source Name *
                    </Label>
                    <Input
                      id="source-name"
                      value={newSource.name || ""}
                      onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                      placeholder="My Photo Collection"
                      className={isNightMode ? "bg-black/50 border-white/20 text-white placeholder:text-gray-400" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="source-type" className={isNightMode ? "text-white" : ""}>
                      Source Type
                    </Label>
                    <select
                      id="source-type"
                      className={`w-full p-2 border rounded-md ${
                        isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                      }`}
                      value={newSource.type}
                      onChange={(e) =>
                        setNewSource({
                          ...newSource,
                          type: e.target.value as PhotoSource["type"],
                          config: {},
                        })
                      }
                    >
                      <option value="immich">Immich Server</option>
                      <option value="google-photos">Google Photos</option>
                      <option value="local">Upload Photos</option>
                      <option value="url">URL Collection</option>
                    </select>
                  </div>
                </div>

                {newSource.type === "immich" && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor="new-immich-url" className={isNightMode ? "text-white" : ""}>
                          Immich Server URL *
                        </Label>
                        <Input
                          id="new-immich-url"
                          value={newSource.config?.url || ""}
                          onChange={(e) =>
                            setNewSource({
                              ...newSource,
                              config: { ...newSource.config, url: e.target.value },
                            })
                          }
                          placeholder="https://immich.example.com"
                          className={
                            isNightMode ? "bg-black/50 border-white/20 text-white placeholder:text-gray-400" : ""
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-immich-key" className={isNightMode ? "text-white" : ""}>
                          API Key *
                        </Label>
                        <Input
                          id="new-immich-key"
                          type="password"
                          value={newSource.config?.apiKey || ""}
                          onChange={(e) =>
                            setNewSource({
                              ...newSource,
                              config: { ...newSource.config, apiKey: e.target.value },
                            })
                          }
                          placeholder="Your Immich API key"
                          className={
                            isNightMode ? "bg-black/50 border-white/20 text-white placeholder:text-gray-400" : ""
                          }
                        />
                      </div>
                    </div>
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className={isNightMode ? "text-white" : ""}>Album Selection (Optional)</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            loadImmichAlbums("new", newSource.config?.url || "", newSource.config?.apiKey || "")
                          }
                          disabled={loadingAlbums["new"]}
                          className={
                            isNightMode ? "bg-white text-black border-gray-300 hover:bg-gray-100" : "bg-transparent"
                          }
                        >
                          {loadingAlbums["new"] ? "Loading..." : "Load Albums"}
                        </Button>
                      </div>

                      {immichAlbums["new"] && immichAlbums["new"].length > 0 && (
                        <div>
                          <select
                            className={`w-full p-2 border rounded-md ${
                              isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                            }`}
                            value={newSource.config?.albumId || ""}
                            onChange={(e) =>
                              setNewSource({
                                ...newSource,
                                config: { ...newSource.config, albumId: e.target.value },
                              })
                            }
                          >
                            <option value="">All Photos</option>
                            {immichAlbums["new"].map((album: any) => (
                              <option key={album.id} value={album.id}>
                                {album.name} ({album.assetCount} photos)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {immichAlbums["new"] && immichAlbums["new"].length === 0 && (
                        <p className={`text-sm ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                          No albums found on this server
                        </p>
                      )}

                      <p className={`text-sm ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                        Leave unselected to use all photos from the server
                      </p>
                    </div>
                  </>
                )}

                {newSource.type === "local" && (
                  <div className="mb-4">
                    <Label htmlFor="new-local-files" className={isNightMode ? "text-white" : ""}>
                      Upload Photos *
                    </Label>
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          id="new-local-files"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || [])
                            if (files.length === 0) return

                            const formData = new FormData()
                            files.forEach((file) => formData.append("files", file))

                            try {
                              const response = await fetch("/api/photos/local", {
                                method: "POST",
                                body: formData,
                              })

                              if (response.ok) {
                                const uploadedFiles = await response.json()
                                setNewSource({
                                  ...newSource,
                                  config: { ...newSource.config, uploadedFiles },
                                })
                              } else {
                                alert("Failed to upload files")
                              }
                            } catch (error) {
                              console.error("Upload error:", error)
                              alert("Failed to upload files")
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button
                          variant="outline"
                          className={`w-full ${isNightMode ? "bg-white text-black hover:bg-gray-100 hover:text-black" : "bg-transparent"}`}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Photos
                        </Button>
                      </div>
                      {newSource.config?.uploadedFiles && newSource.config.uploadedFiles.length > 0 && (
                        <p className={`text-sm ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                          {newSource.config.uploadedFiles.length} photos selected
                        </p>
                      )}
                      <p className={`text-sm ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                        Select multiple image files from your device
                      </p>
                    </div>
                  </div>
                )}

                {newSource.type === "google-photos" && (
                  <div className="mb-4">
                    <Label htmlFor="new-google-album" className={isNightMode ? "text-white" : ""}>
                      Album ID (Optional)
                    </Label>
                    <Input
                      id="new-google-album"
                      value={newSource.config?.albumId || ""}
                      onChange={(e) =>
                        setNewSource({
                          ...newSource,
                          config: { ...newSource.config, albumId: e.target.value },
                        })
                      }
                      placeholder="Leave empty for all photos"
                      className={isNightMode ? "bg-black/50 border-white/20 text-white placeholder:text-gray-400" : ""}
                    />
                    <p className={`text-sm mt-1 ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                      Note: Google Photos integration requires OAuth setup
                    </p>
                  </div>
                )}

                {newSource.type === "url" && (
                  <div className="mb-4">
                    <Label htmlFor="new-url-list" className={isNightMode ? "text-white" : ""}>
                      Image URLs (one per line)
                    </Label>
                    <textarea
                      id="new-url-list"
                      className={`w-full p-2 border rounded-md min-h-[100px] ${
                        isNightMode ? "bg-black/50 border-white/20 text-white" : "bg-background"
                      }`}
                      value={newSource.config?.urls || ""}
                      onChange={(e) =>
                        setNewSource({
                          ...newSource,
                          config: { ...newSource.config, urls: e.target.value },
                        })
                      }
                      placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                    />
                  </div>
                )}

                <Button onClick={addNewSource} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Source
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="backup" className="space-y-4">
              <Card className={`p-4 ${isNightMode ? "bg-black/50 border-white/20" : ""}`}>
                <h3 className={`font-medium mb-4 ${isNightMode ? "text-white" : ""}`}>Backup & Restore Settings</h3>

                <div className="space-y-4">
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${isNightMode ? "text-white" : ""}`}>Export Settings</h4>
                    <p className={`text-sm mb-3 ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                      Download your current settings as a JSON file for backup or sharing.
                    </p>
                    <Button
                      onClick={exportSettings}
                      variant="outline"
                      className={
                        isNightMode
                          ? "w-full bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black"
                          : "w-full bg-transparent"
                      }
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Export Settings
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className={`text-sm font-medium mb-2 ${isNightMode ? "text-white" : ""}`}>Import Settings</h4>
                    <p className={`text-sm mb-3 ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                      Upload a previously exported settings file to restore your configuration.
                    </p>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={importSettings}
                        ref={fileInputRef}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className={
                          isNightMode
                            ? "w-full bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black"
                            : "w-full bg-transparent"
                        }
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Import Settings
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className={`text-sm font-medium mb-2 ${isNightMode ? "text-white" : ""}`}>Reset to Defaults</h4>
                    <p className={`text-sm mb-3 ${isNightMode ? "text-gray-400" : "text-muted-foreground"}`}>
                      Clear all settings and return to default configuration.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        if (confirm("Are you sure you want to reset all settings? This cannot be undone.")) {
                          localStorage.removeItem("hub-settings")
                          window.location.reload()
                        }
                      }}
                    >
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className={`flex justify-end gap-2 p-6 border-t ${isNightMode ? "border-white/20" : ""}`}>
          <Button
            variant="outline"
            onClick={onClose}
            className={isNightMode ? "bg-white text-black border-gray-300 hover:bg-gray-100 hover:text-black" : ""}
          >
            Cancel
          </Button>
          <Button onClick={saveChanges}>Save Changes</Button>
        </div>
      </Card>
    </div>
  )
}
