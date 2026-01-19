/***************************
 * REDUX (UMD) SETUP
 ***************************/
const { configureStore, createSlice } = window.RTK;

// Slice do wydarzeń
const eventsSlice = createSlice({
    name: 'events',
    initialState: {},
    reducers: {
        setEvent(state, action) {
            const { date, hour, index, eventData } = action.payload;
            if (!state[date]) state[date] = {};
            if (!state[date][hour]) state[date][hour] = [];
            if (index !== undefined && index !== null) {
                state[date][hour][index] = eventData;
            } else {
                state[date][hour].push(eventData);
            }
        },
        deleteEvent(state, action) {
            const { date, hour, index } = action.payload;
            if (state[date]?.[hour]) {
                state[date][hour].splice(index, 1);
                if (state[date][hour].length === 0) delete state[date][hour];
                if (Object.keys(state[date]).length === 0) delete state[date];
            }
        },
        loadEvents(state, action) {
            return action.payload || {};
        }
    }
});

const { setEvent, deleteEvent, loadEvents } = eventsSlice.actions;

// Store
const store = configureStore({
    reducer: { events: eventsSlice.reducer }
});

// Selectory
function selectEvents(state) { return state.events; }
function selectTotalCost(state) {
    let total = 0;
    Object.values(state.events).forEach(hours => {
        Object.values(hours).forEach(eventsArray => {
            eventsArray.forEach(ev => total += ev.cost || 0);
        });
    });
    return total;
}

// LocalStorage sync
function saveToStorage() {
    localStorage.setItem('travelPlannerEvents', JSON.stringify(store.getState().events));
}
function loadFromStorage() {
    const data = localStorage.getItem('travelPlannerEvents');
    if (data) store.dispatch(loadEvents(JSON.parse(data)));
}
loadFromStorage();
store.subscribe(saveToStorage);
store.subscribe(() => {
    renderCalendar();
    attachCellClickHandlers();
});

/***************************
 * WEATHER API
 ***************************/
