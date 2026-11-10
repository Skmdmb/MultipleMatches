
// =====================================
// VIEWER DASHBOARD
// =====================================


// =====================================
// HTML SECURITY HELPER
// =====================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, function (character) {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];

    });

}


// =====================================
// POINTS TABLE
// =====================================

function renderPointsTable(teams = []) {

    const tableBody = document.getElementById("pointsTableBody");

    if (!tableBody) return;

    if (!Array.isArray(teams) || teams.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">No teams available yet.</td>
            </tr>
        `;

        return;
    }

    const sortedTeams = teams.map(team => {

        const won = Number(team.won) || 0;
        const lost = Number(team.lost) || 0;
        const tied = Number(team.tied) || 0;

        return {
            ...team,
            won,
            lost,
            tied,
            played: team.played ?? won + lost + tied,
            points: team.points ?? (won * 2 + tied)
        };

    }).sort((a, b) => {

        return b.points - a.points || b.won - a.won;

    });


    tableBody.innerHTML = sortedTeams.map((team, index) => {

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(team.name)}</td>
                <td>${team.played}</td>
                <td>${team.won}</td>
                <td>${team.lost}</td>
                <td><strong>${team.points}</strong></td>
            </tr>
        `;

    }).join("");

}


// =====================================
// LIVE MATCH DISPLAY
// =====================================

function renderLiveMatch(match) {

    const liveMatch = document.getElementById("liveMatch");

    if (!liveMatch) return;

    if (!match) {

        liveMatch.innerHTML = `
            <p>No live match currently available.</p>
        `;

        return;
    }

    liveMatch.innerHTML = `

        <div class="match-display">

            <h3>${escapeHTML(match.team1)} vs ${escapeHTML(match.team2)}</h3>

            <p>
                ${escapeHTML(match.status || "LIVE")}
            </p>

            <h2>${escapeHTML(match.score || "0/0")}</h2>

            <p>
                Overs: ${escapeHTML(match.overs ?? "0")}
            </p>

            <p>
                ${escapeHTML(match.summary || "")}
            </p>

        </div>

    `;

}


// =====================================
// RECENT MATCH RESULTS
// =====================================

function renderRecentResults(matches = []) {

    const recentResults = document.getElementById("recentResults");

    if (!recentResults) return;

    if (!Array.isArray(matches) || matches.length === 0) {

        recentResults.innerHTML = `
            <p>No completed matches yet.</p>
        `;

        return;
    }

    recentResults.innerHTML = matches.map(match => {

        return `

            <div class="result-card">

                <h3>
                    ${escapeHTML(match.team1)}
                    vs
                    ${escapeHTML(match.team2)}
                </h3>

                <p>${escapeHTML(match.result || "Result unavailable")}</p>

                <small>${escapeHTML(match.date || "")}</small>

            </div>

        `;

    }).join("");

}


// =====================================
// INITIAL VIEWER DISPLAY
// =====================================

function initializeViewer() {

    // Display teams from cloud data
    renderPointsTable(tournamentTeams);

    // Find and display the live match
    const liveMatch = tournamentMatches.find(
        match => match.status === "LIVE"
    );

    renderLiveMatch(liveMatch || null);

    // Display completed matches
    const completedMatches = tournamentMatches
        .filter(match => match.status === "COMPLETED")
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    renderRecentResults(completedMatches);

}
