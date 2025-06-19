// Configuration
const API_BASE_URL = "https://trip-backend-d62e.onrender.com";

// Global variables
let map;
let tripData = [];
let currentPolyline = null;
let currentMarkers = [];
let dbConnected = false;
let dayColors = [
  "#3498db",
  "#e74c3c",
  "#f39c12",
  "#2ecc71",
  "#9b59b6",
  "#1abc9c",
  "#34495e",
  "#e67e22",
  "#16a085",
  "#8e44ad",
];

// Location database for quick lookup
const locationDatabase = {
  // พื้นที่โตเกียว
  narita: { name: "สนามบินนาริตะ", lat: 35.772, lon: 140.3929 },
  haneda: { name: "สนามบินฮาเนดะ", lat: 35.5494, lon: 139.7798 },
  tokyo: { name: "โตเกียว", lat: 35.6762, lon: 139.6503 },
  shibuya: { name: "ชิบุยะ", lat: 35.6598, lon: 139.7006 },
  shinjuku: { name: "ชินจูกุ", lat: 35.6938, lon: 139.7034 },
  ueno: { name: "อุเอโนะ", lat: 35.7138, lon: 139.7773 },
  asakusa: { name: "อาซากุสะ", lat: 35.7148, lon: 139.7967 },
  skytree: { name: "โตเกียวสกายทรี", lat: 35.7101, lon: 139.8107 },
  harajuku: { name: "ฮาราจูกุ", lat: 35.6702, lon: 139.7026 },
  akihabara: { name: "อากิฮาบาระ", lat: 35.6984, lon: 139.773 },
  ginza: { name: "กินซ่า", lat: 35.6717, lon: 139.765 },
  odaiba: { name: "โอไดบะ", lat: 35.6275, lon: 139.7768 },
  disney: { name: "โตเกียวดิสนีย์รีสอร์ท", lat: 35.6329, lon: 139.8804 },

  // พื้นที่ภูเขาไฟฟูจิ
  fuji: { name: "ภูเขาไฟฟูจิ", lat: 35.3606, lon: 138.7274 },
  fujiq: { name: "สวนสนุกฟูจิคิวไฮแลนด์", lat: 35.4884, lon: 138.7785 },
  kawaguchiko: { name: "ทะเลสาบคาวากุจิ", lat: 35.5245, lon: 138.7554 },

  // พื้นที่โอซาก้า
  osaka: { name: "โอซาก้า", lat: 34.6937, lon: 135.5023 },
  dotonbori: { name: "โดทงโบริ", lat: 34.6685, lon: 135.5018 },
  osakacastle: { name: "ปราสาทโอซาก้า", lat: 34.6873, lon: 135.5262 },
  usj: { name: "ยูนิเวอร์แซล สตูดิโอ เจแปน", lat: 34.6658, lon: 135.432 },
  shin_osaka: { name: "สถานีชินโอซาก้า", lat: 34.7335, lon: 135.5005 },
  kansai: { name: "สนามบินคันไซ", lat: 34.4347, lon: 135.244 },

  // พื้นที่เกียวโต
  kyoto: { name: "เกียวโต", lat: 35.0116, lon: 135.7681 },
  fushimi: { name: "ศาลเจ้าฟุชิมิอินาริ", lat: 34.9671, lon: 135.7727 },
  kinkakuji: { name: "วัดคินคะคุจิ (วัดทอง)", lat: 35.0394, lon: 135.7289 },
  arashiyama: { name: "ป่าไผ่อาราชิยามะ", lat: 35.0094, lon: 135.6668 },

  // พื้นที่นารา
  nara: { name: "นารา", lat: 34.6851, lon: 135.8048 },
  nara_park: { name: "สวนสาธารณะนารา", lat: 34.6851, lon: 135.8431 },

  // พื้นที่ฮิโรชิม่า
  hiroshima: { name: "ฮิโรชิม่า", lat: 34.3853, lon: 132.4553 },
  peacepark: { name: "สวนอนุสรณ์สันติภาพ", lat: 34.3955, lon: 132.4536 },

  // ซัปโปโร
  sapporo: { name: "ซัปโปโร", lat: 43.0621, lon: 141.3544 },
  odori: { name: "สวนโอโดริ", lat: 43.0606, lon: 141.3448 },

  // ฟุกุโอกะ
  fukuoka: { name: "ฟุกุโอกะ", lat: 33.5902, lon: 130.4017 },

  // นาโกย่า
  nagoya: { name: "นาโกย่า", lat: 35.1815, lon: 136.9066 },

  // โยโกฮาม่า
  yokohama: { name: "โยโกฮาม่า", lat: 35.4437, lon: 139.638 },
  minatomirai: { name: "มินาโตะมิไร", lat: 35.4575, lon: 139.6322 }
};

