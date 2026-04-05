const locationBtn = document.getElementById("locationBtn");
const citySearchBtn = document.getElementById("citySearchBtn");
const cityInput = document.getElementById("cityInput");
const vibeButtons = document.querySelectorAll(".vibe-btn");

const statusMessage = document.getElementById("statusMessage");
const weatherCard = document.getElementById("weatherCard");
const planCard = document.getElementById("planCard");
const placesCard = document.getElementById("placesCard");
const quoteCard = document.getElementById("quoteCard");

const weatherOutput = document.getElementById("weatherOutput");
const planOutput = document.getElementById("planOutput");
const placesOutput = document.getElementById("placesOutput");
const quoteOutput = document.getElementById("quoteOutput");
const mbtiInput = document.getElementById("mbtiInput");
const mbtiBtn = document.getElementById("MBTISearchBtn");
const searchBtn = document.getElementById("MBTITestBtn");
const quoteSearchBtn = document.getElementById("quoteSearchBtn");

let appState = {
  vibe: null,
  location: null,
  weather: null,
  places: [],
  quote: null,
  mbti:null
};

mbtiBtn.addEventListener("click", () => {
  const type = mbtiInput.value.trim().toUpperCase();

  if (!/^[EI][NS][FT][PJ]$/.test(type)) {
    setStatus("Please enter a valid MBTI type (e.g., INFP, ESTJ).", true);
    return;
  }

  appState.mbti = type;
  setStatus(`MBTI set to ${type}. Your plan will now be personalized.`);
  generatePlan();
});

searchBtn.addEventListener("click",() =>{
  const go = confirm("Take a quick MBTI test? This will open a new tab.");
  if(go){
  window.open("https://www.16personalities.com/free-personality-test", "_blank");
  }
})

locationBtn.addEventListener("click", handleUseMyLocation);
citySearchBtn.addEventListener("click", handleManualCitySearch);
quoteSearchBtn.addEventListener("click", handleQuoteSearch);

vibeButtons.forEach(button => {
  button.addEventListener("click", () => {
    appState.vibe = button.dataset.vibe;
    generatePlan();
  });
});

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "red" : "white";
}

function handleUseMyLocation() {
  setStatus("Getting your location...");

  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported. Please enter your city manually.", true);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      appState.location = { latitude, longitude };
      setStatus("Location found.");
      await loadDataByCoordinates(latitude, longitude);
    },
    (error) => {
      setStatus("Location access denied. Please enter your city manually.", true);
      console.error(error);
    }
  );
}

async function handleManualCitySearch() {
  const city = cityInput.value.trim();

  if (!city) {
    setStatus("Please enter a city.", true);
    return;
  }

  setStatus("Searching by city...");

  try {
    await loadDataByCity(city);
  } catch (error) {
    setStatus("We couldn't find that city. Please try again.", true);
    console.error(error);
  }
}
async function handleQuoteSearch() {
  setStatus("Finding an inspiring quote...");

  try {
    const quote = await fetchQuote();
    appState.quote = quote;
    renderQuote();
    setStatus("Here is your quote!");
  } catch (error) {
    setStatus("Sorry, we couldn't load a quote right now.", true);
    console.error(error);
  }
}
async function loadDataByCity(city) {
  setStatus(`Finding ${city}...`);

  try {
    const coords = await getCoordinatesFromCity(city);

    appState.location = {
      latitude: coords.lat,
      longitude: coords.lon
    };

    await loadDataByCoordinates(coords.lat, coords.lon);

  } catch (error) {
    console.error("loadDataByCity error:", error);
    setStatus("We couldn't find that city. Please check spelling and try again.", true);
  }
}

async function getCoordinatesFromCity(city) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;

  const response = await fetch(url, {
    headers: { "User-Agent": "smart-day-planner-app" }
  });

  if (!response.ok) throw new Error("Geocoding failed");

  const data = await response.json();

  if (!data.length) throw new Error("City not found");

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    name: data[0].display_name
  };
}

async function loadDataByCoordinates(lat, lon) {
  try {
    const weather = await fetchWeatherByCoords(lat, lon);
    appState.weather = weather;
    renderWeather();

    try {
      const places = await fetchPlacesByCoords(lat, lon, appState.vibe);
      appState.places = places;
      renderPlaces();
    } catch {
      setStatus("Weather loaded, but place suggestions are unavailable right now.");
      appState.places = [];
      renderPlacesFallback();
    }

    try {
      const quote = await fetchQuote();
      appState.quote = quote;
      renderQuote();
    } catch {
      quoteCard.classList.add("hidden");
    }

    generatePlan();

  } catch {
    setStatus("We couldn't load the weather. Showing a general plan instead.");
    appState.weather = null;
    generatePlan();
  }
}

async function fetchWeatherByCoords(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather request failed");

  const data = await response.json();

  return {
  city: "Your Location",
  temp: data.current_weather.temperature,
  condition: data.current_weather.weathercode,
  description: mapWeatherCode(data.current_weather.weathercode)
  };
}

