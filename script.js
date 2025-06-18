// Configuration
      const API_BASE_URL = 'https://trip-backend-d62e.onrender.com'; // ใช้ 127.0.0.1 แทน localhost เพื่อหลีกเลี่ยง IPv6 issues
      
      // Global variables
      let map;
      let tripData = [];
      let currentPolyline = null;
      let currentMarkers = [];
      let dbConnected = false;
      let dayColors = [
        '#3498db', '#e74c3c', '#f39c12', '#2ecc71', 
        '#9b59b6', '#1abc9c', '#34495e', '#e67e22',
        '#16a085', '#8e44ad'
      ];

      // Location database for quick lookup
      const locationDatabase = {
        'narita': { name: 'Narita Airport', lat: 35.772, lon: 140.3929 },
        'shibuya': { name: 'Shibuya', lat: 35.6598, lon: 139.7006 },
        'asakusa': { name: 'Asakusa', lat: 35.7148, lon: 139.7967 },
        'skytree': { name: 'Tokyo Skytree', lat: 35.7101, lon: 139.8107 },
        'harajuku': { name: 'Harajuku', lat: 35.6702, lon: 139.7026 },
        'fuji': { name: 'Mount Fuji', lat: 35.3606, lon: 138.7274 },
        'fujiq': { name: 'Fuji-Q Highland', lat: 35.4884, lon: 138.7785 },
        'osaka': { name: 'Osaka', lat: 34.6937, lon: 135.5023 },
        'osakacastle': { name: 'Osaka Castle', lat: 34.6873, lon: 135.5262 },
        'dotonbori': { name: 'Dotonbori', lat: 34.6685, lon: 135.5018 },
        'disney': { name: 'Tokyo Disney Resort', lat: 35.6329, lon: 139.8804 },
        'usj': { name: 'Universal Studios Japan', lat: 34.6658, lon: 135.432 },
        'kansai': { name: 'Kansai Airport', lat: 34.4347, lon: 135.244 },
        'tokyo': { name: 'Tokyo', lat: 35.6762, lon: 139.6503 }
      };

      // Check database connection on load
      async function checkDatabaseConnection() {
        try {
          const response = await fetch(`${API_BASE_URL}/api/activities`);
          if (response.ok) {
            dbConnected = true;
            updateDbStatus(true);
            showNotification('✅ เชื่อมต่อฐานข้อมูลสำเร็จ', 'success');
          } else {
            throw new Error('Cannot connect to database');
          }
        } catch (error) {
          dbConnected = false;
          updateDbStatus(false);
          console.error('Database connection error:', error);
          showNotification('⚠️ ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (ใช้งานแบบออฟไลน์)', 'warning');
        }
      }

      function updateDbStatus(connected) {
        const statusEl = document.getElementById('db-status');
        if (connected) {
          statusEl.className = 'db-status db-connected';
          statusEl.textContent = '🟢 เชื่อมต่อฐานข้อมูลแล้ว';
        } else {
          statusEl.className = 'db-status db-disconnected';
          statusEl.textContent = '🔴 ยังไม่ได้เชื่อมต่อฐานข้อมูล';
        }
      }

      // Initialize map
      function initMap() {
        map = L.map('map').setView([35.6762, 139.6503], 6);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);
      }

      // Initialize with sample data
      function loadSampleData() {
        tripData = [
          
        ];
        
        renderDays();
        showRoute(1);
        showNotification('โหลดข้อมูลตัวอย่างเรียบร้อย', 'success');
      }

      // Save single activity to database
      async function saveActivityToDB(dayIndex, activityIndex) {
  if (!dbConnected) {
    showNotification('⚠️ ไม่ได้เชื่อมต่อฐานข้อมูล', 'warning');
    return;
  }

  const day = tripData[dayIndex];
  const activity = day.activities[activityIndex];
  const location = locationDatabase[activity.location] || {};
  const isUpdate = !!activity.dbId;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/activities${isUpdate ? `/${activity.dbId}` : ''}`,
      {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_day: `วันที่ ${day.day}`,
          place: activity.location || 'unknown',
          time: activity.time,
          description: activity.text,
          latitude: location.lat || null,
          longitude: location.lon || null
        })
      }
    );

    if (!response.ok) throw new Error('Failed to save activity');

    const result = await response.json();

    // กรณี POST ให้เก็บ dbId ที่ได้คืนมา
    if (!isUpdate) {
      activity.dbId = result.data.id;
    }

    showActivitySaved(dayIndex, activityIndex);
    console.log('✅ บันทึกกิจกรรมสำเร็จ:', result.data);
  } catch (error) {
    console.error('❌ บันทึกกิจกรรมล้มเหลว:', error);
    showNotification('❌ บันทึกกิจกรรมไม่สำเร็จ', 'error');
  }
}

      // Save all data to database
      async function saveAllToDatabase() {
        if (!dbConnected) {
          showNotification('⚠️ ไม่ได้เชื่อมต่อฐานข้อมูล', 'warning');
          return;
        }

        const saveBtn = event.target;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ กำลังบันทึก... <span class="loading-spinner"></span>';

        try {
          const response = await fetch(`${API_BASE_URL}/api/trip/save-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripData })
          });

          if (!response.ok) throw new Error('Failed to save trip data');
          
          const result = await response.json();
          showNotification(`✅ บันทึกข้อมูลทั้งหมดสำเร็จ (${result.count} กิจกรรม)`, 'success');
          
          // Mark all activities as saved
          document.querySelectorAll('.activity').forEach(activity => {
            if (!activity.querySelector('.activity-saved')) {
              const savedIndicator = document.createElement('span');
              savedIndicator.className = 'activity-saved';
              savedIndicator.textContent = '✓ บันทึกแล้ว';
              activity.appendChild(savedIndicator);
            }
          });
        } catch (error) {
          console.error('❌ บันทึกข้อมูลล้มเหลว:', error);
          showNotification('❌ บันทึกข้อมูลไม่สำเร็จ', 'error');
        } finally {
          saveBtn.disabled = false;
          saveBtn.innerHTML = '☁️ บันทึกลงฐานข้อมูล';
        }
      }

      // Load data from database
      async function loadFromDatabase() {
        if (!dbConnected) {
          showNotification('⚠️ ไม่ได้เชื่อมต่อฐานข้อมูล', 'warning');
          return;
        }

        const loadBtn = event.target;
        loadBtn.disabled = true;
        loadBtn.innerHTML = '⏳ กำลังโหลด... <span class="loading-spinner"></span>';

        try {
          const response = await fetch(`${API_BASE_URL}/api/activities`);
          if (!response.ok) throw new Error('Failed to load data');
          
          const result = await response.json();
          
          if (result.data.length === 0) {
            showNotification('ไม่พบข้อมูลในฐานข้อมูล', 'warning');
            return;
          }

          // Process and group activities by day
          const groupedActivities = {};
          result.data.forEach(activity => {
            const dayMatch = activity.trip_day.match(/วันที่ (\d+)/);
            if (dayMatch) {
              const dayNum = parseInt(dayMatch[1]);
              if (!groupedActivities[dayNum]) {
                groupedActivities[dayNum] = [];
              }
              groupedActivities[dayNum].push({
                time: activity.time,
                icon: getIconForPlace(activity.place),
                text: activity.description,
                location: activity.place,
                dbId: activity.id
              });
            }
          });

          // Rebuild tripData from database
          tripData = [];
          Object.keys(groupedActivities).sort((a, b) => a - b).forEach(dayNum => {
            tripData.push({
              day: parseInt(dayNum),
              date: `${3 + parseInt(dayNum)} ธันวาคม`,
              activities: groupedActivities[dayNum].sort((a, b) => a.time.localeCompare(b.time)),
              routeInfo: '📍 เส้นทางจากฐานข้อมูล'
            });
          });

          renderDays();
          if (tripData.length > 0) {
            showRoute(1);
          }
          
          showNotification(`✅ โหลดข้อมูลสำเร็จ (${result.data.length} กิจกรรม)`, 'success');
        } catch (error) {
          console.error('❌ โหลดข้อมูลล้มเหลว:', error);
          showNotification('❌ โหลดข้อมูลไม่สำเร็จ', 'error');
        } finally {
          loadBtn.disabled = false;
          loadBtn.innerHTML = '📥 โหลดจากฐานข้อมูล';
        }
      }

      // Get icon for place
      function getIconForPlace(place) {
        const iconMap = {
          'narita': '✈️',
          'shibuya': '🏙️',
          'asakusa': '🏯',
          'skytree': '🗼',
          'harajuku': '🛍️',
          'fuji': '🗻',
          'fujiq': '🎢',
          'osaka': '🏮',
          'disney': '🎠',
          'usj': '🎬'
        };
        return iconMap[place] || '📍';
      }

      // Show activity saved indicator
      function showActivitySaved(dayIndex, activityIndex) {
        const activities = document.querySelectorAll('.day-card')[dayIndex]
                          .querySelectorAll('.activity')[activityIndex];
        
        if (!activities.querySelector('.activity-saved')) {
          const savedIndicator = document.createElement('span');
          savedIndicator.className = 'activity-saved';
          savedIndicator.textContent = '✓ บันทึกแล้ว';
          activities.appendChild(savedIndicator);
          
          setTimeout(() => {
            savedIndicator.style.opacity = '0';
            setTimeout(() => savedIndicator.remove(), 300);
          }, 3000);
        }
      }

      // Render all days
      function renderDays() {
        const container = document.getElementById('days-container');
        container.innerHTML = '';
        
        tripData.forEach((dayData, index) => {
          const dayElement = createDayElement(dayData, index);
          container.appendChild(dayElement);
        });
        
        // Add click events to day cards
        document.querySelectorAll('.day-card').forEach((card, index) => {
          card.addEventListener('click', function(e) {
            if (e.target.contentEditable === 'true' || e.target.tagName === 'BUTTON') return;
            
            document.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            showRoute(index + 1);
          });
        });
      }

      // Create day element
      function createDayElement(dayData, index) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-card';
        dayDiv.setAttribute('data-day', dayData.day);
        
        let highlightHtml = '';
        if (dayData.highlight) {
          highlightHtml = `<div class="special-highlight">${dayData.highlight}</div>`;
        }
        
        dayDiv.innerHTML = `
          <div class="day-header">
            <div class="day-number">วันที่ ${dayData.day}</div>
            <div class="day-date" contenteditable="true" onblur="updateDayDate(${index}, this.textContent)">${dayData.date}</div>
          </div>
          <div class="activities">
            ${dayData.activities.map((activity, actIndex) => `
              <div class="activity">
                <span class="activity-icon">${activity.icon}</span>
                <div class="activity-content">
                  <div class="activity-time" contenteditable="true" onblur="updateActivityTime(${index}, ${actIndex}, this.textContent)">${activity.time}</div>
                  <div class="activity-text" contenteditable="true" onblur="updateActivityText(${index}, ${actIndex}, this.textContent)">${activity.text}</div>
                </div>
                ${activity.dbId ? '<span class="activity-saved">✓ บันทึกแล้ว</span>' : ''}
                <button class="btn-remove" onclick="removeActivity(${index}, ${actIndex})">×</button>
              </div>
            `).join('')}
          </div>
          <button class="btn-add-activity" onclick="addActivity(${index})">➕ เพิ่มกิจกรรม</button>
          ${highlightHtml}
          <div class="route-info" contenteditable="true" onblur="updateRouteInfo(${index}, this.textContent)">${dayData.routeInfo}</div>
        `;
        
        return dayDiv;
      }

      // Add new day
      function addNewDay() {
        const newDay = {
          day: tripData.length + 1,
          date: `${tripData.length + 4} ธันวาคม - กำหนดวันที่ที่นี่`,
          activities: [
            { time: '09:00', icon: '📌', text: 'กิจกรรมใหม่', location: 'tokyo' }
          ],
          routeInfo: '📍 กำหนดเส้นทางที่นี่'
        };
        
        tripData.push(newDay);
        renderDays();
        showNotification('เพิ่มวันใหม่เรียบร้อย', 'success');
      }

      // Add activity to specific day
      function addActivity(dayIndex) {
        const newActivity = {
          time: '09:00',
          icon: '📌',
          text: 'กิจกรรมใหม่',
          location: 'tokyo'
        };
        
        tripData[dayIndex].activities.push(newActivity);
        renderDays();
        showNotification('เพิ่มกิจกรรมเรียบร้อย', 'success');
      }

      // Remove activity
      function removeActivity(dayIndex, activityIndex) {
        if (tripData[dayIndex].activities.length > 1) {
          const activity = tripData[dayIndex].activities[activityIndex];
          
          // Delete from database if has dbId
          if (activity.dbId && dbConnected) {
            deleteActivityFromDB(activity.dbId);
          }
          
          tripData[dayIndex].activities.splice(activityIndex, 1);
          renderDays();
          showNotification('ลบกิจกรรมเรียบร้อย', 'success');
        } else {
          showNotification('ต้องมีกิจกรรมอย่างน้อย 1 รายการต่อวัน', 'error');
        }
      }

      // Delete activity from database
      async function deleteActivityFromDB(id) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/activities/${id}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) throw new Error('Failed to delete activity');
          console.log('✅ ลบกิจกรรมจากฐานข้อมูลสำเร็จ');
        } catch (error) {
          console.error('❌ ลบกิจกรรมจากฐานข้อมูลล้มเหลว:', error);
        }
      }

      // Update functions with auto-save to database
      function updateDayDate(dayIndex, newDate) {
        tripData[dayIndex].date = newDate;
        showNotification('อัปเดตวันที่เรียบร้อย', 'success');
        triggerAutoSave();
      }

      function updateActivityTime(dayIndex, activityIndex, newTime) {
        tripData[dayIndex].activities[activityIndex].time = newTime;
        lastEditedDayIndex = dayIndex;
        lastEditedActivityIndex = activityIndex;
        showNotification('อัปเดตเวลาเรียบร้อย', 'success');
        
        // Auto-save to database
        if (dbConnected) {
          saveActivityToDB(dayIndex, activityIndex);
        }
        triggerAutoSave();
      }

      function updateActivityText(dayIndex, activityIndex, newText) {
        tripData[dayIndex].activities[activityIndex].text = newText;
        lastEditedDayIndex = dayIndex;
        lastEditedActivityIndex = activityIndex;
        
        // Try to auto-detect location from text
        const detectedLocation = detectLocationFromText(newText);
        if (detectedLocation) {
          tripData[dayIndex].activities[activityIndex].location = detectedLocation;
          showNotification('อัปเดตกิจกรรมและตำแหน่งเรียบร้อย', 'success');
        } else {
          showNotification('อัปเดตกิจกรรมเรียบร้อย', 'success');
        }
        
        // Auto-save to database
        if (dbConnected) {
          saveActivityToDB(dayIndex, activityIndex);
        }
        triggerAutoSave();
      }

      function updateRouteInfo(dayIndex, newRouteInfo) {
        tripData[dayIndex].routeInfo = newRouteInfo;
        showNotification('อัปเดตข้อมูลเส้นทางเรียบร้อย', 'success');
        triggerAutoSave();
      }

      // Auto-detect location from activity text
      function detectLocationFromText(text) {
        text = text.toLowerCase();
        
        const locationKeywords = {
          'narita': ['narita', 'นาริตะ'],
          'shibuya': ['shibuya', 'ชิบูยา'],
          'asakusa': ['asakusa', 'อาซากุสะ', 'เซ็นโซจิ'],
          'skytree': ['skytree', 'สกายทรี'],
          'harajuku': ['harajuku', 'ฮาราจูกุ'],
          'fuji': ['fuji', 'ฟูจิ', 'fujisan'],
          'fujiq': ['fuji-q', 'ฟูจิคิว'],
          'osaka': ['osaka', 'โอซาก้า'],
          'osakacastle': ['osaka castle', 'ปราสาทโอซาก้า'],
          'dotonbori': ['dotonbori', 'โดทงโบริ'],
          'disney': ['disney', 'ดิสนีย์'],
          'usj': ['usj', 'universal', 'ยูนิเวอร์แซล']
        };
        
        for (let [location, keywords] of Object.entries(locationKeywords)) {
          if (keywords.some(keyword => text.includes(keyword))) {
            return location;
          }
        }
        
        return null;
      }

      // Show route on map
      function showRoute(dayNumber) {
        // Clear existing route
        if (currentPolyline) {
          map.removeLayer(currentPolyline);
        }
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];

        const dayData = tripData[dayNumber - 1];
        if (!dayData) return;

        const color = dayColors[(dayNumber - 1) % dayColors.length];
        
        // Get unique locations for this day
        const dayLocations = [];
        const locationNames = [];
        
        dayData.activities.forEach(activity => {
          if (activity.location && locationDatabase[activity.location]) {
            const loc = locationDatabase[activity.location];
            
            // Check if location already exists in dayLocations
            const exists = dayLocations.some(existing => 
              existing.lat === loc.lat && existing.lon === loc.lon
            );
            
            if (!exists) {
              dayLocations.push([loc.lat, loc.lon]);
              locationNames.push(loc.name);
            }
          }
        });

        if (dayLocations.length === 0) return;

        // Create route line
        if (dayLocations.length > 1) {
          currentPolyline = L.polyline(dayLocations, {
            color: color,
            weight: 4,
            opacity: 0.8
          }).addTo(map);
          
          // Calculate and show distances
          for (let i = 0; i < dayLocations.length - 1; i++) {
            const distance = calculateDistance(dayLocations[i], dayLocations[i + 1]);
            const midPoint = [
              (dayLocations[i][0] + dayLocations[i + 1][0]) / 2,
              (dayLocations[i][1] + dayLocations[i + 1][1]) / 2
            ];
            
            const distanceMarker = L.marker(midPoint, {
              icon: L.divIcon({
                className: 'distance-label',
                html: `<div style="background: white; padding: 4px 8px; border-radius: 15px; border: 2px solid ${color}; font-size: 11px; font-weight: bold; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                  <div style="color: ${color};">${distance.toFixed(1)} km</div>
                  <div style="color: #666; font-size: 9px;">${Math.round(distance * 1.5)} min</div>
                </div>`,
                iconSize: [60, 40],
                iconAnchor: [30, 20]
              })
            }).addTo(map);
            currentMarkers.push(distanceMarker);
            
            distanceMarker.bindPopup(`
              <strong>${locationNames[i]} → ${locationNames[i + 1]}</strong><br>
              Distance: ${distance.toFixed(1)} km<br>
              Estimated Time: ${Math.round(distance * 1.5)} minutes
            `);
          }
          
          // Fit map to route
          map.fitBounds(currentPolyline.getBounds(), { padding: [20, 20] });
        }

        // Add markers for each location
        dayLocations.forEach((location, index) => {
          const marker = L.circleMarker(location, {
            color: color,
            fillColor: color,
            fillOpacity: 0.7,
            radius: 8
          }).addTo(map);
          currentMarkers.push(marker);

          // Create popup content with activities for this location
          const locationKey = Object.keys(locationDatabase).find(key => {
            const loc = locationDatabase[key];
            return loc.lat === location[0] && loc.lon === location[1];
          });
          
          const activitiesAtLocation = dayData.activities.filter(activity => 
            activity.location === locationKey
          );
          
          let popupContent = `<strong>${locationNames[index]}</strong><br>Day ${dayNumber}<br><br>`;
          activitiesAtLocation.forEach(activity => {
            popupContent += `${activity.time} - ${activity.icon} ${activity.text}<br>`;
          });
          
          marker.bindPopup(popupContent);
        });
      }

      // Calculate distance between two points (Haversine formula)
      function calculateDistance(point1, point2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = toRad(point2[0] - point1[0]);
        const dLon = toRad(point2[1] - point1[1]);
        const lat1 = toRad(point1[0]);
        const lat2 = toRad(point2[0]);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
      }

      function toRad(value) {
        return value * Math.PI / 180;
      }

      // Save all data to localStorage
      function saveAllData() {
        try {
        } catch (error) {
          showNotification('เกิดข้อผิดพลาดในการบันทึก: ' + error.message, 'error');
        }
      }

      // Load data from localStorage
      function loadData() {
        try {
          const saved = localStorage.getItem('japanTripData');
          if (saved) {
            tripData = JSON.parse(saved);
            renderDays();
            if (tripData.length > 0) {
              showRoute(1);
              document.querySelector('.day-card')?.classList.add('active');
            }
            showNotification('โหลดข้อมูลที่บันทึกไว้เรียบร้อย', 'success');
          } else {
          }
        } catch (error) {
          showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        }
      }

      // Clear all data
      function clearAllData() {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด? (รวมถึงในฐานข้อมูล)')) {
          // Clear from database if connected
          if (dbConnected) {
            clearDatabaseData();
          }
          
          tripData = [];
          localStorage.removeItem('japanTripData');
          document.getElementById('days-container').innerHTML = '';
          
          // Clear map
          if (currentPolyline) {
            map.removeLayer(currentPolyline);
          }
          currentMarkers.forEach(marker => map.removeLayer(marker));
          currentMarkers = [];
          
          showNotification('ลบข้อมูลทั้งหมดเรียบร้อย', 'success');
        }
      }