// Check database connection on load
async function checkDatabaseConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activities`);
    if (response.ok) {
      dbConnected = true;
      updateDbStatus(true);
    } else {
      throw new Error("Cannot connect to database");
    }
  } catch (error) {
    dbConnected = false;
    updateDbStatus(false);
    console.error("Database connection error:", error);
    showNotification(
      "⚠️ ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (ใช้งานแบบออฟไลน์)",
      "warning"
    );
  }
}

function updateDbStatus(connected) {
  const statusEl = document.getElementById("db-status");
  if (connected) {
    statusEl.className = "db-status db-connected";
    statusEl.textContent = "💚";
  } else {
    statusEl.className = "db-status db-disconnected";
    statusEl.textContent = "🔴 ยังไม่ได้เชื่อมต่อฐานข้อมูล";
  }
}

// Initialize map
function initMap() {
  map = L.map("map").setView([35.6762, 139.6503], 6);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }
  ).addTo(map);
}

// Initialize with sample data
function loadSampleData() {
  tripData = [];

  renderDays();
  showRoute(1);
  showNotification("โหลดข้อมูลตัวอย่างเรียบร้อย", "success");
}

// Save single activity to database
async function saveActivityToDB(dayIndex, activityIndex) {
  if (!dbConnected) {
    showNotification("⚠️ ไม่ได้เชื่อมต่อฐานข้อมูล", "warning");
    return;
  }

  const day = tripData[dayIndex];
  const activity = day.activities[activityIndex];
  const location = locationDatabase[activity.location] || {};
  const isUpdate = !!activity.dbId;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/activities${isUpdate ? `/${activity.dbId}` : ""}`,
      {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_day: `วันที่ ${day.day}`,
          place: activity.location || "unknown",
          time: activity.time,
          description: activity.text,
          latitude: location.lat || null,
          longitude: location.lon || null,
          cost: activity.cost || 0, // เพิ่ม cost
        }),
      }
    );
    if (!response.ok) throw new Error("Failed to save activity");

    const result = await response.json();

    // กรณี POST ให้เก็บ dbId ที่ได้คืนมา
    if (!isUpdate) {
      activity.dbId = result.data.id;
    }

    showActivitySaved(dayIndex, activityIndex);
  } catch (error) {
    console.error("❌ บันทึกกิจกรรมล้มเหลว:", error);
    showNotification("❌ บันทึกกิจกรรมไม่สำเร็จ", "error");
  }
}

