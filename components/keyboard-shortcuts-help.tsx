"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Keyboard } from "lucide-react"

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { key: "Space", action: "Play/Pause slideshow" },
  { key: "← →", action: "Navigate photos" },
  { key: "I", action: "Toggle photo info" },
  { key: "S", action: "Open settings" },
  { key: "F", action: "Toggle fullscreen" },
  { key: "N", action: "Toggle night mode" },
  { key: "M", action: "Toggle sound" },
  { key: "?", action: "Show this help" },
]

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-md border-0 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{shortcut.action}</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">{shortcut.key}</kbd>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
