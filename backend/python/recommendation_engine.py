import json
import sys


# Read JSON input sent from PHP.
def read_input():
    try:
        raw_data = sys.stdin.read()

        if not raw_data:
            return {}

        return json.loads(raw_data)
    except Exception:
        return {}


# Safely convert a value to an integer.
def to_int(value, default=0):
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return default


# Safely convert a value to a float.
def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# Check if a saved preference list contains a specific value.
def has_preference(preference_list, value):
    if not isinstance(preference_list, list):
        return False

    return any(
        str(item).lower() == str(value).lower()
        for item in preference_list
    )


# Check whether the current weather condition is rainy or wet.
def is_rainy_condition(condition):
    condition = str(condition or "").lower()

    rainy_words = [
        "rain",
        "drizzle",
        "thunderstorm",
        "snow",
        "mist",
        "shower"
    ]

    return any(word in condition for word in rainy_words)


# Format weather condition text nicely.
def format_condition(condition):
    return str(condition or "Unknown").title()


# Create clothing recommendation.
def get_clothing_advice(temperature, condition, clothing_preferences):
    rainy = is_rainy_condition(condition)

    prefers_waterproof = has_preference(clothing_preferences, "Waterproof")
    prefers_warm = has_preference(clothing_preferences, "Warm Clothing")
    prefers_light = has_preference(clothing_preferences, "Light Clothing")

    # Rain and waterproof preference get priority.
    if rainy and prefers_waterproof:
        return {
            "title": "Waterproof outfit",
            "detail": "Rainy or wet conditions are possible, so waterproof clothing is a good choice.",
            "reason": "Rain is detected and your profile includes waterproof clothing."
        }

    # Cold weather and warm clothing preference.
    if temperature <= 10 and prefers_warm:
        return {
            "title": "Warm clothing recommended",
            "detail": "The temperature is low, so warm clothing will help you stay comfortable.",
            "reason": f"{temperature}°C is cold, and your profile includes warm clothing."
        }

    # Warm weather and light clothing preference.
    if temperature >= 24 and prefers_light:
        return {
            "title": "Light clothing recommended",
            "detail": "The weather is warm, so light clothing is more comfortable.",
            "reason": f"{temperature}°C is warm, and your profile includes light clothing."
        }

    # General temperature-based recommendation.
    if temperature <= 0:
        return {
            "title": "Heavy coat and layers",
            "detail": "Very cold weather requires strong protection from the cold.",
            "reason": f"{temperature}°C is very cold, so heavy layers are recommended."
        }

    if temperature <= 10:
        return {
            "title": "Warm jacket",
            "detail": "A warm jacket is recommended for low temperatures.",
            "reason": f"{temperature}°C is cold enough to need a warm jacket."
        }

    if temperature <= 20:
        return {
            "title": "Light layers",
            "detail": "This suggestion is based mainly on the current temperature.",
            "reason": f"{temperature}°C feels mild and comfortable."
        }

    if temperature <= 28:
        return {
            "title": "T-shirt or light outfit",
            "detail": "The temperature is warm, so lighter clothing should be comfortable.",
            "reason": f"{temperature}°C is warm, so light clothing is suitable."
        }

    return {
        "title": "Light breathable clothing",
        "detail": "Hot weather can feel uncomfortable, so breathable clothing is recommended.",
        "reason": f"{temperature}°C is hot, so breathable clothing helps reduce heat discomfort."
    }


# Create rain preparation recommendation.
def get_rain_advice(condition, clothing_preferences, weather_focus):
    rainy = is_rainy_condition(condition)

    prefers_waterproof = has_preference(clothing_preferences, "Waterproof")
    rain_focus_enabled = has_preference(weather_focus, "Rain Alerts")

    if rainy and prefers_waterproof:
        return {
            "title": "Use waterproof protection",
            "detail": "Rainy or wet weather is detected, and your profile includes waterproof clothing.",
            "reason": "Rain is detected and your saved clothing preference includes waterproof protection."
        }

    if rainy and rain_focus_enabled:
        return {
            "title": "Umbrella recommended",
            "detail": "Rain is detected, and Rain Alerts are enabled in your saved weather preferences.",
            "reason": "Rain is part of your saved weather focus, so Clima highlights rain preparation."
        }

    if rainy:
        return {
            "title": "Umbrella recommended",
            "detail": "Rainy or wet conditions are possible, so carrying an umbrella is a good idea.",
            "reason": "The current weather condition suggests rain or wet weather."
        }

    return {
        "title": "Umbrella not needed now",
        "detail": "Current conditions do not strongly indicate rain.",
        "reason": "No strong indication of rain is detected at the moment."
    }