// Save all data to database
async function saveAllToDatabase() {
  if (!dbConnected) {
    showNotification("⚠️ ไม่ได้เชื่อมต่อฐานข้อมูลasdasd", "warning");
    return;
  }

  const saveBtn = event.target;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '⏳ กำลังบันทึก... <span class="loading-spinner"></span>';

  try {
    // เพิ่ม cost ในข้อมูลที่ส่ง
    const tripDataWithCost = tripData.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => ({
        ...activity,
        cost: activity.cost || 0,
      })),
    }));

    const response = await fetch(`${API_BASE_URL}/api/trip/save-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripData: tripDataWithCost }),
    });

    if (!response.ok) throw new Error("Failed to save trip data");

    const result = await response.json();
    showNotification(
      `✅ บันทึกข้อมูลทั้งหมดสำเร็จ (${result.count} กิจกรรม)`,
      "success"
    );

    // Mark all activities as saved
    document.querySelectorAll(".activity").forEach((activity) => {
      if (!activity.querySelector(".activity-saved")) {
        const savedIndicator = document.createElement("span");
        savedIndicator.className = "activity-saved";
        activity.appendChild(savedIndicator);
      }
    });
  } catch (error) {
    console.error("❌ บันทึกข้อมูลล้มเหลว:", error);
    showNotification("❌ บันทึกข้อมูลไม่สำเร็จ", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = "☁️ บันทึกลงฐานข้อมูล";
  }
}

// Load data from database
async function loadFromDatabase(showLoading = true) {
  if (!dbConnected) {
    showNotification('⚠️ ไม่ได้เชื่อมต่อฐานข้อมูล', 'warning');
    return;
  }

  // ถ้าเรียกจากปุ่ม จะมี event.target
  const loadBtn = event ? event.target : null;
  
  if (loadBtn && showLoading) {
    loadBtn.disabled = true;
    loadBtn.innerHTML = '⏳ กำลังโหลด... <span class="loading-spinner"></span>';
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/activities`);
    if (!response.ok) throw new Error('Failed to load data');
    
    const result = await response.json();
    
    if (result.data.length === 0) {
      showNotification('ไม่พบข้อมูลในฐานข้อมูล', 'warning');
      // ถ้าไม่มีข้อมูลใน database ให้โหลดจาก localStorage
      const saved = localStorage.getItem('japanTripData');
      if (saved) {
        tripData = JSON.parse(saved);
        renderDays();
        if (tripData.length > 0) {
          showRoute(1);
          document.querySelector('.day-card')?.classList.add('active');
        }
      }
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
          cost: parseFloat(activity.cost) || 0,
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
      document.querySelector('.day-card')?.classList.add('active');
    }
    updateTotalTripCostDisplay();
    showNotification(`✅ โหลดข้อมูลจากฐานข้อมูลสำเร็จ (${result.data.length} กิจกรรม)`, 'success');
    
    // บันทึกลง localStorage ด้วยเผื่อใช้ offline
    localStorage.setItem('japanTripData', JSON.stringify(tripData));
    
  } catch (error) {
    console.error('❌ โหลดข้อมูลล้มเหลว:', error);
    showNotification('❌ โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ', 'error');
    
    // ถ้าโหลดจาก database ไม่ได้ ให้ใช้ localStorage
    const saved = localStorage.getItem('japanTripData');
    if (saved) {
      tripData = JSON.parse(saved);
      renderDays();
      if (tripData.length > 0) {
        showRoute(1);
        document.querySelector('.day-card')?.classList.add('active');
      }
      showNotification('ใช้ข้อมูลที่บันทึกไว้ในเครื่อง', 'info');
    }
  } finally {
    if (loadBtn && showLoading) {
      loadBtn.disabled = false;
      loadBtn.innerHTML = '📥 โหลดจากฐานข้อมูล';
    }
  }
}

// Get icon for place
function getIconForPlace(place) {
  const iconMap = {
    narita: "✈️",
    shibuya: "🏙️",
    asakusa: "🏯",
    skytree: "🗼",
    harajuku: "🛍️",
    fuji: "🗻",
    fujiq: "🎢",
    osaka: "🏮",
    disney: "🎠",
    usj: "🎬",
  };
  return iconMap[place] || "📍";
}

// Show activity saved indicator
function showActivitySaved(dayIndex, activityIndex) {
  const activities = document
    .querySelectorAll(".day-card")
    [dayIndex].querySelectorAll(".activity")[activityIndex];

  if (!activities.querySelector(".activity-saved")) {
    const savedIndicator = document.createElement("span");
    savedIndicator.className = "activity-saved";
    activities.appendChild(savedIndicator);

    setTimeout(() => {
      savedIndicator.style.opacity = "0";
      setTimeout(() => savedIndicator.remove(), 300);
    }, 3000);
  }
}

