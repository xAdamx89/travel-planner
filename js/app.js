/***************************
 * LOAD PARTIALS
 ***************************/

// Sidebar
fetch("partials/sidebar.html")
    .then(res => {
        if (!res.ok) throw new Error("Sidebar not found");
        return res.text();
    })
    .then(html => {
        document.getElementById("sidebar-container").innerHTML = html;
    })
    .catch(err => console.error("Error loading sidebar:", err));

// Calendar
fetch("partials/calendar.html")
    .then(res => {
        if (!res.ok) throw new Error("Calendar not found");
        return res.text();
    })
    .then(html => {
        document.getElementById("calendar-container").innerHTML = html;
        renderCalendar(); // render dopiero po załadowaniu DOM kalendarza
        attachWeekButtons();
    })
    .catch(err => console.error("Error loading calendar:", err));

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
            
            events.forEach(event => {
                eventsHtml += `<div class="event ${event.type}">${event.text}</div>`;
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
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener("click", () => {
            currentDate.setDate(currentDate.getDate() + 7);
            renderCalendar();
        });
    }
}
