
/* =========================================
   CRICKET TOURNAMENT - ADMIN CONFIGURATION
========================================= */

// Frontend demo password only.
// This is NOT secure authentication.

const ADMIN_DEMO_PASSWORD = "college123";

let isAdminLoggedIn = false;

let tournamentTeams = [];
let tournamentMatches = [];

let tournamentPlayers = null;
let tournamentDetails = null;
let tournamentSettings = null;

let activeMatchId = null;


// =========================================
// COMMON DATA HELPERS
// =========================================

function generateUniqueId() {

    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


function getTeamById(teamId) {

    return tournamentTeams.find(
        team => String(team.id) === String(teamId)
    );
}


function getPlayerById(playerId) {

    if (!Array.isArray(tournamentPlayers)) return null;

    return tournamentPlayers.find(
        player => String(player.id) === String(playerId)
    );
}


function getPlayers() {

    return Array.isArray(tournamentPlayers)
        ? tournamentPlayers
        : [];
}


function getTournamentName() {

    return tournamentDetails?.name || "";
}


// =========================================
// SAVE COMPLETE TOURNAMENT DATA
// =========================================

async function persistTournamentData() {

    try {

        // Read the latest document first so that data not
        // yet loaded into this page is not accidentally lost.

        const latestData = await getTournamentData();

        const completeData = {

            app: "cricket-tournament",

            version: 1,

            tournament: tournamentDetails || latestData.tournament || {
                id: null,
                name: "",
                status: "NOT_CREATED",
                format: "LEAGUE_KNOCKOUT",
                createdAt: null
            },

            teams: tournamentTeams,

            players: Array.isArray(tournamentPlayers)
                ? tournamentPlayers
                : (latestData.players || []),

            matches: tournamentMatches,

            settings: tournamentSettings || latestData.settings || {
                points: {
                    win: 2,
                    loss: 0
                },
                viewerRefreshSeconds: 5
            }

        };

        await saveTournamentData(completeData);

        return true;

    } catch (error) {

        console.error("Unable to persist tournament data:", error);

        alert(
            "Unable to save changes to the cloud. Please check your connection and try again."
        );

        return false;
    }
}


// =========================================
// ADMIN LOGIN
// =========================================

function adminLogin() {

    const passwordInput = document.getElementById("adminPassword");

    const loginMessage = document.getElementById("loginMessage");

    if (!passwordInput || !loginMessage) return;

    const enteredPassword = passwordInput.value;

    if (enteredPassword === ADMIN_DEMO_PASSWORD) {

        isAdminLoggedIn = true;

        document.getElementById("adminLogin")
            .classList.add("hidden");

        document.getElementById("adminDashboard")
            .classList.remove("hidden");

        loginMessage.innerText = "";

        passwordInput.value = "";

        showAdminDashboard();

    } else {

        loginMessage.innerText =
            "Incorrect password. Please try again.";

        passwordInput.value = "";
    }
}


// =========================================
// ADMIN LOGOUT
// =========================================

function adminLogout() {

    isAdminLoggedIn = false;

    document.getElementById("adminDashboard")
        .classList.add("hidden");

    document.getElementById("adminLogin")
        .classList.remove("hidden");

    document.getElementById("adminPassword").value = "";

    document.getElementById("loginMessage").innerText = "";

    showAdmin();
}


// =========================================
// ADMIN DASHBOARD
// =========================================

function showAdminDashboard() {

    if (!isAdminLoggedIn) return;

    const liveMatch = tournamentMatches.find(
        match => match.status === "LIVE"
    );

    const upcomingCount = tournamentMatches.filter(
        match => match.status === "UPCOMING"
    ).length;

    const completedCount = tournamentMatches.filter(
        match => match.status === "COMPLETED"
    ).length;

    const liveContent = liveMatch
        ? `
            <p>
                <strong>${escapeHTML(liveMatch.team1)}</strong>
                vs
                <strong>${escapeHTML(liveMatch.team2)}</strong>
            </p>
            <button onclick="showScoring()">Continue Live Scoring</button>
        `
        : `<p>No match is currently live.</p>`;

    document.getElementById("adminContent").innerHTML = `

        <h3>Admin Dashboard</h3>

        <p>Welcome! Manage your cricket tournament from here.</p>

        <div class="dashboard-stats">

            <div class="result-card">
                <h3>${tournamentTeams.length}</h3>
                <p>Registered Teams</p>
            </div>

            <div class="result-card">
                <h3>${getPlayers().length}</h3>
                <p>Registered Players</p>
            </div>

            <div class="result-card">
                <h3>${tournamentMatches.length}</h3>
                <p>Total Matches</p>
            </div>

            <div class="result-card">
                <h3>${upcomingCount}</h3>
                <p>Upcoming Matches</p>
            </div>

            <div class="result-card">
                <h3>${completedCount}</h3>
                <p>Completed Matches</p>
            </div>

        </div>

        <div class="content-section">

            <h3>Live Match</h3>

            ${liveContent}

        </div>

        <div class="content-section">

            <h3>Tournament Information</h3>

            <p>
                Tournament:
                ${escapeHTML(getTournamentName() || "Not created yet")}
            </p>

            <p>
                Status:
                ${escapeHTML(tournamentDetails?.status || "NOT_CREATED")}
            </p>

        </div>

    `;
}


// =========================================
// COMMON ADMIN SECTION
// =========================================

function showAdminSection(title, description) {

    if (!isAdminLoggedIn) return;

    const adminContent = document.getElementById("adminContent");

    adminContent.innerHTML = `

        <h3>${escapeHTML(title)}</h3>

        <p>${escapeHTML(description)}</p>

    `;
}


// =========================================
// TEAM MANAGEMENT
// =========================================

function showTeamManagement() {

    if (!isAdminLoggedIn) return;

    const adminContent = document.getElementById("adminContent");

    adminContent.innerHTML = `

        <h3>Team Management</h3>

        <p>Add and manage tournament teams.</p>

        <form id="teamForm" class="team-form">

            <input
                type="text"
                id="teamName"
                placeholder="Enter team name"
                maxlength="40"
                required
            >

            <button type="submit">Add Team</button>

        </form>

        <h3>Registered Teams</h3>

        <div class="table-container">

            <table>

                <thead>
                    <tr>
                        <th>#</th>
                        <th>Team Name</th>
                        <th>Played</th>
                        <th>Won</th>
                        <th>Lost</th>
                        <th>Points</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody id="adminTeamTable"></tbody>

            </table>

        </div>

    `;

    document.getElementById("teamForm")
        .addEventListener("submit", function(event) {

            event.preventDefault();

            addTeam();

        });

    renderAdminTeams();
}


async function addTeam() {

    if (!isAdminLoggedIn) return;

    const input = document.getElementById("teamName");

    const teamName = input.value.trim();

    if (!teamName) {

        alert("Please enter a team name.");

        return;
    }

    const duplicate = tournamentTeams.some(team =>
        team.name.toLowerCase() === teamName.toLowerCase()
    );

    if (duplicate) {

        alert("This team already exists.");

        return;
    }

    const newTeam = {

        id: generateUniqueId(),

        name: teamName,

        played: 0,

        won: 0,

        lost: 0,

        tied: 0,

        points: 0,

        runsScored: 0,

        runsConceded: 0,

        ballsFaced: 0,

        ballsBowled: 0,

        nrr: 0

    };

    tournamentTeams.push(newTeam);

    const saved = await persistTournamentData();

    if (!saved) {

        tournamentTeams.pop();

        return;
    }

    input.value = "";

    renderAdminTeams();

    renderPointsTable(tournamentTeams);

    showAdminDashboardIfVisible();
}


function renderAdminTeams() {

    const tableBody = document.getElementById("adminTeamTable");

    if (!tableBody) return;

    if (tournamentTeams.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">No teams added yet.</td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = tournamentTeams.map((team, index) => {

        return `

            <tr>

                <td>${index + 1}</td>

                <td>${escapeHTML(team.name)}</td>

                <td>${team.played || 0}</td>

                <td>${team.won || 0}</td>

                <td>${team.lost || 0}</td>

                <td>${team.points || 0}</td>

                <td>

                    <button onclick="editTeam('${team.id}')">
                        Edit
                    </button>

                    <button onclick="deleteTeam('${team.id}')">
                        Delete
                    </button>

                </td>

            </tr>

        `;

    }).join("");
}