// Render all days
function renderDays() {
  const container = document.getElementById("days-container");
  container.innerHTML = "";

  tripData.forEach((dayData, index) => {
    const dayElement = createDayElement(dayData, index);
    container.appendChild(dayElement);
  });

  // Add click events to day cards
  document.querySelectorAll(".day-card").forEach((card, index) => {
    card.addEventListener("click", function (e) {
      if (e.target.contentEditable === "true" || e.target.tagName === "BUTTON")
        return;

      document
        .querySelectorAll(".day-card")
        .forEach((c) => c.classList.remove("active"));
      this.classList.add("active");
      showRoute(index + 1);
    });
  });
}
function calculateDayTotal(activities) {
  return activities.reduce((sum, activity) => sum + (activity.cost || 0), 0);
}
// Create day element
function createDayElement(dayData, index) {
  const dayDiv = document.createElement("div");
  dayDiv.className = "day-card";
  dayDiv.setAttribute("data-day", dayData.day);

  const dayTotal = calculateDayTotal(dayData.activities);

  let highlightHtml = "";
  if (dayData.highlight) {
    highlightHtml = `<div class="special-highlight">${dayData.highlight}</div>`;
  }

  dayDiv.innerHTML = `
          <div class="day-header">
            <div class="day-number">วันที่ ${dayData.day}</div>
            <div class="day-date" contenteditable="true" onblur="updateDayDate(${index}, this.textContent)">${
    dayData.date
  }</div>
          </div>
          <div class="activities">
            ${dayData.activities
              .map(
                (activity, actIndex) => `
              <div class="activity">
                <span class="activity-icon">${activity.icon}</span>
                <div class="activity-content">
                  <div class="activity-time" contenteditable="true" onblur="updateActivityTime(${index}, ${actIndex}, this.textContent)">${
                  activity.time
                }</div>
                  <div class="activity-text" contenteditable="true" onblur="updateActivityText(${index}, ${actIndex}, this.textContent)">${
                  activity.text
                }</div>
                  <div class="activity-cost" contenteditable="true" onblur="updateActivityCost(${index}, ${actIndex}, this.textContent)">฿${
                  activity.cost || 0
                }</div>
                </div>
                <button class="btn-remove" onclick="removeActivity(${index}, ${actIndex})">×</button>
              </div>
            `
              )
              .join("")}
          </div>
          <button class="btn-add-activity" onclick="addActivity(${index})">➕ เพิ่มกิจกรรม</button>
          ${highlightHtml}
          <div class="total-cost-summary">💰 ค่าใช้จ่ายรวมวันนี้: ฿${dayTotal.toLocaleString()}</div>
          <div class="route-info" contenteditable="true" onblur="updateRouteInfo(${index}, this.textContent)">${
    dayData.routeInfo
  }</div>
        `;

  return dayDiv;
}
function updateActivityCost(dayIndex, activityIndex, newCost) {
  // Remove ฿ symbol and parse number
  const cost = parseFloat(newCost.replace(/[฿,]/g, "")) || 0;
  tripData[dayIndex].activities[activityIndex].cost = cost;

  lastEditedDayIndex = dayIndex;
  lastEditedActivityIndex = activityIndex;

  // Re-render to update total
  renderDays();
  updateTotalTripCostDisplay(); // ← เพิ่มตรงนี้
  showNotification("อัปเดตค่าใช้จ่ายเรียบร้อย", "success");

  // Auto-save to database
  if (dbConnected) {
    saveActivityToDB(dayIndex, activityIndex);
  }
  triggerAutoSave();
}
// Add new day
function addNewDay() {
  const newDay = {
    day: tripData.length + 1,
    date: `${tripData.length + 4} ธันวาคม - กำหนดวันที่ที่นี่`,
    activities: [
      { time: "09:00", icon: "📌", text: "กิจกรรมใหม่", location: "tokyo" },
    ],
    routeInfo: "📍 กำหนดเส้นทางที่นี่",
  };

  tripData.push(newDay);
  renderDays();
  showNotification("เพิ่มวันใหม่เรียบร้อย", "success");
}