# Check whether the user's profile suggests outdoor movement.
def has_outdoor_profile(activities, main_activity):
    main_activity = str(main_activity or "").lower()

    return (
        has_preference(activities, "Outdoor Worker")
        or has_preference(activities, "Athlete")
        or has_preference(activities, "Traveler")
        or has_preference(activities, "Student")
        or "walking" in main_activity
        or "sport" in main_activity
        or "travel" in main_activity
    )


# Create outdoor activity recommendation.
def get_outdoor_advice(
    temperature,
    condition,
    wind_speed,
    humidity,
    activities,
    main_activity
):
    rainy = is_rainy_condition(condition)
    outdoor_profile = has_outdoor_profile(activities, main_activity)

    if rainy:
        return {
            "title": "Plan outdoor time carefully",
            "detail": "Rain may affect outdoor movement, so covered routes or delayed plans may be better.",
            "reason": "Rainy conditions can make outdoor activity less comfortable.",
            "profileReason": (
                "Your profile includes outdoor activity, so Clima warns you about rain."
                if outdoor_profile
                else "Your profile is considered together with the current rainy condition."
            )
        }

    if wind_speed >= 10:
        return {
            "title": "Be careful outdoors",
            "detail": "Wind speed is high, so outdoor activities may feel uncomfortable.",
            "reason": f"{wind_speed} m/s wind may affect outdoor comfort.",
            "profileReason": (
                "Your outdoor profile makes wind conditions more important."
                if outdoor_profile
                else "Wind is considered because it affects daily movement."
            )
        }

    if temperature >= 28 and humidity >= 75:
        return {
            "title": "Keep activities light",
            "detail": "Warm and humid weather can make outdoor activity tiring.",
            "reason": "High temperature and humidity can increase discomfort.",
            "profileReason": (
                "Your outdoor profile makes heat and humidity more important."
                if outdoor_profile
                else "Clima considers heat and humidity for general comfort."
            )
        }

    if outdoor_profile:
        return {
            "title": "Good for outdoor plans",
            "detail": "The weather looks suitable for your activity profile.",
            "reason": "No strong rain, wind, or heat issue is detected.",
            "profileReason": "Your saved profile includes outdoor activities or walking."
        }

    return {
        "title": "Normal daily conditions",
        "detail": "No major weather issue is detected for general daily movement.",
        "reason": "The current conditions look acceptable for normal movement.",
        "profileReason": "Clima uses your profile activity together with the current weather."
    }


# Create weather focus recommendation.
def get_weather_focus_advice(
    temperature,
    condition,
    wind_speed,
    humidity,
    weather_focus
):
    rainy = is_rainy_condition(condition)

    cold_focus = has_preference(weather_focus, "Sensitive to Cold")
    heat_focus = has_preference(weather_focus, "Sensitive to Heat")
    rain_focus = has_preference(weather_focus, "Rain Alerts")
    wind_focus = has_preference(weather_focus, "Strong Wind Alerts")
    air_focus = has_preference(weather_focus, "Air Quality Alerts")

    if rain_focus and rainy:
        return {
            "title": "Rain focus active",
            "detail": "Rain is part of your saved weather focus, so Clima highlights rain preparation.",
            "reason": "Your profile includes Rain Alerts and rainy conditions are detected."
        }

    if wind_focus and wind_speed >= 10:
        return {
            "title": "Wind focus active",
            "detail": "Strong wind is part of your saved weather focus, so Clima warns you to be careful.",
            "reason": f"Wind speed is {wind_speed} m/s and Strong Wind Alerts are enabled."
        }

    if cold_focus and temperature <= 8:
        return {
            "title": "Cold sensitivity noted",
            "detail": "You selected cold sensitivity, so Clima gives extra attention to warmth.",
            "reason": f"{temperature}°C is low and your profile includes cold sensitivity."
        }

    if heat_focus and temperature >= 25:
        return {
            "title": "Heat sensitivity noted",
            "detail": "You selected heat sensitivity, so Clima recommends lighter activity.",
            "reason": f"{temperature}°C is warm and your profile includes heat sensitivity."
        }

    if air_focus and humidity >= 85:
        return {
            "title": "Air comfort reminder",
            "detail": "Air quality data is limited for now, but high humidity may affect comfort.",
            "reason": f"Humidity is {humidity}%, and your profile includes Air Quality Alerts."
        }

    return {
        "title": "No major focus alert",
        "detail": "Your saved weather focus does not show a serious issue right now.",
        "reason": "No saved weather focus has reached a warning condition."
    }


