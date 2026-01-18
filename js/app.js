/***************************
 * LOAD PARTIALS
 ***************************/
fetch("partials/tripModal.html")
    .then(res => res.text())
    .then(html => {
        document.getElementById("tripModalContainer").innerHTML = html;
        attachSaveButton();
    });

fetch("partials/sidebar.html")
    .then(res => res.text())
    .then(html => document.getElementById("sidebar-container").innerHTML = html);

fetch("partials/calendar.html")
    .then(res => res.text())
    .then(html => {
        document.getElementById("calendar-container").innerHTML = html;
        renderCalendar();
        attachWeekButtons();
        attachCellClickHandlers();
    });

/***************************
 * WEATHER API
 ***************************/
const WEATHER_API_KEY = "93804964d91b0bb37fb9dd91fe5f92e3";

async function fetchWeatherForCity(city) {
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=pl&appid=${WEATHER_API_KEY}`
        );

        if (!res.ok) throw new Error("Weather fetch failed");

        const data = await res.json();

        return {
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            icon: data.weather[0].icon
        };
    } catch (err) {
        console.error("Weather error:", err);
        return null;
    }
}

/***************************
 * DATE LOGIC
 ***************************/
let currentDate = new Date();
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDate(date) {
    return date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

/***************************
 * EVENTS DATA
 ***************************/
const eventsData = {};

function getEventsForDate(dateStr, hour) {
    return eventsData[dateStr]?.[hour] || [];
}

/***************************
 * RENDER
 ***************************/
function renderHeader() {
    const header = document.getElementById("calendar-header");
    if (!header) return;

    header.innerHTML = "<div></div>";
    const monday = getMonday(currentDate);

    days.forEach((day, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        header.innerHTML += `
            <div class="text-center">
                ${day}<br><small>${formatDate(d)}</small>
            </div>
        `;
    });

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    document.getElementById("currentWeek").innerText =
        `${formatDate(monday)} – ${formatDate(saturday)}`;
}

function renderGrid() {
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;

    grid.innerHTML = "";
    const hours = ["9:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"];
    const monday = getMonday(currentDate);

    hours.forEach(hour => {
        // Kolumna czasu
        grid.innerHTML += `<div class="time">${hour}</div>`;

        for (let i = 0; i < 6; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = d.toISOString().split("T")[0];

            const events = getEventsForDate(dateStr, hour);
            let eventsHtml = "";

            events.forEach((e, idx) => {
                eventsHtml += `
                    <div class="event ${e.type}" data-event-index="${idx}">
                        <div class="event-title">${e.city}, ${e.country}</div>
                        ${e.cost ? `<div class="event-cost">${e.cost} PLN</div>` : ""}
                        ${e.weather ? `
                            <div class="event-weather">
                                🌡️ ${e.weather.temp}°C
                                <small>${e.weather.description}</small>
                            </div>
                        ` : ""}
                    </div>
                `;
            });

            grid.innerHTML += `
                <div class="cell" data-date="${dateStr}" data-hour="${hour}">
                    ${eventsHtml}
                </div>
            `;
        }
    });
}


function renderCalendar() {
    renderHeader();
    renderGrid();
}

/***************************
 * WEEK NAVIGATION
 ***************************/
function attachWeekButtons() {
    document.getElementById("prevWeek")?.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() - 7);
        renderCalendar();
        attachCellClickHandlers();
    });

    document.getElementById("nextWeek")?.addEventListener("click", () => {
        currentDate.setDate(currentDate.getDate() + 7);
        renderCalendar();
        attachCellClickHandlers();
    });
}

/***************************
 * MODAL LOGIC
 ***************************/
let tripModal = null;
let isEditMode = false;
let editDate = "";
let editHour = "";
let editIndex = -1;

function attachCellClickHandlers() {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", e => {
            if (e.target.classList.contains("event")) {
                openEdit(cell, e.target.dataset.eventIndex);
            } else {
                openAdd(cell.dataset.date, cell.dataset.hour);
            }
        });
    });
}

function openAdd(date, hour) {
    isEditMode = false;
    document.getElementById("tripForm").reset();
    document.getElementById("tripDate").value = date;
    document.getElementById("tripHour").value = hour;
    document.getElementById("deleteTripBtn").style.display = "none";

    showModal(`✈️ Dodaj wycieczkę - ${date}, ${hour}`);
}

function openEdit(cell, index) {
    isEditMode = true;
    editDate = cell.dataset.date;
    editHour = cell.dataset.hour;
    editIndex = index;

    const ev = eventsData[editDate][editHour][index];

    document.getElementById("tripDate").value = editDate;
    document.getElementById("tripHour").value = editHour;
    document.getElementById("tripCountry").value = ev.country;
    document.getElementById("tripCity").value = ev.city;
    document.getElementById("tripCost").value = ev.cost || "";
    document.querySelector(`input[value="${ev.type}"]`).checked = true;
    document.getElementById("deleteTripBtn").style.display = "inline-block";

    showModal(`✈️ Edytuj wycieczkę - ${editDate}, ${editHour}`);
}

function showModal(title) {
    document.getElementById("tripModalLabel").textContent = title;
    if (!tripModal) tripModal = new bootstrap.Modal(document.getElementById("tripModal"));
    tripModal.show();
}

/***************************
 * SAVE / DELETE
 ***************************/
function attachSaveButton() {
    document.getElementById("saveTripBtn")?.addEventListener("click", saveTrip);
    document.getElementById("deleteTripBtn")?.addEventListener("click", deleteTrip);
}

async function saveTrip() {
    const date = tripDate.value;
    const hour = tripHour.value;
    const country = tripCountry.value.trim();
    const city = tripCity.value.trim();
    const cost = parseFloat(tripCost.value) || 0;
    const type = document.querySelector('input[name="tripColor"]:checked').value;

    if (!country || !city) return alert("Uzupełnij kraj i miasto");

    let weather = null;

    if (isEditMode) {
        const old = eventsData[date][hour][editIndex];
        weather = old.city === city ? old.weather : await fetchWeatherForCity(city);
        eventsData[date][hour][editIndex] = { type, country, city, cost, weather };
    } else {
        weather = await fetchWeatherForCity(city);
        eventsData[date] ??= {};
        eventsData[date][hour] ??= [];
        eventsData[date][hour].push({ type, country, city, cost, weather });
    }

    saveEventsToStorage();
    tripModal.hide();
    renderCalendar();
    attachCellClickHandlers();
}

function deleteTrip() {
    if (!confirm("Usunąć wycieczkę?")) return;
    eventsData[editDate][editHour].splice(editIndex, 1);
    saveEventsToStorage();
    tripModal.hide();
    renderCalendar();
    attachCellClickHandlers();
}

/***************************
 * LOCAL STORAGE
 ***************************/
function saveEventsToStorage() {
    localStorage.setItem("travelPlannerEvents", JSON.stringify(eventsData));
}

(function load() {
    const data = localStorage.getItem("travelPlannerEvents");
    if (data) Object.assign(eventsData, JSON.parse(data));
})();