// Add activity to specific day
function addActivity(dayIndex) {
  const newActivity = {
    time: "09:00",
    icon: "📌",
    text: "กิจกรรมใหม่",
    location: "tokyo",
    cost: 0,
  };

  tripData[dayIndex].activities.push(newActivity);
  renderDays();
  showNotification("เพิ่มกิจกรรมเรียบร้อย", "success");
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
    showNotification("ลบกิจกรรมเรียบร้อย", "success");
  } else {
    showNotification("ต้องมีกิจกรรมอย่างน้อย 1 รายการต่อวัน", "error");
  }
}

// Delete activity from database
async function deleteActivityFromDB(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/activities/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete activity");
    console.log("✅ ลบกิจกรรมจากฐานข้อมูลสำเร็จ");
  } catch (error) {
    console.error("❌ ลบกิจกรรมจากฐานข้อมูลล้มเหลว:", error);
  }
}

// Update functions with auto-save to database
function updateDayDate(dayIndex, newDate) {
  tripData[dayIndex].date = newDate;
  showNotification("อัปเดตวันที่เรียบร้อย", "success");
  triggerAutoSave();
}

function updateActivityTime(dayIndex, activityIndex, newTime) {
  tripData[dayIndex].activities[activityIndex].time = newTime;
  lastEditedDayIndex = dayIndex;
  lastEditedActivityIndex = activityIndex;
  showNotification("อัปเดตเวลาเรียบร้อย", "success");

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
    showNotification("อัปเดตกิจกรรมและตำแหน่งเรียบร้อย", "success");
  } else {
    showNotification("อัปเดตกิจกรรมเรียบร้อย", "success");
  }

  // Auto-save to database
  if (dbConnected) {
    saveActivityToDB(dayIndex, activityIndex);
  }
  triggerAutoSave();
}

function updateRouteInfo(dayIndex, newRouteInfo) {
  tripData[dayIndex].routeInfo = newRouteInfo;
  showNotification("อัปเดตข้อมูลเส้นทางเรียบร้อย", "success");
  triggerAutoSave();
}