# Create humidity explanation.
def get_humidity_reason(humidity):
    if humidity >= 85:
        return f"{humidity}% humidity is high and may make the air feel heavier."

    if humidity >= 70:
        return f"{humidity}% humidity is moderate to high, so comfort may be slightly affected."

    return f"{humidity}% humidity is comfortable for most daily activities."


# Create a short assistant-style recommendation summary.
def build_assistant_summary(clothing, rain, outdoor, assistant_tone):
    friendly = has_preference(assistant_tone, "Friendly Tone")

    if friendly:
        return (
            f"Today looks manageable. {clothing['title']} is recommended, "
            f"{rain['title'].lower()}, and {outdoor['title'].lower()}."
        )

    return (
        f"{clothing['title']} is recommended. "
        f"Rain preparation: {rain['title']}. "
        f"Outdoor guidance: {outdoor['title']}."
    )


# Create the final explanation paragraph.
def build_explanation(
    temperature,
    feels_like,
    condition,
    humidity,
    wind_speed,
    clothing,
    rain,
    outdoor,
    focus,
    assistant_tone
):
    condition_label = format_condition(condition)
    detailed = has_preference(assistant_tone, "Detailed Responses")

    base = (
        f"Clima checked your saved profile and the current weather. "
        f"The temperature is {temperature}°C, feels like {feels_like}°C, "
        f"with {condition_label}. The clothing advice is '{clothing['title']}', "
        f"rain preparation is '{rain['title']}', and outdoor guidance is "
        f"'{outdoor['title']}'."
    )

    if not detailed:
        return base

    return (
        f"{base} The decision also considers humidity, wind speed, saved clothing "
        f"preferences, activity profile, and weather focus settings."
    )


# Main recommendation engine function.
def generate_recommendations(payload):
    weather = payload.get("weather", {})
    user = payload.get("user", {})

    preferences = user.get("preferences", {})

    activities = preferences.get("activities", [])
    weather_focus = preferences.get("weatherFocus", [])
    clothing_style = preferences.get("clothingStyle", [])
    assistant_tone = preferences.get("assistantTone", [])

    temperature = to_int(weather.get("temperature"), 0)
    feels_like = to_int(
        weather.get("feelsLike", weather.get("temperature")),
        temperature
    )
    humidity = to_int(weather.get("humidity"), 70)
    wind_speed = to_float(weather.get("windSpeed"), 2.8)

    condition = weather.get("condition") or weather.get("description") or "Unknown"
    main_activity = user.get("activity", "Walking")

    clothing = get_clothing_advice(
        temperature,
        condition,
        clothing_style
    )

    rain = get_rain_advice(
        condition,
        clothing_style,
        weather_focus
    )

    outdoor = get_outdoor_advice(
        temperature,
        condition,
        wind_speed,
        humidity,
        activities,
        main_activity
    )

    focus = get_weather_focus_advice(
        temperature,
        condition,
        wind_speed,
        humidity,
        weather_focus
    )

    return {
        "assistant": build_assistant_summary(
            clothing,
            rain,
            outdoor,
            assistant_tone
        ),
        "cards": {
            "clothing": clothing,
            "rain": rain,
            "outdoor": outdoor,
            "focus": focus
        },
        "reasons": {
            "temperature": clothing["reason"],
            "rain": rain["reason"],
            "profile": outdoor["profileReason"],
            "humidity": get_humidity_reason(humidity)
        },
        "explanation": build_explanation(
            temperature,
            feels_like,
            condition,
            humidity,
            wind_speed,
            clothing,
            rain,
            outdoor,
            focus,
            assistant_tone
        )
    }


# Program starts here.
# PHP sends JSON to this Python file through stdin.
# Python returns JSON back to PHP through stdout.
if __name__ == "__main__":
    input_payload = read_input()
    result = generate_recommendations(input_payload)

    print(json.dumps(result, ensure_ascii=False))