async function clearDatabaseData() {
  fetch(`${API_BASE_URL}/api/activities`, {
    method: 'DELETE'
  })
  .then(res => {
    if (!res.ok) throw new Error('ลบข้อมูลจากฐานข้อมูลไม่สำเร็จ');
    return res.json();
  })
  .then(data => {
    console.log('✅ Database cleared:', data);
    showNotification('ลบข้อมูลจากฐานข้อมูลเรียบร้อย', 'success');
  })
  .catch(err => {
    console.error('❌ Database truncate failed:', err);
    showNotification('❌ ไม่สามารถลบข้อมูลจากฐานข้อมูลได้');
  });
}
      // Clear database data
      // async function clearDatabaseData() {
      //   try {
      //     const response = await fetch(`${API_BASE_URL}/api/activities/clear-all`, {
      //       method: 'DELETE'
      //     });
      //     console.log('response1', response);
      //     if (!response.ok) throw new Error('Failed to clear database');
      //     console.log('✅ ล้างข้อมูลในฐานข้อมูลสำเร็จ');
      //   } catch (error) {
      //     console.error('❌ ล้างข้อมูลในฐานข้อมูลล้มเหลว:', error);
      //   }
      // }

      // Show notification
      function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
          notification.classList.add('show');
        }, 100);

        // Hide notification
        setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }, 3000);
      }

      // Show status
      function showStatus(message, type = 'success') {
        const statusDiv = document.getElementById('status-display');
        statusDiv.className = `status-display status-${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 1000);
      }

      // Auto-save functionality
      let autoSaveTimeout;
      function triggerAutoSave() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
          
          // ถ้าเชื่อมต่อ database ให้บันทึกลง database ด้วย
          if (dbConnected) {
            console.log('Auto-saving to database...');
            saveActivityToDB(lastEditedDayIndex, lastEditedActivityIndex);
          }
        }, 2000); // Auto-save after 2 seconds of inactivity
      }
      
      // Track last edited activity
      let lastEditedDayIndex = null;
      let lastEditedActivityIndex = null;

      // Initialize application
      async function init() {
        initMap();
        await checkDatabaseConnection();
        loadData();
        
        // Add auto-save on any content change
        document.addEventListener('input', triggerAutoSave);
        document.addEventListener('blur', triggerAutoSave, true);
        
        // Show initial status
        showStatus('โปรแกรมพร้อมใช้งาน! คลิกที่การ์ดวันเพื่อดูเส้นทางบนแผนที่', 'success');
      }

      // Start the application when page loads
      document.addEventListener('DOMContentLoaded', init);
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
