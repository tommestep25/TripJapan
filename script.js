      let autoRefreshInterval = null;
      let nextUpdateTimeout = null;
      
      // Settings state
      let settingsState = {
        itinerary: true,
        map: true,
        weather: true,
        budget: true,
        darkMode: false,
        advanced: false
      };

      // Initialize settings from localStorage
      function initSettings() {
        const saved = localStorage.getItem('japanTripSettings');
        if (saved) {
          settingsState = { ...settingsState, ...JSON.parse(saved) };
        }
        
        // Apply dark mode class immediately if enabled
        if (settingsState.darkMode) {
          document.body.classList.add('dark-mode');
        }
        
        applySettings();
      }

      // Toggle settings panel
      function toggleSettings() {
        const button = document.querySelector('.settings-button');
        const panel = document.querySelector('.settings-panel');
        const overlay = document.querySelector('.settings-overlay');
        
        button.classList.toggle('active');
        panel.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Update toggle switches to match current state
        updateToggleSwitches();
      }

      // Close settings panel
      function closeSettings() {
        const button = document.querySelector('.settings-button');
        const panel = document.querySelector('.settings-panel');
        const overlay = document.querySelector('.settings-overlay');
        
        button.classList.remove('active');
        panel.classList.remove('active');
        overlay.classList.remove('active');
      }

      // Toggle individual section
      function toggleSection(element) {
        const target = element.getAttribute('data-target');
        const isActive = element.classList.contains('active');
        
        // Toggle visual state
        element.classList.toggle('active');
        
        // Update settings state
const stateKey = target.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
settingsState[stateKey] = !isActive;
        
        // Apply changes immediately for preview
        applySectionToggle(target, !isActive);
      }

      // Apply section toggle
      function applySectionToggle(target, enabled) {
        const mainContent = document.getElementById('main-content');
        
        switch(target) {
          case 'itinerary':
            if (enabled) {
              mainContent.classList.remove('hide-itinerary');
            } else {
              mainContent.classList.add('hide-itinerary');
            }
            break;
            
          case 'map':
            if (enabled) {
              mainContent.classList.remove('hide-map');
            } else {
              mainContent.classList.add('hide-map');
            }
            break;
            
          case 'weather':
            const weatherSection = document.getElementById('weather-section');
            if (enabled) {
              weatherSection.classList.remove('hidden');
            } else {
              weatherSection.classList.add('hidden');
            }
            break;
            
          case 'budget':
            const budgetSection = document.getElementById('budget-section');
            if (enabled) {
              budgetSection.classList.remove('hidden');
            } else {
              budgetSection.classList.add('hidden');
            }
            break;
            
          case 'dark-mode':
            // Add transition class for smooth animation
            document.body.classList.add('dark-mode-transition');
            
            if (enabled) {
              document.body.classList.add('dark-mode');
            } else {
              document.body.classList.remove('dark-mode');
            }
            
            // Remove transition class after animation completes
            setTimeout(() => {
              document.body.classList.remove('dark-mode-transition');
            }, 300);
            break;
            
          case 'advanced':
            const advancedElements = document.querySelectorAll('.humidity, .wind-info, .feels-like, .auto-refresh-toggle, .next-update');
            advancedElements.forEach(el => {
              if (enabled) {
                el.removeAttribute('hidden');
              } else {
                el.setAttribute('hidden', '');
              }
            });
            break;
        }
      }

      // Update toggle switches to match current state
      function updateToggleSwitches() {
        Object.keys(settingsState).forEach(key => {
          const targetName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          const toggle = document.querySelector(`[data-target="${targetName}"]`);
          if (toggle) {
            if (settingsState[key]) {
              toggle.classList.add('active');
            } else {
              toggle.classList.remove('active');
            }
          }
        });
      }

      // Apply all settings
      function applySettings() {
        // Apply each setting
        Object.keys(settingsState).forEach(key => {
          const targetName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          applySectionToggle(targetName, settingsState[key]);
        });
        
        // Save to localStorage
        localStorage.setItem('japanTripSettings', JSON.stringify(settingsState));
        
        // Close settings panel
        closeSettings();
        
      }

      // Show notification
      function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #27ae60, #2ecc71);
          color: white;
          padding: 15px 25px;
          border-radius: 10px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
          z-index: 9999;
          font-weight: bold;
          transform: translateX(100%);
          transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
          notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
          notification.style.transform = 'translateX(100%)';
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }

      $(document).ready(function () {
        initSettings();
        updateWeatherData();
        startAutoRefresh();
      });

      // Initialize map with English map tiles
      var map = L.map("map").setView([35.6762, 139.6503], 6);

      // Use CartoDB Positron tiles for English labels
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Define locations
      const locations = {
        narita: [35.772, 140.3929],
        shibuya: [35.6598, 139.7006],
        asakusa: [35.7148, 139.7967],
        skytree: [35.7101, 139.8107],
        harajuku: [35.6702, 139.7026],
        fuji: [35.3606, 138.7274],
        fujiq: [35.4884, 138.7785],
        osaka: [34.6937, 135.5023],
        osakaCastle: [34.6873, 135.5262],
        dotonbori: [34.6685, 135.5018],
        disney: [35.6329, 139.8804],
        usj: [34.6658, 135.432],
        kansai: [34.4347, 135.244],
      };

      // Day routes with distances and travel times
      const dayRoutes = {
        1: {
          route: [locations.narita, locations.shibuya],
          distances: ["60 km"],
          times: ["1.5 hours"],
          segments: ["Narita Airport → Shibuya"],
        },
        2: {
          route: [
            locations.shibuya,
            locations.asakusa,
            locations.skytree,
            locations.harajuku,
            locations.shibuya,
          ],
          distances: ["12 km", "3 km", "8 km", "6 km"],
          times: ["30 min", "10 min", "25 min", "20 min"],
          segments: [
            "Shibuya → Asakusa",
            "Asakusa → Tokyo Skytree",
            "Skytree → Harajuku",
            "Harajuku → Shibuya",
          ],
        },
        3: {
          route: [locations.shibuya, locations.fuji, locations.fujiq],
          distances: ["120 km", "15 km"],
          times: ["2 hours", "30 min"],
          segments: ["Shibuya → Mount Fuji", "Mount Fuji → Fuji-Q Highland"],
        },
        4: {
          route: [
            locations.fujiq,
            locations.osaka,
            locations.osakaCastle,
            locations.dotonbori,
          ],
          distances: ["400 km", "5 km", "2 km"],
          times: ["4.5 hours", "15 min", "10 min"],
          segments: [
            "Fuji-Q → Osaka",
            "Osaka → Osaka Castle",
            "Castle → Dotonbori",
          ],
        },
        5: {
          route: [locations.osaka, locations.disney],
          distances: ["550 km"],
          times: ["5.5 hours"],
          segments: ["Osaka → Tokyo Disney Resort"],
        },
        6: {
          route: [locations.disney, locations.usj],
          distances: ["550 km"],
          times: ["5.5 hours"],
          segments: ["Disney → Universal Studios Japan"],
        },
        7: {
          route: [locations.usj, locations.kansai],
          distances: ["50 km"],
          times: ["1 hour"],
          segments: ["USJ → Kansai Airport"],
        },
      };

      // Day colors
      const dayColors = {
        1: "#3498db",
        2: "#e74c3c",
        3: "#f39c12",
        4: "#2ecc71",
        5: "#9b59b6",
        6: "#1abc9c",
        7: "#34495e",
      };

      let currentPolyline = null;
      let currentMarkers = [];

      function showRoute(day) {
        // Clear existing route
        if (currentPolyline) {
          map.removeLayer(currentPolyline);
        }
        currentMarkers.forEach((marker) => map.removeLayer(marker));
        currentMarkers = [];

        // Show new route
        const routeData = dayRoutes[day];
        const color = dayColors[day];

        if (routeData && routeData.route) {
          const route = routeData.route;

          currentPolyline = L.polyline(route, {
            color: color,
            weight: 4,
            opacity: 0.8,
          }).addTo(map);

          // Add markers with location names
          route.forEach((location, index) => {
            const locationKey = Object.keys(locations).find(
              (key) =>
                locations[key][0] === location[0] &&
                locations[key][1] === location[1]
            );

            const marker = L.circleMarker(location, {
              color: color,
              fillColor: color,
              fillOpacity: 0.7,
              radius: 8,
            }).addTo(map);
            currentMarkers.push(marker);

            if (locationKey && locationNames[locationKey]) {
              marker.bindPopup(
                `<strong>${
                  locationNames[locationKey]
                }</strong><br>Day ${day} - Stop ${index + 1}`
              );
            }
          });

          // Add distance and time labels on route segments
          for (let i = 0; i < route.length - 1; i++) {
            const start = route[i];
            const end = route[i + 1];
            const midPoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

            if (
              routeData.distances &&
              routeData.distances[i] &&
              routeData.times &&
              routeData.times[i]
            ) {
              const distanceMarker = L.marker(midPoint, {
                icon: L.divIcon({
                  className: "distance-label",
                  html: `<div style="background: white; padding: 4px 8px; border-radius: 15px; border: 2px solid ${color}; font-size: 11px; font-weight: bold; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                                        <div style="color: ${color};">${routeData.distances[i]}</div>
                                        <div style="color: #666; font-size: 9px;">${routeData.times[i]}</div>
                                       </div>`,
                  iconSize: [60, 40],
                  iconAnchor: [30, 20],
                }),
              }).addTo(map);
              currentMarkers.push(distanceMarker);

              if (routeData.segments && routeData.segments[i]) {
                distanceMarker.bindPopup(
                  `<strong>${routeData.segments[i]}</strong><br>Distance: ${routeData.distances[i]}<br>Travel Time: ${routeData.times[i]}`
                );
              }
            }
          }

          // Fit map to route
          map.fitBounds(currentPolyline.getBounds(), { padding: [20, 20] });
        }
      }

      // Add click events to day cards
      document.querySelectorAll(".day-card").forEach((card) => {
        card.addEventListener("click", function () {
          // Remove active class from all cards
          document
            .querySelectorAll(".day-card")
            .forEach((c) => c.classList.remove("active"));

          // Add active class to clicked card
          this.classList.add("active");

          // Show route for this day
          const day = parseInt(this.getAttribute("data-day"));
          showRoute(day);
        });
      });

      // Location names in English
      const locationNames = {
        narita: "Narita Airport",
        shibuya: "Shibuya",
        asakusa: "Asakusa (Sensoji Temple)",
        skytree: "Tokyo Skytree",
        harajuku: "Harajuku",
        fuji: "Mount Fuji",
        fujiq: "Fuji-Q Highland",
        osaka: "Osaka",
        osakaCastle: "Osaka Castle",
        dotonbori: "Dotonbori",
        disney: "Tokyo Disney Resort",
        usj: "Universal Studios Japan",
        kansai: "Kansai Airport",
      };

      // Show all locations on initial load
      Object.entries(locations).forEach(([key, coords]) => {
        L.circleMarker(coords, {
          color: "#34495e",
          fillColor: "#ecf0f1",
          fillOpacity: 0.7,
          radius: 6,
        })
          .addTo(map)
          .bindPopup(locationNames[key]);
      });

      // Budget calculator function with URL parameter storage
      function updateBudget() {
        // Get slider values
        const flightCost = parseInt(
          document.getElementById("flight-cost").value
        );
        const hotelCost = parseInt(document.getElementById("hotel-cost").value);
        const carCost = parseInt(document.getElementById("car-cost").value);
        const ticketCost = parseInt(
          document.getElementById("ticket-cost").value
        );
        const foodCost = parseInt(document.getElementById("food-cost").value);
        const shoppingCost = parseInt(
          document.getElementById("shopping-cost").value
        );

        // Save to URL parameters
        const params = new URLSearchParams();
        params.set("flight", flightCost);
        params.set("hotel", hotelCost);
        params.set("car", carCost);
        params.set("ticket", ticketCost);
        params.set("food", foodCost);
        params.set("shopping", shoppingCost);

        // Update URL without refreshing page
        const newUrl = window.location.pathname + "?" + params.toString();
        window.history.replaceState({}, "", newUrl);

        // Update display values
        document.getElementById("flight-value").textContent =
          flightCost.toLocaleString() + " บาท";
        document.getElementById("hotel-value").textContent =
          hotelCost.toLocaleString() + " บาท × 6 คืน";
        document.getElementById("car-value").textContent =
          carCost.toLocaleString() + " บาท ÷ 6 คน";
        document.getElementById("ticket-value").textContent =
          ticketCost.toLocaleString() + " บาท";
        document.getElementById("food-value").textContent =
          foodCost.toLocaleString() + " บาท × 6 วัน";
        document.getElementById("shopping-value").textContent =
          shoppingCost.toLocaleString() + " บาท";

        // Calculate totals per person
        const hotelTotal = hotelCost * 6; // 6 nights
        const carTotal = (carCost * 6) / 6; // 6 days divided by 6 people
        const foodTotal = foodCost * 6; // 6 days

        const totalPerPerson =
          flightCost +
          hotelTotal +
          carTotal +
          ticketCost +
          foodTotal +
          shoppingCost;
        const totalGroup = totalPerPerson * 6;

        // Update total displays
        document.getElementById("total-per-person").textContent =
          totalPerPerson.toLocaleString() + " บาท";
        document.getElementById("total-group").textContent =
          totalGroup.toLocaleString() + " บาท";

        // Update budget status
        const budgetStatus = document.getElementById("budget-status");
        if (totalPerPerson <= 40000) {
          budgetStatus.innerHTML =
            '<div class="status-good">✅ อยู่ในงบประมาณ 30,000-40,000 บาท/คน</div>';
        } else if (totalPerPerson <= 45000) {
          budgetStatus.innerHTML =
            '<div class="status-warning">⚠️ เกินงบประมาณเล็กน้อย (' +
            totalPerPerson.toLocaleString() +
            " บาท/คน)</div>";
        } else {
          budgetStatus.innerHTML =
            '<div class="status-danger">❌ เกินงบประมาณมาก (' +
            totalPerPerson.toLocaleString() +
            " บาท/คน)</div>";
        }

        // Update chart percentages
        const flightPercent = ((flightCost / totalPerPerson) * 100).toFixed(1);
        const hotelPercent = ((hotelTotal / totalPerPerson) * 100).toFixed(1);
        const carPercent = ((carTotal / totalPerPerson) * 100).toFixed(1);
        const ticketPercent = ((ticketCost / totalPerPerson) * 100).toFixed(1);
        const foodPercent = ((foodTotal / totalPerPerson) * 100).toFixed(1);
        const shoppingPercent = ((shoppingCost / totalPerPerson) * 100).toFixed(
          1
        );

        // Update chart
        const chartContainer = document.querySelector(".chart-container");
        chartContainer.innerHTML = `
                <div class="chart-bar">
                    <div class="bar flight-bar" style="width: ${flightPercent}%"></div>
                    <span>✈️ ตั๋วเครื่องบิน: ${flightPercent}% (${flightCost.toLocaleString()} บาท)</span>
                </div>
                <div class="chart-bar">
                    <div class="bar hotel-bar" style="width: ${hotelPercent}%"></div>
                    <span>🏨 ที่พัก: ${hotelPercent}% (${hotelTotal.toLocaleString()} บาท)</span>
                </div>
                <div class="chart-bar">
                    <div class="bar ticket-bar" style="width: ${ticketPercent}%"></div>
                    <span>🎢 สวนสนุก: ${ticketPercent}% (${ticketCost.toLocaleString()} บาท)</span>
                </div>
                <div class="chart-bar">
                    <div class="bar food-bar" style="width: ${foodPercent}%"></div>
                    <span>🍜 อาหาร: ${foodPercent}% (${foodTotal.toLocaleString()} บาท)</span>
                </div>
                <div class="chart-bar">
                    <div class="bar car-bar" style="width: ${carPercent}%"></div>
                    <span>🚗 รถเช่า: ${carPercent}% (${carTotal.toLocaleString()} บาท)</span>
                </div>
                <div class="chart-bar">
                    <div class="bar shopping-bar" style="width: ${shoppingPercent}%"></div>
                    <span>🛍️ ช็อปปิ้ง: ${shoppingPercent}% (${shoppingCost.toLocaleString()} บาท)</span>
                </div>
            `;
      }

      // Load saved budget data from URL parameters
      function loadBudgetData() {
        const urlParams = new URLSearchParams(window.location.search);

        // Set default values
        const defaultValues = {
          flight: 17500,
          hotel: 1200,
          car: 3000,
          ticket: 5000,
          food: 500,
          shopping: 1500,
        };

        // Get values from URL or use defaults
        const budgetData = {
          flight: parseInt(urlParams.get("flight")) || defaultValues.flight,
          hotel: parseInt(urlParams.get("hotel")) || defaultValues.hotel,
          car: parseInt(urlParams.get("car")) || defaultValues.car,
          ticket: parseInt(urlParams.get("ticket")) || defaultValues.ticket,
          food: parseInt(urlParams.get("food")) || defaultValues.food,
          shopping:
            parseInt(urlParams.get("shopping")) || defaultValues.shopping,
        };

        // Set slider values
        document.getElementById("flight-cost").value = budgetData.flight;
        document.getElementById("hotel-cost").value = budgetData.hotel;
        document.getElementById("car-cost").value = budgetData.car;
        document.getElementById("ticket-cost").value = budgetData.ticket;
        document.getElementById("food-cost").value = budgetData.food;
        document.getElementById("shopping-cost").value = budgetData.shopping;
      }

      // Reset budget to defaults
      function resetBudget() {
        document.getElementById("flight-cost").value = 13000;
        document.getElementById("hotel-cost").value = 2000;
        document.getElementById("car-cost").value = 3000;
        document.getElementById("ticket-cost").value = 5000;
        document.getElementById("food-cost").value = 1000;
        document.getElementById("shopping-cost").value = 1500;

        // Clear URL parameters
        window.history.replaceState({}, "", window.location.pathname);
        updateBudget();
      }

      // Weather functions
      function getWeatherIcon(condition, iconUrl) {
        if (iconUrl && iconUrl.includes("weatherapi.com")) {
          return `<img src="https:${iconUrl}" alt="${condition}" style="width: 32px; height: 32px; vertical-align: middle;">`;
        }

        const iconMap = {
          sunny: "☀️",
          clear: "☀️",
          "partly cloudy": "⛅",
          cloudy: "☁️",
          overcast: "☁️",
          mist: "🌫️",
          fog: "🌫️",
          "light rain": "🌧️",
          "moderate rain": "🌧️",
          "heavy rain": "⛈️",
          "light snow": "🌨️",
          "moderate snow": "❄️",
          "heavy snow": "❄️",
          "thundery outbreaks possible": "⛈️",
          blizzard: "❄️",
        };

        return iconMap[condition.toLowerCase()] || "🌤️";
      }

      function getThaiCondition(condition) {
        const thaiMap = {
          sunny: "แสงแดดจ้า",
          clear: "ฟ้าใส",
          "partly cloudy": "มีเมฆบางส่วน",
          cloudy: "มีเมฆ",
          overcast: "มีเมฆมาก",
          mist: "มีหมอกบาง",
          fog: "มีหมอก",
          "patchy rain possible": "อาจมีฝนเป็นหย่อมๆ",
          "patchy rain nearby": "ฝนตกเป็นหย่อมๆ ในบริเวณใกล้เคียง",
          "light rain": "ฝนเบา",
          "moderate rain": "ฝนปานกลาง",
          "heavy rain": "ฝนหนัก",
          "light snow": "หิมะตกเบา",
          "moderate snow": "หิมะตกปานกลาง",
          "heavy snow": "หิมะตกหนัก",
          "thundery outbreaks possible": "อาจมีฟ้าร้องฟ้าผ่า",
          blizzard: "พายุหิมะ",
        };
        return thaiMap[condition.toLowerCase()] || condition;
      }

      function getSimulatedWeatherData(city) {
        const simulatedData = {
          Tokyo: { temp: 8, condition: "partly cloudy", humidity: 65, wind: 12, windDir: "NW", feelsLike: 6 },
          Osaka: { temp: 10, condition: "cloudy", humidity: 70, wind: 8, windDir: "N", feelsLike: 8 },
          "Mt. Fuji": { temp: -2, condition: "light snow", humidity: 80, wind: 15, windDir: "W", feelsLike: -5 }
        };
        
        const data = simulatedData[city] || simulatedData.Tokyo;
        return {
          temperature: data.temp,
          condition: data.condition,
          humidity: data.humidity,
          windSpeed: data.wind,
          windDirection: data.windDir,
          feelsLike: data.feelsLike,
          icon: null,
          localTime: new Date().toISOString()
        };
      }

      async function fetchWeatherData(city, lat, lon) {
        try {
          const cityNames = {
            Tokyo: "Tokyo",
            Osaka: "Osaka",
            "Mt. Fuji": "Fujikawaguchiko",
          };

          const cityQuery = cityNames[city] || "Tokyo";
          const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=5327911f346a4466a9b24115251706&q=${cityQuery}&aqi=no`
          );

          if (!response.ok) {
            throw new Error("Weather API request failed");
          }

          const data = await response.json();
          const current = data.current;
          const location = data.location;

          return {
            temperature: Math.round(current.temp_c),
            condition: current.condition.text.toLowerCase(),
            humidity: current.humidity,
            windSpeed: Math.round(current.wind_kph),
            windDirection: current.wind_dir,
            feelsLike: Math.round(current.feelslike_c),
            icon: current.condition.icon,
            localTime: location.localtime,
          };
        } catch (error) {
          console.log("Weather API error:", error);
          return getSimulatedWeatherData(city);
        }
      }

      async function updateWeatherData() {
        const button = document.querySelector(".refresh-weather");
        if (button) {
          button.textContent = "⏳ กำลังอัปเดต...";
          button.disabled = true;
        }

        const cities = [
          { name: "Tokyo", lat: 35.6762, lon: 139.6503, id: "tokyo-weather" },
          { name: "Osaka", lat: 34.6937, lon: 135.5023, id: "osaka-weather" },
          { name: "Mt. Fuji", lat: 35.3606, lon: 138.7274, id: "fuji-weather" },
        ];

        try {
          for (const city of cities) {
            const weatherData = await fetchWeatherData(
              city.name,
              city.lat,
              city.lon
            );
            const weatherCard = document.getElementById(city.id);

            if (weatherCard) {
              const icon = getWeatherIcon(
                weatherData.condition,
                weatherData.icon
              );
              const thaiCondition = getThaiCondition(weatherData.condition);

              weatherCard.querySelector(
                ".temperature"
              ).textContent = `${weatherData.temperature}°C`;
              weatherCard.querySelector(
                ".condition"
              ).innerHTML = `${icon} ${thaiCondition}`;
              weatherCard.querySelector(
                ".humidity"
              ).textContent = `ความชื้น: ${weatherData.humidity}%`;

              let windElement = weatherCard.querySelector(".wind-info");
              if (!windElement) {
                windElement = document.createElement("div");
                windElement.className = "wind-info";
                weatherCard.appendChild(windElement);
              }
              windElement.textContent = `ลม: ${weatherData.windSpeed} km/h ${weatherData.windDirection}`;

              let feelsLikeElement = weatherCard.querySelector(".feels-like");
              if (!feelsLikeElement) {
                feelsLikeElement = document.createElement("div");
                feelsLikeElement.className = "feels-like";
                weatherCard.appendChild(feelsLikeElement);
              }
              feelsLikeElement.textContent = `รู้สึกเหมือน: ${weatherData.feelsLike}°C`;
            }
          }

          const now = new Date();
          const timeString = now.toLocaleString("th-TH", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          document.getElementById("last-update-time").textContent = timeString;
        } catch (error) {
          console.error("Error updating weather:", error);
        } finally {
          if (button) {
            button.textContent = "🔄 อัปเดตสภาพอากาศ";
            button.disabled = false;
          }
        }
      }

      function startAutoRefresh() {
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval);
        }
        if (nextUpdateTimeout) {
          clearTimeout(nextUpdateTimeout);
        }

        autoRefreshInterval = setInterval(() => {
          console.log("Auto-refreshing weather data...");
          updateWeatherData();
          updateNextRefreshTime();
        }, 10 * 60 * 1000);

        updateNextRefreshTime();
      }

      function updateNextRefreshTime() {
        const nextUpdate = new Date();
        nextUpdate.setMinutes(nextUpdate.getMinutes() + 10);

        const timeString = nextUpdate.toLocaleString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const nextUpdateElement = document.getElementById("next-update-time");
        if (nextUpdateElement) {
          nextUpdateElement.textContent = timeString;
        }
      }

      // Show day 1 route by default
      showRoute(1);
      document.querySelector('[data-day="1"]').classList.add("active");

      // Initialize budget calculator
      loadBudgetData();
      updateBudget();