// Auto-detect location from activity text
function detectLocationFromText(text) {
  text = text.toLowerCase();

const locationKeywords = {
  // Tokyo Area
  narita: ["narita", "นาริตะ", "สนามบินนาริตะ", "ถึงนาริตะ", "บินลงนาริตะ"],
  haneda: ["haneda", "ฮาเนดะ", "สนามบินฮาเนดะ", "ถึงฮาเนดะ"],
  tokyo: ["tokyo", "โตเกียว", "ไปโตเกียว", "เที่ยวโตเกียว", "อยู่โตเกียว"],
  shibuya: ["shibuya", "ชิบูยา", "ชิบุยะ", "แวะชิบูยา", "แวะชิบุยะ"],
  shinjuku: ["shinjuku", "ชินจูกุ", "เดินชินจูกุ", "เที่ยวชินจูกุ"],
  ueno: ["ueno", "อุเอโนะ", "เดินเล่นอุเอโนะ", "ตลาดอุเอโนะ"],
  asakusa: ["asakusa", "อาซากุสะ", "เซ็นโซจิ", "วัดเซ็นโซจิ", "เที่ยวอาซากุสะ"],
  skytree: ["skytree", "สกายทรี", "โตเกียวสกายทรี", "ไปสกายทรี"],
  harajuku: ["harajuku", "ฮาราจูกุ", "เดินเล่นฮาราจูกุ", "ถนนทาเคชิตะ"],
  akihabara: ["akihabara", "อากิฮาบาระ", "ย่านอากิบะ", "ซื้อของอากิฮาบาระ"],
  ginza: ["ginza", "กินซ่า", "ช้อปปิ้งกินซ่า"],
  odaiba: ["odaiba", "โอไดบะ", "เกาะโอไดบะ", "เที่ยวโอไดบะ"],
  disney: [
    "disney", "ดิสนีย์", "ดิสนีย์แลนด์", "ดิสนีย์พาร์ค", "โตเกียวดิสนีย์",
    "ไปเที่ยวดิสนีย์", "สวนสนุกดิสนีย์", "tokyo disney", "disney resort"
  ],

  // Mt. Fuji Area
  fuji: ["fuji", "ฟูจิ", "ภูเขาไฟฟูจิ", "fujisan", "ฟูจิซัง", "ไปฟูจิ", "ชมวิวฟูจิ"],
  fujiq: ["fuji-q", "ฟูจิคิว", "สวนสนุกฟูจิคิว", "ฟูจิคิวไฮแลนด์", "fuji q highland"],
  kawaguchiko: ["คาวากุจิ", "ทะเลสาบคาวากุจิ", "kawaguchiko", "พักคาวากุจิ"],

  // Osaka Area
  osaka: ["osaka", "โอซาก้า", "ไปโอซาก้า", "เที่ยวโอซาก้า"],
  dotonbori: ["dotonbori", "โดทงโบริ", "เดินโดทงโบริ", "กินปูโดทงโบริ"],
  osakacastle: ["osaka castle", "ปราสาทโอซาก้า", "castle", "เที่ยวปราสาทโอซาก้า"],
  usj: ["usj", "universal", "ยูนิเวอร์แซล", "ยูนิเวอร์แซลโอซาก้า", "สวนสนุกยูนิเวอร์แซล", "universal studios"],
  shin_osaka: ["shin-osaka", "ชินโอซาก้า", "สถานีชินโอซาก้า"],
  kansai: ["kansai", "สนามบินคันไซ", "ถึงคันไซ", "บินลงคันไซ"],

  // Kyoto Area
  kyoto: ["kyoto", "เกียวโต", "เที่ยวเกียวโต", "นั่งรถไฟไปเกียวโต"],
  fushimi: ["fushimi", "ศาลเจ้าฟุชิมิ", "ฟุชิมิอินาริ", "ประตูแดง", "ศาลเจ้าอินาริ"],
  kinkakuji: ["kinkakuji", "วัดทอง", "คินคะคุจิ", "golden pavilion", "เที่ยววัดทอง"],
  arashiyama: ["arashiyama", "อาราชิยามะ", "ป่าไผ่", "bamboo grove", "เดินป่าไผ่"],

  // Nara
  nara: ["nara", "นารา", "ไปนารา", "เจอกวาง", "น้องกวาง"],
  nara_park: ["nara park", "สวนกวาง", "สวนสาธารณะนารา", "ป้อนกวาง"],

  // Hiroshima
  hiroshima: ["hiroshima", "ฮิโรชิม่า", "ไปฮิโรชิม่า", "เที่ยวฮิโรชิม่า"],
  peacepark: ["peace park", "สวนสันติภาพ", "อนุสรณ์ฮิโรชิม่า", "พิพิธภัณฑ์สงคราม"],

  // Sapporo
  sapporo: ["sapporo", "ซัปโปโร", "ไปซัปโปโร", "เที่ยวซัปโปโร", "หิมะซัปโปโร"],
  odori: ["odori", "สวนโอโดริ", "odori park", "เทศกาลหิมะ"],

  // Fukuoka
  fukuoka: ["fukuoka", "ฟุกุโอกะ", "ไปฟุกุโอกะ", "สนามบินฟุกุโอกะ"],

  // Nagoya
  nagoya: ["nagoya", "นาโกย่า", "เที่ยวนาโกย่า", "ไปนาโกย่า"],

  // Yokohama
  yokohama: ["yokohama", "โยโกฮาม่า", "ไปโยโกฮาม่า", "เดินโยโกฮาม่า"],
  minatomirai: ["minato mirai", "มินาโตะมิไร", "yokohama bay", "พิพิธภัณฑ์เรือ", "เดินริมอ่าว"]
};

  for (let [location, keywords] of Object.entries(locationKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return location;
    }
  }

  return null;
}

