/***************************
 * LOAD PARTIALS
 ***************************/
fetch("partials/tripModal.html")
    .then(res => res.text())
    .then(html => {
        document.getElementById("tripModalContainer").innerHTML = html;
        // Po wczytaniu modalu możesz już go używać
        attachSaveButton(); // przypnij eventy przycisków
    })
    .catch(err => console.error("Error loading modal:", err));

fetch("partials/sidebar.html")
    .then(res => res.text())
    .then(html => document.getElementById("sidebar-container").innerHTML = html);

fetch("partials/calendar.html")
    .then(res => res.text())
    .then(html => {
        document.getElementById("calendar-container").innerHTML = html;

        renderCalendar();          // rysowanie nagłówka i siatki
        attachWeekButtons();       // przypięcie przycisków prev/next
        attachCellClickHandlers(); // przypięcie kliknięć w komórki
        attachSaveButton();        // przypięcie przycisku zapisu modal
    });


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
    return date.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit"
    });
}

/***************************
 * EVENTS DATA
 ***************************/

// Przykładowe wydarzenia - możesz rozbudować lub załadować z API
const eventsData = {
    "2024-01-15": {
        "9:00": [{ type: "blue", text: "Flight<br>Rome" }],
        "10:00": [{ type: "pink", text: "City Walk" }]
    },
    "2024-01-16": {
        "9:00": [{ type: "orange", text: "Hotel<br>Check-in" }],
        "11:00": [{ type: "purple", text: "Lunch" }],
        "13:00": [{ type: "green", text: "Beach" }]
    },
    "2024-01-17": {
        "9:00": [{ type: "blue", text: "Flight<br>Paris" }],
        "10:00": [{ type: "pink", text: "Museum" }]
    },
    "2024-01-18": {
        "9:00": [{ type: "orange", text: "Tour" }],
        "11:00": [{ type: "purple", text: "Lunch" }]
    },
    "2024-01-19": {
        "11:00": [{ type: "purple", text: "Lunch" }]
    }
};

function getEventsForDate(dateStr, hour) {
    if (eventsData[dateStr] && eventsData[dateStr][hour]) {
        return eventsData[dateStr][hour];
    }
    return [];
}

/***************************
 * RENDER FUNCTIONS
 ***************************/

function renderHeader() {
    const header = document.getElementById("calendar-header");
    if (!header) return;
    
    header.innerHTML = "<div></div>";

    const monday = getMonday(currentDate);

    days.forEach((day, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);

        header.innerHTML += `
            <div class="text-center">
                ${day}<br>
                <small>${formatDate(date)}</small>
            </div>
        `;
    });

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const currentWeekElement = document.getElementById("currentWeek");
    if (currentWeekElement) {
        currentWeekElement.innerText = `${formatDate(monday)} – ${formatDate(saturday)}`;
    }
}

