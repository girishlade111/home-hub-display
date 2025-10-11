import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const location = searchParams.get("location") || "San Francisco, CA"

  try {
    // Using OpenWeatherMap API - you'll need to add OPENWEATHER_API_KEY to your environment variables
    const apiKey = process.env.OPENWEATHER_API_KEY

    if (!apiKey) {
      // Return mock data if no API key is configured
      return NextResponse.json({
        temperature: 72,
        condition: "Partly Cloudy",
        location: location,
        humidity: 65,
        windSpeed: 8,
      })
    }

    // First, get coordinates for the location
    const geoResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`,
    )

    if (!geoResponse.ok) {
      throw new Error("Failed to fetch location coordinates")
    }

    const geoData = await geoResponse.json()

    if (geoData.length === 0) {
      throw new Error("Location not found")
    }

    const { lat, lon, name, country } = geoData[0]

    // Get weather data using coordinates
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
    )

    if (!weatherResponse.ok) {
      throw new Error("Failed to fetch weather data")
    }

    const weatherData = await weatherResponse.json()

    // Map OpenWeatherMap conditions to our simplified conditions
    const conditionMap: { [key: string]: string } = {
      "clear sky": "Sunny",
      "few clouds": "Partly Cloudy",
      "scattered clouds": "Partly Cloudy",
      "broken clouds": "Cloudy",
      "overcast clouds": "Cloudy",
      "light rain": "Rainy",
      "moderate rain": "Rainy",
      "heavy intensity rain": "Rainy",
      snow: "Snowy",
      thunderstorm: "Stormy",
    }

    const condition = conditionMap[weatherData.weather[0].description.toLowerCase()] || "Partly Cloudy"

    return NextResponse.json({
      temperature: Math.round(weatherData.main.temp),
      condition: condition,
      location: `${name}, ${country}`,
      humidity: weatherData.main.humidity,
      windSpeed: Math.round(weatherData.wind?.speed || 0),
    })
  } catch (error) {
    console.error("Weather API error:", error)

    // Return fallback data on error
    return NextResponse.json({
      temperature: 72,
      condition: "Partly Cloudy",
      location: location,
      humidity: 65,
      windSpeed: 8,
    })
  }
}