async function fetchPlacesByCoords(lat, lon, vibe) {
  const category = mapVibeToPlaceType(vibe);

  let queryType = "";
  if (category === "cafe") queryType = "amenity=cafe";
  else if (category === "restaurant") queryType = "amenity=restaurant";
  else if (category === "park") queryType = "leisure=park";
  else if (category === "library") queryType = "amenity=library";
  else if (category === "spa") queryType = "amenity=spa";
  else if (category === "movie") queryType = "amenity=cinema";


  const query = `[out:json];node[${queryType}](around:1500,${lat},${lon});out;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Places request failed");

  const data = await response.json();

  return data.elements
    .filter(place => place.tags && place.tags.name)
    .slice(0, 5)
    .map(place => ({ name: place.tags.name }));
}

async function fetchQuote() {
  const response = await fetch("https://api.allorigins.win/raw?url=https://zenquotes.io/api/random");

  if (!response.ok) throw new Error("Quote request failed");

  const data = await response.json();

  return `"${data[0].q}" — ${data[0].a}`;
}

function getMBTIPlan(type) {
  const plans = {
    INFP: "You thrive on gentle, meaningful experiences. Try journaling, a quiet café, or a nature walk.",
    INFJ: "A reflective day suits you. A peaceful park, deep reading, or creative planning fits well.",
    ENFP: "You shine with novelty. Explore a new place, meet someone new, or try a spontaneous activity.",
    ENFJ: "You love connection. Plan a social meetup, volunteer, or organize a small gathering.",
    INTP: "A thinking day is ideal. Dive into a research rabbit hole or visit a quiet library.",
    INTJ: "Strategic energy today. Work on long‑term goals or enjoy a structured productivity session.",
    ENTP: "Follow your curiosity. Debate, brainstorm, or explore something intellectually stimulating.",
    ENTJ: "A power‑day. Tackle big tasks, plan your week, or lead something important.",
    ISFP: "Lean into aesthetics. Visit a beautiful place, make art, or enjoy a sensory experience.",
    ISFJ: "Comfort and care. Clean your space, cook something warm, or help someone close to you.",
    ESFP: "You need fun. Go somewhere lively, try a treat, or do something expressive.",
    ESFJ: "Social warmth. Spend time with friends, host something small, or check in on loved ones.",
    ISTP: "Hands‑on time. Fix something, explore outdoors, or try a practical mini‑adventure.",
    ISTJ: "A structured day. Organize, plan, or complete tasks that bring order.",
    ESTP: "Action mode. Try something active, spontaneous, or competitive.",
    ESTJ: "Efficiency day. Handle responsibilities, optimize routines, or lead a project."
  };

  return plans[type] || "Your personality adds a unique flavor to your day.";
}



function mapVibeToPlaceType(vibe) {
  switch (vibe) {
    case "chill": return "movie";
    case "productive": return "library";
    case "outdoors": return "park";
    case "treat": return "restaurant";
    case "relax & sleep": return "spa";
    default: return "cafe";
  }
}

function generatePlan() {
  const vibe = appState.vibe;
  const weather = appState.weather;
  const mbti = appState.mbti;

  let message = "";

  if (!vibe && !mbti) {
    message = "Choose a vibe or enter your MBTI to generate your plan.";
  } 
  if (mbti) {
      message += "\n\nPersonality Insight: " + getMBTIPlan(mbti);
  }
  else if (!weather) {
    message = `Your ${vibe} plan is ready. We couldn't get weather data, so this is a general recommendation.Please try to input your MBTI instead.`;
  }
  else {
    if (vibe === "outdoors" && weather.description.toLowerCase().includes("rain")) {
      message = "It looks rainy, so instead of an outdoor plan, try a cozy indoor alternative like a café or bookstore.";
    } else if (vibe === "productive") {
      message = `With ${weather.description} weather today, it's a great day to settle into a focused study or work session.`;
    } else if (vibe === "chill") {
      message = `The ${weather.description} weather makes today perfect for a relaxed, low-pressure outing.`;
    } else if (vibe === "treat") {
      message = `You deserve something fun today — maybe good food, a sweet drink, or a new place to explore.`;
    }
     else if (vibe === "outdoors") {
      message = `You want the sun. Why don't you find the best park in the city and go to pinic?`;
    }
    else {
      message = `You need to rest. Take a warm bath with your favorite bathing salt, and lie on your bed. Don't worry, you deserve it`;
    }
  }

  planOutput.textContent = message;
  planCard.classList.remove("hidden");
}



function renderWeather() {
  if (!appState.weather) return;

  const w = appState.weather;
  weatherOutput.textContent = `${w.city}: ${w.temp}° and ${w.description}`;
  weatherCard.classList.remove("hidden");
}

function renderPlaces() {
  placesOutput.innerHTML = "";

  if (!appState.places.length) {
    renderPlacesFallback();
    return;
  }

  appState.places.forEach(place => {
    const li = document.createElement("li");
    li.textContent = place.name;
    placesOutput.appendChild(li);
  });

  placesCard.classList.remove("hidden");
}

function renderPlacesFallback() {
  placesOutput.innerHTML = `
    <li>Try a cozy café nearby</li>
    <li>Visit a local park</li>
    <li>Check out a bookstore or library</li>
  `;
  placesCard.classList.remove("hidden");
}

function mapWeatherCode(code) {
  if (code === 0) return "clear sky";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "foggy";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  return "unknown";
}

function renderQuote() {
  if (!appState.quote) return;

  quoteOutput.textContent = appState.quote;
  quoteCard.classList.remove("hidden");
}
