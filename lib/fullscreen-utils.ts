export const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    return true
  } else {
    document.exitFullscreen()
    return false
  }
}

export const isFullscreen = () => {
  return !!document.fullscreenElement
}

export const onFullscreenChange = (callback: (isFullscreen: boolean) => void) => {
  const handleChange = () => {
    callback(!!document.fullscreenElement)
  }

  document.addEventListener("fullscreenchange", handleChange)

  return () => {
    document.removeEventListener("fullscreenchange", handleChange)
  }
}
