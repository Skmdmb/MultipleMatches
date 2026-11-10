
// =====================================
// APPLICATION INITIALIZATION
// =====================================

document.addEventListener("DOMContentLoaded", async function () {

    console.log("Cricket Tournament Application Started");

    // Load all tournament data from npoint
    await loadTournamentData();

    // Initialize Viewer
    initializeViewer();

    // Show Viewer by default
    showViewer();

    // Refresh Viewer data every 5 seconds
    setInterval(async function () {

        const viewerWindow = document.getElementById("viewerWindow");

        // Refresh only when Viewer is visible
        if (viewerWindow && !viewerWindow.classList.contains("hidden")) {
            await loadTournamentData();
            initializeViewer();
        }

    }, 5000);

});


// =====================================
// LOAD COMPLETE TOURNAMENT DATA
// =====================================

async function loadTournamentData() {

    try {

        const data = await getTournamentData();

        // Load teams
        tournamentTeams = Array.isArray(data.teams)
            ? data.teams
            : [];

        // Load players
        tournamentPlayers = Array.isArray(data.players)
            ? data.players
            : [];

        // Load matches
        tournamentMatches = Array.isArray(data.matches)
            ? data.matches
            : [];

        // Load tournament details
        tournamentDetails = data.tournament &&
            typeof data.tournament === "object"
            ? data.tournament
            : null;

        // Load tournament settings
        tournamentSettings = data.settings &&
            typeof data.settings === "object"
            ? data.settings
            : null;

        console.log("Complete tournament data loaded successfully");

    } catch (error) {

        console.error("Unable to load cloud data:", error);

        // Do not erase existing data if a refresh fails.
        // Initialize empty values only when no data has loaded yet.
        if (!Array.isArray(tournamentTeams)) tournamentTeams = [];
        if (!Array.isArray(tournamentPlayers)) tournamentPlayers = [];
        if (!Array.isArray(tournamentMatches)) tournamentMatches = [];

    }

}


// =====================================
// SHOW VIEWER WINDOW
// =====================================

function showViewer() {

    const viewerWindow = document.getElementById("viewerWindow");
    const adminWindow = document.getElementById("adminWindow");

    const viewerBtn = document.getElementById("viewerBtn");
    const adminBtn = document.getElementById("adminBtn");

    if (!viewerWindow || !adminWindow) return;

    viewerWindow.classList.remove("hidden");
    adminWindow.classList.add("hidden");

    if (viewerBtn) viewerBtn.classList.add("active");
    if (adminBtn) adminBtn.classList.remove("active");

    initializeViewer();
}


// =====================================
// SHOW ADMIN WINDOW
// =====================================

function showAdmin() {

    const viewerWindow = document.getElementById("viewerWindow");
    const adminWindow = document.getElementById("adminWindow");

    const viewerBtn = document.getElementById("viewerBtn");
    const adminBtn = document.getElementById("adminBtn");

    if (!viewerWindow || !adminWindow) return;

    viewerWindow.classList.add("hidden");
    adminWindow.classList.remove("hidden");

    if (adminBtn) adminBtn.classList.add("active");
    if (viewerBtn) viewerBtn.classList.remove("active");

}