function renderGrid() {
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;
    
    grid.innerHTML = "";

    const hours = ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
    const monday = getMonday(currentDate);

    hours.forEach(hour => {
        grid.innerHTML += `<div class="time">${hour}</div>`;

        for (let i = 0; i < 6; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const events = getEventsForDate(dateStr, hour);
            let eventsHtml = "";
            
        events.forEach((event, index) => {
            const displayText = `
                ${event.city}<br>
                ${event.country}
                ${event.cost ? `<br>${event.cost} PLN` : ''}
            `;

            eventsHtml += `
                <div class="event ${event.type}" data-event-index="${index}">
                    ${displayText}
                </div>
            `;
        });

            grid.innerHTML += `
                <div class="cell"
                     data-date="${dateStr}"
                     data-hour="${hour}">
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
    const prevButton = document.getElementById("prevWeek");
    const nextButton = document.getElementById("nextWeek");
    
    if (prevButton) {
        prevButton.addEventListener("click", () => {
            currentDate.setDate(currentDate.getDate() - 7);
            renderCalendar();
            attachCellClickHandlers();
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener("click", () => {
            currentDate.setDate(currentDate.getDate() + 7);
            renderCalendar();
            attachCellClickHandlers();
        });
    }
}

/***************************
 * MODAL & TRIP MANAGEMENT
 ***************************/

let tripModal = null;
let selectedCell = null;
let isEditMode = false;
let editDate = '';
let editHour = '';
let editIndex = -1;

function attachCellClickHandlers() {
    const cells = document.querySelectorAll(".cell");
    
    cells.forEach(cell => {
        cell.addEventListener("click", (e) => {
            if (e.target.classList.contains("event")) {
                // Tryb edycji - kliknięto istniejący event
                handleEventClick(e.target);
                return;
            }
            
            // Tryb dodawania - pusta komórka
            handleCellClick(cell);
        });
    });
}

function handleCellClick(cell) {
    selectedCell = cell;
    const date = cell.dataset.date;
    const hour = cell.dataset.hour;
    
    openModalForAdd(date, hour);
}

function handleEventClick(eventEl) {
    const cell = eventEl.closest('.cell');
    editDate = cell.dataset.date;
    editHour = cell.dataset.hour;
    editIndex = parseInt(eventEl.dataset.eventIndex);
    
    const eventData = getEventData(editDate, editHour, editIndex);
    if (!eventData) return;
    
    openModalForEdit(eventData);
}

// function simulateWeatherFetch() {
//     // TODO: Tu później dodać prawdziwe API pogodowe
//     // Na razie symulacja z placeholder
//     // setTimeout(() => {
//     //     const weatherIcon = document.getElementById("weatherIcon");
//     //     const weatherInput = document.getElementById("tripWeather");
        
//     //     // Placeholder - do uzupełnienia prawdziwym API
//     //     weatherInput.value = "-- °C (uzupełnij później)";
//     //     weatherIcon.textContent = "🌡️";
//     // }, 500);
// }

function getEventData(dateStr, hour, index) {
    if (eventsData[dateStr] && eventsData[dateStr][hour] && eventsData[dateStr][hour][index]) {
        return eventsData[dateStr][hour][index];
    }
    return null;
}

function openModalForAdd(date, hour) {
    isEditMode = false;
    document.getElementById("editMode").value = "0";
    document.getElementById("eventIndex").value = "";
    document.getElementById("deleteTripBtn").style.display = "none";
    
    document.getElementById("tripDate").value = date;
    document.getElementById("tripHour").value = hour;
    
    document.getElementById("tripForm").reset();
    document.getElementById("tripDate").value = date;
    document.getElementById("tripHour").value = hour;
    
    const formattedDate = new Date(date).toLocaleDateString("pl-PL", {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    document.getElementById("tripModalLabel").textContent = 
        `✈️ Dodaj wycieczkę - ${formattedDate}, ${hour}`;
    
    if (!tripModal) {
        tripModal = new bootstrap.Modal(document.getElementById("tripModal"));
    }
    tripModal.show();
}

function openModalForEdit(eventData) {
    isEditMode = true;
    document.getElementById("editMode").value = "1";
    document.getElementById("eventIndex").value = editIndex;
    document.getElementById("deleteTripBtn").style.display = "inline-block";
    
    document.getElementById("tripDate").value = editDate;
    document.getElementById("tripHour").value = editHour;
    
    document.getElementById("tripCountry").value = eventData.country;
    document.getElementById("tripCity").value = eventData.city;
    document.getElementById("tripCost").value = eventData.cost || "";
    
    // Ustaw kolor
    document.querySelector(`input[name="tripColor"][value="${eventData.type}"]`).checked = true;
    
    const formattedDate = new Date(editDate).toLocaleDateString("pl-PL", {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    document.getElementById("tripModalLabel").textContent = 
        `✈️ Edytuj wycieczkę - ${formattedDate}, ${editHour}`;
    
    if (!tripModal) {
        tripModal = new bootstrap.Modal(document.getElementById("tripModal"));
    }
    tripModal.show();
}

function attachSaveButton() {
    const saveBtn = document.getElementById("saveTripBtn");
    const deleteBtn = document.getElementById("deleteTripBtn");
    
    if (saveBtn) {
        saveBtn.addEventListener("click", saveTrip);
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener("click", deleteTrip);
    }
}

function saveTrip() {
    const date = document.getElementById("tripDate").value;
    const hour = document.getElementById("tripHour").value;
    const country = document.getElementById("tripCountry").value.trim();
    const city = document.getElementById("tripCity").value.trim();
    const cost = document.getElementById("tripCost").value;
    const color = document.querySelector('input[name="tripColor"]:checked').value;
    
    // Walidacja
    if (!country || !city) {
        alert("Proszę wypełnić kraj i miasto!");
        return;
    }
    
    const eventData = {
        type: color,
        country: country,
        city: city,
        cost: cost ? parseFloat(cost) : 0
    };
    
    if (isEditMode) {
        // Edycja
        if (!eventsData[date]) eventsData[date] = {};
        if (!eventsData[date][hour]) eventsData[date][hour] = [];
        eventsData[date][hour][editIndex] = eventData;
        showToast(`Wycieczka do ${city}, ${country} została zaktualizowana!`);
    } else {
        // Dodawanie
        if (!eventsData[date]) eventsData[date] = {};
        if (!eventsData[date][hour]) eventsData[date][hour] = [];
        eventsData[date][hour].push(eventData);
        showToast(`Wycieczka do ${city}, ${country} została dodana!`);
    }
    
    // Zapisz do localStorage
    saveEventsToStorage();
    
    // Zamknij modal i odśwież
    tripModal.hide();
    renderCalendar();
    attachCellClickHandlers();
    attachSaveButton();
}

function deleteTrip() {
    if (confirm("Na pewno usunąć tę wycieczkę?")) {
        if (eventsData[editDate] && eventsData[editDate][editHour]) {
            eventsData[editDate][editHour].splice(editIndex, 1);
            
            // Usuń puste obiekty
            if (eventsData[editDate][editHour].length === 0) {
                delete eventsData[editDate][editHour];
            }
            if (Object.keys(eventsData[editDate]).length === 0) {
                delete eventsData[editDate];
            }
        }
        
        saveEventsToStorage();
        tripModal.hide();
        renderCalendar();
        attachCellClickHandlers();
        attachSaveButton();
        
        showToast("Wycieczka została usunięta!");
    }
}

/***************************
 * LOCAL STORAGE
 ***************************/

function saveEventsToStorage() {
    localStorage.setItem("travelPlannerEvents", JSON.stringify(eventsData));
}

function loadEventsFromStorage() {
    const stored = localStorage.getItem("travelPlannerEvents");
    if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(eventsData, parsed);
    }
}

// Załaduj zapisane wydarzenia przy starcie
loadEventsFromStorage();

/***************************
 * TOAST NOTIFICATIONS
 ***************************/

function showToast(message) {
    // Utwórz toast container jeśli nie istnieje
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3";
        document.body.appendChild(toastContainer);
    }
    
    // Utwórz toast
    const toastId = "toast-" + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-bg-success border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ✅ ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML("beforeend", toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // Usuń element po ukryciu
    toastElement.addEventListener("hidden.bs.toast", () => {
        toastElement.remove();
    });
}