// Show route on map
function showRoute(dayNumber) {
  // Clear existing route and markers
  if (currentPolyline) {
    map.removeLayer(currentPolyline);
  }
  currentMarkers.forEach((marker) => map.removeLayer(marker));
  currentMarkers = [];

  const dayData = tripData[dayNumber - 1];
  if (!dayData) return;

  const color = dayColors[(dayNumber - 1) % dayColors.length];

  // Create markers for each activity
  dayData.activities.forEach((activity, index) => {
    if (activity.location && locationDatabase[activity.location]) {
      const loc = locationDatabase[activity.location];

      // Create custom icon with activity number
      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div style="
            background: ${color};
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ">${index + 1}</div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([loc.lat, loc.lon], { icon: customIcon }).addTo(
        map
      );
      currentMarkers.push(marker);

      // Create popup with activity details
      const popupContent = `
    <div style="min-width: 200px;">
      <strong style="font-size: 16px; color: ${color};">
        ${activity.icon} ${activity.text}
      </strong>
      <hr style="margin: 8px 0; border-color: ${color};">
      <div style="font-size: 14px;">
        <div>📍 <strong>${loc.name}</strong></div>
        <div>🕐 <strong>${activity.time}</strong></div>
        <div>💰 <strong>฿${(activity.cost || 0).toLocaleString()}</strong></div>
        <div>📅 วันที่ ${dayNumber}</div>
        <div style="margin-top: 5px; padding: 5px; background: #f0f0f0; border-radius: 5px;">
          กิจกรรมที่ ${index + 1} ของวัน
        </div>
      </div>
    </div>
  `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: "custom-popup",
      });

      // Open popup on hover
      marker.on("mouseover", function () {
        this.openPopup();
      });

      // Keep popup open on click
      marker.on("click", function () {
        this.openPopup();
      });
    }
  });

  // Create dotted line connecting unique locations (optional)
  const uniqueLocations = [];
  const visitedLocations = new Set();

  dayData.activities.forEach((activity) => {
    if (activity.location && locationDatabase[activity.location]) {
      const locKey = activity.location;
      if (!visitedLocations.has(locKey)) {
        visitedLocations.add(locKey);
        const loc = locationDatabase[locKey];
        uniqueLocations.push([loc.lat, loc.lon]);
      }
    }
  });

  if (uniqueLocations.length > 1) {
    currentPolyline = L.polyline(uniqueLocations, {
      color: color,
      weight: 2,
      opacity: 0.5,
      dashArray: "5, 10", // เส้นประ
      className: "route-line",
    }).addTo(map);
  }

  // Fit map to show all markers
  if (currentMarkers.length > 0) {
    const group = new L.featureGroup(currentMarkers);
    map.fitBounds(group.getBounds().pad(0.2));

    // If only one marker, zoom in more
    if (currentMarkers.length === 1) {
      map.setView(currentMarkers[0].getLatLng(), 13);
    }
  }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(point2[0] - point1[0]);
  const dLon = toRad(point2[1] - point1[1]);
  const lat1 = toRad(point1[0]);
  const lat2 = toRad(point2[0]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

// Save all data to localStorage
function saveAllData() {
  try {
  } catch (error) {
    showNotification("เกิดข้อผิดพลาดในการบันทึก: " + error.message, "error");
  }
}

// Load data from localStorage
function loadData() {
  try {
    const saved = localStorage.getItem("japanTripData");
    if (saved) {
      tripData = JSON.parse(saved);
      loadFromDatabase();
      renderDays();
      if (tripData.length > 0) {
        showRoute(1);
        document.querySelector(".day-card")?.classList.add("active");
      }
      showNotification("โหลดข้อมูลที่บันทึกไว้เรียบร้อย", "success");
    } else {
      loadFromDatabase();
    }
  } catch (error) {
    showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
  }
}

// Clear all data
function clearAllData() {
  if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด? (รวมถึงในฐานข้อมูล)")) {
    // Clear from database if connected
    if (dbConnected) {
      clearDatabaseData();
    }

    tripData = [];
    localStorage.removeItem("japanTripData");
    document.getElementById("days-container").innerHTML = "";

    // Clear map
    if (currentPolyline) {
      map.removeLayer(currentPolyline);
    }
    currentMarkers.forEach((marker) => map.removeLayer(marker));
    currentMarkers = [];

    showNotification("ลบข้อมูลทั้งหมดเรียบร้อย", "success");
  }
}