async function editTeam(teamId) {

    if (!isAdminLoggedIn) return;

    const team = getTeamById(teamId);

    if (!team) return;

    const updatedName = prompt(
        "Enter the new team name:",
        team.name
    );

    if (updatedName === null) return;

    const newName = updatedName.trim();

    if (!newName) {

        alert("Team name cannot be empty.");

        return;
    }

    const duplicate = tournamentTeams.some(item =>
        String(item.id) !== String(teamId) &&
        item.name.toLowerCase() === newName.toLowerCase()
    );

    if (duplicate) {

        alert("Another team already has this name.");

        return;
    }

    const oldName = team.name;

    team.name = newName;

    // Keep the displayed team name in existing matches updated.

    tournamentMatches.forEach(match => {

        if (String(match.team1Id) === String(teamId)) {
            match.team1 = newName;
        }

        if (String(match.team2Id) === String(teamId)) {
            match.team2 = newName;
        }

    });

    const saved = await persistTournamentData();

    if (!saved) {

        team.name = oldName;

        tournamentMatches.forEach(match => {

            if (String(match.team1Id) === String(teamId)) {
                match.team1 = oldName;
            }

            if (String(match.team2Id) === String(teamId)) {
                match.team2 = oldName;
            }

        });

        return;
    }

    renderAdminTeams();

    renderPointsTable(tournamentTeams);
}