const WEATHER_API_KEY = "93804964d91b0bb37fb9dd91fe5f92e3";
async function fetchWeatherForCity(city) {
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=pl&appid=${WEATHER_API_KEY}`);
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();
        return { temp: Math.round(data.main.temp), description: data.weather[0].description, icon: data.weather[0].icon };
    } catch (err) {
        console.error("Weather error:", err);
        return null;
    }
}

/***************************
 * DATE LOGIC
 ***************************/
let currentDate = new Date();
const days = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}
function formatDate(date) {
    return date.toLocaleDateString("pl-PL",{ day:"2-digit", month:"2-digit" });
}

/***************************
 * RENDER FUNCTIONS
 ***************************/
function renderHeader() {
    const header = document.getElementById("calendar-header");
    if (!header) return;
    header.innerHTML = "<div></div>";

    const monday = getMonday(currentDate);
    days.forEach((day,i)=>{
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        header.innerHTML += `<div class="text-center">${day}<br><small>${formatDate(d)}</small></div>`;
    });

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    document.getElementById("currentWeek").textContent = `${formatDate(monday)} – ${formatDate(saturday)}`;
}

function renderGrid() {
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;

    grid.innerHTML = "";
    const hours = ["9:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"];
    const monday = getMonday(currentDate);
    const stateEvents = selectEvents(store.getState());

    hours.forEach(hour=>{
        grid.innerHTML += `<div class="time">${hour}</div>`;
        for(let i=0;i<6;i++){
            const d = new Date(monday);
            d.setDate(monday.getDate()+i);
            const dateStr = d.toISOString().split("T")[0];

            const events = stateEvents[dateStr]?.[hour] || [];
            let html = "";
            events.forEach((e, idx) => {
                html += `
                    <div class="event ${e.type}" data-event-index="${idx}">
                        <div class="event-content">
                            <div class="event-title">${e.city}, ${e.country}</div>
                            ${e.cost ? `<div class="event-cost">${e.cost} PLN</div>` : ""}
                            ${e.tripWeather ? `<div class="event-text">${e.tripWeather}</div>` : ""}
                            ${e.weather ? `
                                <div class="event-weather" title="${e.weather.description}">
                                    Aktualna pogoda: 🌡️ ${e.weather.temp}°C<br><small>${e.weather.description}</small>
                                </div>
                            ` : ""}
                        </div>
                    </div>
                `;
            });

            grid.innerHTML += `<div class="cell" data-date="${dateStr}" data-hour="${hour}">${html}</div>`;
        }
    });

    const totalContainer = document.getElementById("total-cost");
    if(totalContainer) totalContainer.textContent = `Suma wszystkich wycieczek: ${selectTotalCost(store.getState())} PLN`;
}

function renderCalendar() { renderHeader(); renderGrid(); }

/***************************
 * WEEK NAVIGATION
 ***************************/
function attachWeekButtons() {
    document.getElementById("prevWeek")?.addEventListener("click",()=>{
        currentDate.setDate(currentDate.getDate()-7);
        renderCalendar();
        attachCellClickHandlers();
    });
    document.getElementById("nextWeek")?.addEventListener("click",()=>{
        currentDate.setDate(currentDate.getDate()+7);
        renderCalendar();
        attachCellClickHandlers();
    });
}

/***************************
 * MODAL LOGIC
 ***************************/
let tripModal=null,isEditMode=false,editDate="",editHour="",editIndex=-1;

function attachCellClickHandlers() {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.onclick = null; // reset

        cell.addEventListener("click", e => {
            const eventEl = e.target.closest(".event");

            if (eventEl) {
                openEdit(cell, eventEl.dataset.eventIndex);
            } else {
                openAdd(cell.dataset.date, cell.dataset.hour);
            }
        });
    });
}


function openAdd(date,hour){
    isEditMode = false;
    document.getElementById("tripForm").reset();
    document.getElementById("tripDate").value = date;
    document.getElementById("tripHour").value = hour;
    document.getElementById("tripWeather").value = ""; // <-- reset pogody
    document.getElementById("deleteTripBtn").style.display = "none";
    showModal(`Dodaj zdarzenie - ${date}, ${hour}`);
}

function openEdit(cell,index){
    isEditMode=true;
    editDate=cell.dataset.date;
    editHour=cell.dataset.hour;
    editIndex=Number(index);
    const ev = selectEvents(store.getState())[editDate][editHour][editIndex];
    document.getElementById("tripDate").value=editDate;
    document.getElementById("tripHour").value=editHour;
    document.getElementById("tripCountry").value=ev.country;
    document.getElementById("tripCity").value=ev.city;
    document.getElementById("tripCost").value=ev.cost||"";
    document.getElementById("tripWeather").value=ev.tripWeather||"";
    document.querySelector(`input[value="${ev.type}"]`).checked=true;
    document.getElementById("deleteTripBtn").style.display="inline-block";
    showModal(`Edytuj zdarzenie - ${editDate}, ${editHour}`);
}

function showModal(title) {
    document.getElementById("tripModalLabel").textContent = title;
    if (!tripModal) {
        tripModal = new bootstrap.Modal(document.getElementById("tripModal"));
    }
    tripModal.show();
}


/***************************
 * SAVE / DELETE
 ***************************/
function attachSaveButton(){
    document.getElementById("saveTripBtn")?.addEventListener("click",saveTrip);
    document.getElementById("deleteTripBtn")?.addEventListener("click",deleteTrip);
}

async function saveTrip() {
    const date = document.getElementById("tripDate").value;
    const hour = document.getElementById("tripHour").value;
    const country = document.getElementById("tripCountry").value.trim();
    const city = document.getElementById("tripCity").value.trim();
    const cost = parseFloat(document.getElementById("tripCost").value || 0);
    const color = document.querySelector('input[name="tripColor"]:checked').value;
    const tripWeather = document.getElementById("tripWeather").value.trim();

    if (!country || !city) {
        alert("Proszę wypełnić zdarzenie i opis!");
        return;
    }

    const eventData = { country, city, cost, type: color, tripWeather };

    if (isEditMode) {
        store.dispatch(setEvent({ date, hour, index: editIndex, eventData }));
    } else {
        store.dispatch(setEvent({ date, hour, eventData }));
    }

    tripModal.hide();
}



function deleteTrip() {
    if (!confirm("Na pewno usunąć tę wycieczkę?")) return;

    store.dispatch(deleteEvent({
        date: editDate,
        hour: editHour,
        index: editIndex
    }));

    tripModal.hide();
}


/***************************
 * LOAD PARTIALS & INIT
 ***************************/
fetch("partials/tripModal.html").then(r=>r.text()).then(html=>{
    document.getElementById("tripModalContainer").innerHTML=html;
    attachSaveButton();
});
fetch("partials/sidebar.html").then(r=>r.text()).then(html=>{
    document.getElementById("sidebar-container").innerHTML=html;
});
fetch("partials/calendar.html").then(r=>r.text()).then(html=>{
    document.getElementById("calendar-container").innerHTML=html;
    renderCalendar();
    attachWeekButtons();
    attachCellClickHandlers();
});