async function clearDatabaseData() {
  fetch(`${API_BASE_URL}/api/activities`, {
    method: "DELETE",
  })
    .then((res) => {
      if (!res.ok) throw new Error("ลบข้อมูลจากฐานข้อมูลไม่สำเร็จ");
      return res.json();
    })
    .then((data) => {
      console.log("✅ Database cleared:", data);
      showNotification("ลบข้อมูลจากฐานข้อมูลเรียบร้อย", "success");
    })
    .catch((err) => {
      console.error("❌ Database truncate failed:", err);
      showNotification("❌ ไม่สามารถลบข้อมูลจากฐานข้อมูลได้");
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
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  // Hide notification
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Show status
function showStatus(message, type = "success") {
  const statusDiv = document.getElementById("status-display");
  statusDiv.className = `status-display status-${type}`;
  statusDiv.textContent = message;
  statusDiv.style.display = "block";

  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 1000);
}

// Auto-save functionality
let autoSaveTimeout;
function triggerAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    // ถ้าเชื่อมต่อ database ให้บันทึกลง database ด้วย
    if (dbConnected) {
      console.log("Auto-saving to database...");
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
  
  // รอให้ check connection เสร็จก่อนแล้วค่อยโหลดข้อมูล
  loadData();
  
  // Add auto-save on any content change
  document.addEventListener('input', triggerAutoSave);
  document.addEventListener('blur', triggerAutoSave, true);
  
  // Show initial status
  showStatus('โปรแกรมพร้อมใช้งาน! คลิกที่การ์ดวันเพื่อดูเส้นทางบนแผนที่', 'success');
}

// Start the application when page loads
document.addEventListener("DOMContentLoaded", init);
function updateBudget() {
  // Get slider values
  const flightCost = parseInt(document.getElementById("flight-cost").value);
  const hotelCost = parseInt(document.getElementById("hotel-cost").value);
  const carCost = parseInt(document.getElementById("car-cost").value);
  const ticketCost = parseInt(document.getElementById("ticket-cost").value);
  const foodCost = parseInt(document.getElementById("food-cost").value);
  const shoppingCost = parseInt(document.getElementById("shopping-cost").value);

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
    flightCost + hotelTotal + carTotal + ticketCost + foodTotal + shoppingCost;
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
  const shoppingPercent = ((shoppingCost / totalPerPerson) * 100).toFixed(1);

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
    shopping: parseInt(urlParams.get("shopping")) || defaultValues.shopping,
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
function normalizeThaiText(text) {
  return text.toLowerCase()
    .replace("ดิสนีย์แลนด์", "ดิสนีย์")
    .replace("ยูนิเวอร์แซลสตูดิโอ", "ยูนิเวอร์แซล")
    .replace(/\s+/g, ""); // ลบช่องว่าง
}
function updateTotalTripCostDisplay() {
  const total = calculateTotalTripCost();
  const costDisplay = document.getElementById("costid");
  if (costDisplay) {
    costDisplay.textContent = `ค่าใช้จ่าย : ${total.toLocaleString()}`;
  }
}
function calculateTotalTripCost() {
  let total = 0;
  for (const day of tripData) {
    for (const activity of day.activities) {
      total += activity.cost || 0;
    }
  }
  return total;
}