async function deleteTeam(teamId) {

    if (!isAdminLoggedIn) return;

    const team = getTeamById(teamId);

    if (!team) return;

    const participated = tournamentMatches.some(match => {

        const isThisTeam =
            String(match.team1Id) === String(teamId) ||
            String(match.team2Id) === String(teamId);

        return isThisTeam && match.status !== "UPCOMING";

    });

    if (participated) {

        alert(
            "This team has participated in a match and cannot be deleted."
        );

        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete ${team.name}?`
    );

    if (!confirmed) return;

    tournamentTeams = tournamentTeams.filter(
        item => String(item.id) !== String(teamId)
    );

    const saved = await persistTournamentData();

    if (!saved) {

        tournamentTeams.push(team);

        return;
    }

    renderAdminTeams();

    renderPointsTable(tournamentTeams);
}


// =========================================
// PLAYER MANAGEMENT
// =========================================

function showPlayerManagement() {

    if (!isAdminLoggedIn) return;

    const adminContent = document.getElementById("adminContent");

    adminContent.innerHTML = `

        <h3>Player Management</h3>

        <p>
            Register players using their names.
            Duplicate names are allowed.
            Each player receives a unique internal ID.
        </p>

        <form id="playerForm" class="team-form">

            <input
                type="text"
                id="playerName"
                placeholder="Enter player name"
                maxlength="60"
                required
            >

            <button type="submit">Add Player</button>

        </form>

        <h3>Registered Players</h3>

        <div class="table-container">

            <table>

                <thead>
                    <tr>
                        <th>#</th>
                        <th>Player Name</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody id="adminPlayerTable"></tbody>

            </table>

        </div>

    `;

    document.getElementById("playerForm")
        .addEventListener("submit", function(event) {

            event.preventDefault();

            addPlayer();

        });

    renderAdminPlayers();
}


async function addPlayer() {

    if (!isAdminLoggedIn) return;

    const input = document.getElementById("playerName");

    const name = input.value.trim();

    if (!name) {

        alert("Please enter a player name.");

        return;
    }

    if (!Array.isArray(tournamentPlayers)) {
        tournamentPlayers = [];
    }

    const newPlayer = {

        id: generateUniqueId(),

        name: name,

        createdAt: new Date().toISOString(),

        stats: {

            matches: 0,

            runs: 0,

            ballsFaced: 0,

            fours: 0,

            sixes: 0,

            wickets: 0,

            runsConceded: 0,

            ballsBowled: 0,

            catches: 0,

            runOuts: 0

        }

    };

    tournamentPlayers.push(newPlayer);

    const saved = await persistTournamentData();

    if (!saved) {

        tournamentPlayers.pop();

        return;
    }

    input.value = "";

    renderAdminPlayers();

    showAdminDashboardIfVisible();
}


function renderAdminPlayers() {

    const tableBody = document.getElementById("adminPlayerTable");

    if (!tableBody) return;

    const players = getPlayers();

    if (players.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="3">No players registered yet.</td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = players.map((player, index) => {

        return `

            <tr>

                <td>${index + 1}</td>

                <td>${escapeHTML(player.name)}</td>

                <td>

                    <button onclick="editPlayer('${player.id}')">
                        Edit Name
                    </button>

                    <button onclick="deletePlayer('${player.id}')">
                        Delete
                    </button>

                </td>

            </tr>

        `;

    }).join("");
}


async function editPlayer(playerId) {

    if (!isAdminLoggedIn) return;

    const player = getPlayerById(playerId);

    if (!player) return;

    const updatedName = prompt(
        "Enter the new player name:",
        player.name
    );

    if (updatedName === null) return;

    const newName = updatedName.trim();

    if (!newName) {

        alert("Player name cannot be empty.");

        return;
    }

    const oldName = player.name;

    player.name = newName;

    const saved = await persistTournamentData();

    if (!saved) {

        player.name = oldName;

        return;
    }

    renderAdminPlayers();
}


async function deletePlayer(playerId) {

    if (!isAdminLoggedIn) return;

    const player = getPlayerById(playerId);

    if (!player) return;

    const participated = tournamentMatches.some(match => {

        const deliveries = [
            ...(match.innings || []).flatMap(
                innings => innings.deliveries || []
            )
        ];

        return deliveries.some(delivery => {

            return [
                delivery.strikerId,
                delivery.nonStrikerId,
                delivery.bowlerId,
                delivery.dismissedPlayerId
            ].some(id => String(id) === String(playerId));

        });

    });

    if (participated) {

        alert(
            "This player has participated in a match and cannot be deleted. You can edit the player's name instead."
        );

        return;
    }

    const confirmed = confirm(
        `Delete player ${player.name}?`
    );

    if (!confirmed) return;

    tournamentPlayers = tournamentPlayers.filter(
        item => String(item.id) !== String(playerId)
    );

    const saved = await persistTournamentData();

    if (!saved) {

        tournamentPlayers.push(player);

        return;
    }

    renderAdminPlayers();
}


// =========================================
// MATCH MANAGEMENT
// =========================================

function showMatchManagement() {

    if (!isAdminLoggedIn) return;

    const adminContent = document.getElementById("adminContent");

    if (tournamentTeams.length < 2) {

        adminContent.innerHTML = `

            <h3>Match Management</h3>

            <p>Please add at least two teams before creating a match.</p>

            <button onclick="showTeamManagement()">
                Manage Teams
            </button>

        `;

        return;
    }

    const teamOptions = tournamentTeams.map(team => {

        return `
            <option value="${team.id}">
                ${escapeHTML(team.name)}
            </option>
        `;

    }).join("");

    adminContent.innerHTML = `

        <h3>Match Management</h3>

        <p>Create and manage tournament fixtures.</p>

        <form id="matchForm" class="match-form">

            <label for="team1">Select Team 1</label>

            <select id="team1" required>
                <option value="">Choose Team 1</option>
                ${teamOptions}
            </select>

            <label for="team2">Select Team 2</label>

            <select id="team2" required>
                <option value="">Choose Team 2</option>
                ${teamOptions}
            </select>

            <label for="matchDate">Match Date and Time</label>

            <input
                type="datetime-local"
                id="matchDate"
                required
            >

            <label for="matchOvers">Number of Overs</label>

            <input
                type="number"
                id="matchOvers"
                min="1"
                step="1"
                value="10"
                required
            >

            <button type="submit">Create Match</button>

        </form>

        <h3 style="margin-top: 30px;">Scheduled Matches</h3>

        <div class="table-container">

            <table>

                <thead>
                    <tr>
                        <th>#</th>
                        <th>Match</th>
                        <th>Date</th>
                        <th>Overs</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody id="adminMatchTable"></tbody>

            </table>

        </div>

    `;

    document.getElementById("matchForm")
        .addEventListener("submit", function(event) {

            event.preventDefault();

            createMatch();

        });

    renderAdminMatches();
}


async function createMatch() {

    if (!isAdminLoggedIn) return;

    const team1Id = document.getElementById("team1").value;

    const team2Id = document.getElementById("team2").value;

    const matchDate = document.getElementById("matchDate").value;

    const overs = Number(
        document.getElementById("matchOvers").value
    );

    if (!team1Id || !team2Id) {

        alert("Please select both teams.");

        return;
    }

    if (String(team1Id) === String(team2Id)) {

        alert("A team cannot play against itself.");

        return;
    }

    if (!matchDate || Number.isNaN(new Date(matchDate).getTime())) {

        alert("Please select a valid match date and time.");

        return;
    }

    if (!Number.isInteger(overs) || overs < 1) {

        alert("Overs must be a positive whole number.");

        return;
    }

    const team1 = getTeamById(team1Id);

    const team2 = getTeamById(team2Id);

    if (!team1 || !team2) {

        alert("Selected team could not be found.");

        return;
    }

    const newMatch = {

        id: generateUniqueId(),

        team1Id: team1.id,

        team2Id: team2.id,

        team1: team1.name,

        team2: team2.name,

        date: matchDate,

        overs: overs,

        status: "UPCOMING",

        score: "0/0",

        totalRuns: 0,

        wickets: 0,

        legalBalls: 0,

        extras: 0,

        innings: [],

        scoreHistory: [],

        summary: "Match scheduled"

    };

    tournamentMatches.push(newMatch);

    const saved = await persistTournamentData();

    if (!saved) {

        tournamentMatches.pop();

        return;
    }

    alert("Match created successfully!");

    renderAdminMatches();

    document.getElementById("matchForm").reset();

    document.getElementById("matchOvers").value = 10;
}


// =========================================
// DISPLAY MATCHES
// =========================================

function renderAdminMatches() {

    const tableBody = document.getElementById("adminMatchTable");

    if (!tableBody) return;

    if (tournamentMatches.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">No matches scheduled yet.</td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = tournamentMatches.map((match, index) => {

        const formattedDate = new Date(match.date).toLocaleString();

        let actionButton = "";

        if (match.status === "UPCOMING") {

            actionButton = `

                <button onclick="startMatch('${match.id}')">
                    Start Match
                </button>

                <button onclick="deleteMatch('${match.id}')">
                    Delete
                </button>

            `;

        } else if (match.status === "LIVE") {

            actionButton = `
                <button onclick="showScoring()">
                    Continue Scoring
                </button>
            `;

        } else {

            actionButton = "Completed";

        }

        return `

            <tr>

                <td>${index + 1}</td>

                <td>
                    ${escapeHTML(match.team1)}
                    vs
                    ${escapeHTML(match.team2)}
                </td>

                <td>${escapeHTML(formattedDate)}</td>

                <td>${match.overs}</td>

                <td>${escapeHTML(match.status)}</td>

                <td>${actionButton}</td>

            </tr>

        `;

    }).join("");
}


// =========================================
// START MATCH
// =========================================

async function startMatch(matchId) {

    if (!isAdminLoggedIn) return;

    const match = tournamentMatches.find(
        item => String(item.id) === String(matchId)
    );

    if (!match) return;

    if (match.status !== "UPCOMING") {

        alert("This match cannot be started.");

        return;
    }

    const existingLiveMatch = tournamentMatches.find(
        item => item.status === "LIVE"
    );

    if (existingLiveMatch) {

        alert("Another match is already LIVE.");

        return;
    }

    const confirmed = confirm(
        `Start ${match.team1} vs ${match.team2}?`
    );

    if (!confirmed) return;

    initializeMatchScore(match);

    match.summary = "Match started";

    activeMatchId = match.id;

    const saved = await persistTournamentData();

    if (!saved) {

        match.status = "UPCOMING";

        activeMatchId = null;

        return;
    }

    renderAdminMatches();

    renderLiveMatch(match);

    showScoring();

    alert("Match started. Complete the match setup before recording deliveries.");
}


// =========================================
// DELETE MATCH
// =========================================

async function deleteMatch(matchId) {

    if (!isAdminLoggedIn) return;

    const match = tournamentMatches.find(
        item => String(item.id) === String(matchId)
    );

    if (!match) return;

    if (match.status !== "UPCOMING") {

        alert("Only upcoming matches can be deleted.");

        return;
    }

    const confirmed = confirm(
        `Delete ${match.team1} vs ${match.team2}?`
    );

    if (!confirmed) return;

    tournamentMatches = tournamentMatches.filter(
        item => String(item.id) !== String(matchId)
    );

    const saved = await persistTournamentData();

    if (!saved) {

        tournamentMatches.push(match);

        return;
    }

    renderAdminMatches();
}


// =========================================
// ADMIN POINTS TABLE
// =========================================

function showAdminPointsTable() {

    if (!isAdminLoggedIn) return;

    document.getElementById("adminContent").innerHTML = `

        <h3>Tournament Points Table</h3>

        <p>Team standings and tournament performance.</p>

        <div id="adminPointsTableContainer"></div>

    `;

    renderAdminPointsTable();
}


function renderAdminPointsTable() {

    const container = document.getElementById(
        "adminPointsTableContainer"
    );

    if (!container) return;

    if (tournamentTeams.length === 0) {

        container.innerHTML = "<p>No teams available.</p>";

        return;
    }

    const sortedTeams = [...tournamentTeams].sort((a, b) => {

        return (b.points || 0) - (a.points || 0);

    });

    container.innerHTML = `

        <div class="table-container">

            <table>

                <thead>
                    <tr>
                        <th>Position</th>
                        <th>Team</th>
                        <th>Played</th>
                        <th>Won</th>
                        <th>Lost</th>
                        <th>Tied</th>
                        <th>Points</th>
                    </tr>
                </thead>

                <tbody>

                    ${sortedTeams.map((team, index) => `

                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHTML(team.name)}</td>
                            <td>${team.played || 0}</td>
                            <td>${team.won || 0}</td>
                            <td>${team.lost || 0}</td>
                            <td>${team.tied || 0}</td>
                            <td>${team.points || 0}</td>
                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;
}


// =========================================
// TOURNAMENT MANAGEMENT
// =========================================

function showTournamentManagement() {

    if (!isAdminLoggedIn) return;

    const name = getTournamentName();

    document.getElementById("adminContent").innerHTML = `

        <h3>Tournament Management</h3>

        <p>Manage your current tournament.</p>

        <form id="tournamentForm" class="match-form">

            <label for="tournamentName">
                Tournament Name
            </label>

            <input
                type="text"
                id="tournamentName"
                maxlength="100"
                value="${escapeHTML(name)}"
                placeholder="Enter tournament name"
                required
            >

            <button type="submit">
                Save Tournament Name
            </button>

        </form>

        <div class="content-section">

            <h3>Backup Tournament</h3>

            <p>
                Download a JSON backup before deleting tournament data.
            </p>

            <button onclick="exportTournamentData()">
                Export Tournament Backup
            </button>

        </div>

        <div class="content-section">

            <h3>Delete Tournament</h3>

            <p>
                This permanently deletes tournament-specific data.
                Export a backup first.
            </p>

            <button onclick="deleteTournament()">
                Delete Entire Tournament
            </button>

        </div>

    `;

    document.getElementById("tournamentForm")
        .addEventListener("submit", function(event) {

            event.preventDefault();

            saveTournamentName();

        });
}


async function saveTournamentName() {

    if (!isAdminLoggedIn) return;

    const input = document.getElementById("tournamentName");

    const name = input.value.trim();

    if (!name) {

        alert("Please enter a tournament name.");

        return;
    }

    const previousDetails = tournamentDetails;

    tournamentDetails = {

        id: tournamentDetails?.id || generateUniqueId(),

        name: name,

        status: tournamentDetails?.status || "ACTIVE",

        format: "LEAGUE_KNOCKOUT",

        createdAt: tournamentDetails?.createdAt || new Date().toISOString()

    };

    const saved = await persistTournamentData();

    if (!saved) {

        tournamentDetails = previousDetails;

        return;
    }

    alert("Tournament name saved successfully.");

    showTournamentManagement();
}


// =========================================
// EXPORT TOURNAMENT BACKUP
// =========================================

function exportTournamentData() {

    if (!isAdminLoggedIn) return;

    const backup = {

        app: "cricket-tournament",

        exportedAt: new Date().toISOString(),

        tournament: tournamentDetails,

        teams: tournamentTeams,

        players: getPlayers(),

        matches: tournamentMatches,

        settings: tournamentSettings

    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "cricket-tournament-backup.json";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}


// =========================================
// DELETE ENTIRE TOURNAMENT
// =========================================

async function deleteTournament() {

    if (!isAdminLoggedIn) return;

    const firstConfirmation = confirm(
        "Are you sure you want to delete the entire tournament? Export a backup first."
    );

    if (!firstConfirmation) return;

    const secondConfirmation = confirm(
        "This will delete all teams, players, matches and tournament statistics. Continue?"
    );

    if (!secondConfirmation) return;

    const oldTeams = tournamentTeams;
    const oldPlayers = tournamentPlayers;
    const oldMatches = tournamentMatches;
    const oldDetails = tournamentDetails;

    tournamentTeams = [];

    tournamentPlayers = [];

    tournamentMatches = [];

    tournamentDetails = {

        id: null,

        name: "",

        status: "NOT_CREATED",

        format: "LEAGUE_KNOCKOUT",

        createdAt: null

    };

    activeMatchId = null;

    const saved = await persistTournamentData();

    if (!saved) {

        tournamentTeams = oldTeams;

        tournamentPlayers = oldPlayers;

        tournamentMatches = oldMatches;

        tournamentDetails = oldDetails;

        return;
    }

    alert("Tournament data deleted successfully.");

    showAdminDashboard();
}


// =========================================
// LIVE SCORING ENTRY
// =========================================

function showScoring() {

    if (!isAdminLoggedIn) return;

    const liveMatch = tournamentMatches.find(
        match => match.status === "LIVE"
    );

    if (liveMatch) {
        activeMatchId = liveMatch.id;
    }

    renderScoringPanel();
}


// =========================================
// DASHBOARD REFRESH HELPER
// =========================================

function showAdminDashboardIfVisible() {

    const dashboard = document.getElementById("adminContent");

    if (!dashboard) return;

    if (
        dashboard.innerHTML.includes("Admin Dashboard")
    ) {
        showAdminDashboard();
    }
}
