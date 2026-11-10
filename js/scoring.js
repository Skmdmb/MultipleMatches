
/* =========================================
   CRICKET SCORING
========================================= */

let currentInnings = null;
let undoHistory = [];

function scoringEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function getActiveMatch() {
    return tournamentMatches.find(match =>
        match.id === activeMatchId && match.status === "LIVE"
    ) || tournamentMatches.find(match => match.status === "LIVE") || null;
}

function getMatchInnings(match) {
    if (!Array.isArray(match.innings)) {
        match.innings = [];
    }
    return match.innings;
}

function getCurrentInnings(match) {
    const innings = getMatchInnings(match);
    return innings.length ? innings[innings.length - 1] : null;
}

function getPlayerName(playerId) {
    const player = getPlayerById(playerId);
    return player ? player.name : "Unknown player";
}

function getTeamName(teamId, fallback) {
    const team = getTeamById(teamId);
    return team ? team.name : (fallback || "Unknown team");
}

function createEmptyInnings(match, battingTeamId, bowlingTeamId) {
    return {
        inningsNumber: getMatchInnings(match).length + 1,
        battingTeamId,
        bowlingTeamId,
        totalRuns: 0,
        wickets: 0,
        legalBalls: 0,
        extras: 0,
        strikerId: null,
        nonStrikerId: null,
        bowlerId: null,
        completed: false,
        deliveries: []
    };
}

function initializeMatchScore(match) {
    if (!match) return;

    match.totalRuns = 0;
    match.wickets = 0;
    match.legalBalls = 0;
    match.extras = 0;
    match.score = "0/0";
    match.scoreHistory = [];
    match.innings = [];
    match.status = "LIVE";
    match.summary = "Match started. Set up the first innings.";

    undoHistory = [];
    currentInnings = null;

    activeMatchId = match.id;
    renderScoringPanel();
}

function getOversText(legalBalls) {
    return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function getInningsOvers(match, innings) {
    return innings ? getOversText(innings.legalBalls) : "0.0";
}

function getTotalOvers(match) {
    return Number(match.overs) * 6;
}

function isInningsFinished(match, innings) {
    if (!innings || innings.completed) return true;

    return innings.wickets >= 10 ||
        innings.legalBalls >= getTotalOvers(match);
}

function updateMatchScore(match) {
    if (!match) return;

    const innings = getCurrentInnings(match);

    if (innings) {
        match.totalRuns = innings.totalRuns;
        match.wickets = innings.wickets;
        match.legalBalls = innings.legalBalls;
        match.extras = innings.extras;
        match.score = `${innings.totalRuns}/${innings.wickets}`;
    }

    renderScoringPanel();
}

function saveScoreHistory(match) {
    const innings = getCurrentInnings(match);

    undoHistory.push({
        match: JSON.parse(JSON.stringify(match)),
        inningsNumber: innings ? innings.inningsNumber : 0
    });

    if (undoHistory.length > 100) {
        undoHistory.shift();
    }
}

async function saveScoringData() {
    try {
        await persistTournamentData();
        return true;
    } catch (error) {
        console.error("Scoring save failed:", error);
        alert("Could not save the score. Please check your internet connection and try again.");
        return false;
    }
}

/* =========================================
   INNINGS SETUP
========================================= */

function getPlayerOptions(selectedId = "") {
    const players = getPlayers();

    if (!players.length) {
        return `<option value="">No registered players available</option>`;
    }

    return `
        <option value="">Select player</option>
        ${players.map(player => `
            <option value="${scoringEscape(player.id)}"
                ${player.id === selectedId ? "selected" : ""}>
                ${scoringEscape(player.name)}
            </option>
        `).join("")}
    `;
}

function renderInningsSetup(match) {
    const team1Id = match.team1Id;
    const team2Id = match.team2Id;

    return `
        <div class="admin-card">
            <h3>First Innings Setup</h3>
            <p>Select the batting team, two opening batsmen and the opening bowler.</p>

            <label>Batting Team</label>
            <select id="battingTeamSelect">
                <option value="${scoringEscape(team1Id)}">
                    ${scoringEscape(getTeamName(team1Id, match.team1))}
                </option>
                <option value="${scoringEscape(team2Id)}">
                    ${scoringEscape(getTeamName(team2Id, match.team2))}
                </option>
            </select>

            <label>Striker</label>
            <select id="openingStriker">${getPlayerOptions()}</select>

            <label>Non-striker</label>
            <select id="openingNonStriker">${getPlayerOptions()}</select>

            <label>Opening Bowler</label>
            <select id="openingBowler">${getPlayerOptions()}</select>

            <button class="btn-primary" onclick="confirmInningsSetup()">
                Confirm Innings Setup
            </button>
        </div>
    `;
}

async function confirmInningsSetup() {
    const match = getActiveMatch();
    if (!match) return;

    const battingTeamId = document.getElementById("battingTeamSelect")?.value;
    const strikerId = document.getElementById("openingStriker")?.value;
    const nonStrikerId = document.getElementById("openingNonStriker")?.value;
    const bowlerId = document.getElementById("openingBowler")?.value;

    if (!battingTeamId || !strikerId || !nonStrikerId || !bowlerId) {
        alert("Please select the batting team, both batsmen and the bowler.");
        return;
    }

    if (strikerId === nonStrikerId) {
        alert("Striker and non-striker must be different players.");
        return;
    }

    const bowlingTeamId = battingTeamId === match.team1Id
        ? match.team2Id
        : match.team1Id;

    const innings = createEmptyInnings(match, battingTeamId, bowlingTeamId);
    innings.strikerId = strikerId;
    innings.nonStrikerId = nonStrikerId;
    innings.bowlerId = bowlerId;

    getMatchInnings(match).push(innings);
    match.summary = "First innings in progress.";

    currentInnings = innings;

    await saveScoringData();
    renderScoringPanel();
}

/* =========================================
   SCORING VALIDATION
========================================= */

function canUpdateScore() {
    if (!isAdminLoggedIn) {
        alert("Please login as Admin.");
        return false;
    }

    const match = getActiveMatch();

    if (!match) {
        alert("There is no live match.");
        return false;
    }

    const innings = getCurrentInnings(match);

    if (!innings) {
        alert("Please complete the innings setup first.");
        return false;
    }

    if (isInningsFinished(match, innings)) {
        alert("This innings has finished.");
        return false;
    }

    if (!innings.strikerId || !innings.nonStrikerId || !innings.bowlerId) {
        alert("Please assign the striker, non-striker and bowler.");
        return false;
    }

    return true;
}

/* =========================================
   DELIVERY RECORDING
========================================= */

async function recordDelivery(details) {
    if (!canUpdateScore()) return;

    const match = getActiveMatch();
    const innings = getCurrentInnings(match);

    saveScoreHistory(match);

    const delivery = {
        id: generateUniqueId(),
        overNumber: Math.floor(innings.legalBalls / 6) + 1,
        ballNumber: (innings.legalBalls % 6) + 1,
        strikerId: innings.strikerId,
        nonStrikerId: innings.nonStrikerId,
        bowlerId: innings.bowlerId,
        batterRuns: details.batterRuns || 0,
        extras: details.extras || 0,
        totalRuns: details.totalRuns || 0,
        extraType: details.extraType || null,
        legal: details.legal !== false,
        wicket: details.wicket || null,
        timestamp: new Date().toISOString()
    };

    innings.deliveries.push(delivery);
    innings.totalRuns += delivery.totalRuns;
    innings.extras += delivery.extras;

    if (delivery.legal) {
        innings.legalBalls++;
    }

    if (delivery.wicket) {
        innings.wickets++;
        innings.strikerId = delivery.wicket.dismissedPlayerId === innings.strikerId
            ? null : innings.strikerId;
        innings.nonStrikerId = delivery.wicket.dismissedPlayerId === innings.nonStrikerId
            ? null : innings.nonStrikerId;
    } else if (delivery.legal && delivery.totalRuns % 2 === 1) {
        swapStrike(innings);
    }

    if (innings.legalBalls > 0 && innings.legalBalls % 6 === 0 && delivery.legal) {
        swapStrike(innings);
        innings.bowlerId = null;
    }

    match.summary = `${getTeamName(innings.battingTeamId)}: ${innings.totalRuns}/${innings.wickets}`;
    updateMatchScore(match);

    await saveScoringData();
    renderScoringPanel();
}

function swapStrike(innings) {
    const oldStriker = innings.strikerId;
    innings.strikerId = innings.nonStrikerId;
    innings.nonStrikerId = oldStriker;
}

async function addRuns(runs) {
    if (![0, 1, 2, 3, 4, 5, 6].includes(runs)) return;

    await recordDelivery({
        batterRuns: runs,
        totalRuns: runs,
        legal: true
    });
}

async function addWide() {
    if (!canUpdateScore()) return;

    const extraRuns = Number(prompt("Additional runs taken on the wide? Enter 0 if none:", "0"));

    if (!Number.isInteger(extraRuns) || extraRuns < 0) {
        alert("Enter a valid non-negative number.");
        return;
    }

    await recordDelivery({
        extras: 1 + extraRuns,
        totalRuns: 1 + extraRuns,
        extraType: "WIDE",
        legal: false
    });
}

async function addNoBall() {
    if (!canUpdateScore()) return;

    const batterRuns = Number(prompt("Runs scored by the batsman on this no-ball:", "0"));

    if (!Number.isInteger(batterRuns) || batterRuns < 0) {
        alert("Enter a valid non-negative number.");
        return;
    }

    await recordDelivery({
        batterRuns,
        extras: 1,
        totalRuns: 1 + batterRuns,
        extraType: "NO_BALL",
        legal: false
    });
}

/* =========================================
   WICKET AND INCOMING BATSMAN
========================================= */

function showWicketForm() {
    if (!canUpdateScore()) return;

    const form = document.getElementById("wicketForm");
    if (!form) return;

    form.style.display = "block";
}

function hideWicketForm() {
    const form = document.getElementById("wicketForm");
    if (form) form.style.display = "none";
}

async function confirmWicket() {
    if (!canUpdateScore()) return;

    const match = getActiveMatch();
    const innings = getCurrentInnings(match);

    const dismissalType = document.getElementById("dismissalType")?.value;
    const dismissedPlayerId = document.getElementById("dismissedPlayer")?.value;
    const incomingPlayerId = document.getElementById("incomingPlayer")?.value;
    const runsTaken = Number(document.getElementById("wicketRuns")?.value || 0);

    if (!dismissedPlayerId || !dismissalType) {
        alert("Select the dismissal type and dismissed player.");
        return;
    }

    if (!Number.isInteger(runsTaken) || runsTaken < 0) {
        alert("Enter a valid number of runs.");
        return;
    }

    if (dismissalType !== "RUN_OUT" && runsTaken !== 0) {
        alert("For this first version, record runs taken only for a run-out.");
        return;
    }

    const remainingWickets = innings.wickets + 1;

    if (remainingWickets < 10 && !incomingPlayerId) {
        alert("Please manually select the incoming batsman.");
        return;
    }

    if (incomingPlayerId &&
        (incomingPlayerId === innings.strikerId ||
         incomingPlayerId === innings.nonStrikerId)) {
        alert("Incoming batsman must be a different player.");
        return;
    }

    const wicket = {
        type: dismissalType,
        dismissedPlayerId,
        runsTaken,
        incomingPlayerId
    };

    await recordWicketDelivery(wicket, runsTaken);
}

async function recordWicketDelivery(wicket, runsTaken) {
    const match = getActiveMatch();
    const innings = getCurrentInnings(match);

    saveScoreHistory(match);

    const delivery = {
        id: generateUniqueId(),
        overNumber: Math.floor(innings.legalBalls / 6) + 1,
        ballNumber: (innings.legalBalls % 6) + 1,
        strikerId: innings.strikerId,
        nonStrikerId: innings.nonStrikerId,
        bowlerId: innings.bowlerId,
        batterRuns: runsTaken,
        extras: 0,
        totalRuns: runsTaken,
        extraType: null,
        legal: true,
        wicket,
        timestamp: new Date().toISOString()
    };

    innings.deliveries.push(delivery);
    innings.totalRuns += runsTaken;
    innings.wickets++;
    innings.legalBalls++;

    if (wicket.dismissedPlayerId === innings.strikerId) {
        innings.strikerId = null;
    } else if (wicket.dismissedPlayerId === innings.nonStrikerId) {
        innings.nonStrikerId = null;
    } else {
        alert("The selected dismissed player is not currently batting.");
        undoHistory.pop();
        innings.deliveries.pop();
        innings.totalRuns -= runsTaken;
        innings.wickets--;
        innings.legalBalls--;
        return;
    }

    if (innings.wickets < 10) {
        if (innings.strikerId === null) {
            innings.strikerId = wicket.incomingPlayerId;
        } else {
            innings.nonStrikerId = wicket.incomingPlayerId;
        }
    }

    if (innings.legalBalls % 6 === 0) {
        swapStrike(innings);
        innings.bowlerId = null;
    }

    match.summary = `${getTeamName(innings.battingTeamId)}: ${innings.totalRuns}/${innings.wickets}`;

    hideWicketForm();
    await saveScoringData();
    renderScoringPanel();
}

/* =========================================
   PLAYER / BOWLER CHANGE
========================================= */

async function changeStriker() {
    const match = getActiveMatch();
    const innings = match && getCurrentInnings(match);
    if (!innings) return;

    const playerId = prompt("Enter the ID of the new striker:");
    if (!playerId || !getPlayerById(playerId)) {
        alert("Player not found.");
        return;
    }

    if (playerId === innings.nonStrikerId) {
        alert("Striker and non-striker cannot be the same player.");
        return;
    }

    innings.strikerId = playerId;
    await saveScoringData();
    renderScoringPanel();
}

async function changeBowler() {
    const match = getActiveMatch();
    const innings = match && getCurrentInnings(match);
    if (!innings) return;

    const playerId = prompt("Enter the ID of the new bowler:");
    if (!playerId || !getPlayerById(playerId)) {
        alert("Player not found.");
        return;
    }

    innings.bowlerId = playerId;
    await saveScoringData();
    renderScoringPanel();
}

/* =========================================
   BALL-BY-BALL COMMENTARY
========================================= */

function getDeliveryDescription(delivery) {
    if (delivery.wicket) {
        return `WICKET! ${getPlayerName(delivery.wicket.dismissedPlayerId)} - ${delivery.wicket.type.replace("_", " ")}`;
    }

    if (delivery.extraType === "WIDE") {
        return `Wide - ${delivery.totalRuns} run(s)`;
    }

    if (delivery.extraType === "NO_BALL") {
        return `No-ball - ${delivery.totalRuns} run(s)`;
    }

    if (delivery.batterRuns === 0) return "Dot ball";
    if (delivery.batterRuns === 4) return "FOUR!";
    if (delivery.batterRuns === 6) return "SIX!";

    return `${delivery.batterRuns} run(s)`;
}

function renderBallByBall(innings) {
    if (!innings || !innings.deliveries.length) {
        return "<p>No deliveries recorded yet.</p>";
    }

    return `
        <div class="ball-by-ball-list">
            ${innings.deliveries.slice().reverse().map(delivery => `
                <div class="ball-item">
                    <strong>${delivery.overNumber}.${delivery.ballNumber}</strong>
                    <span>${scoringEscape(getDeliveryDescription(delivery))}</span>
                    <small>
                        ${scoringEscape(getPlayerName(delivery.strikerId))}
                        vs
                        ${scoringEscape(getPlayerName(delivery.bowlerId))}
                    </small>
                </div>
            `).join("")}
        </div>
    `;
}

/* =========================================
   UNDO
========================================= */

async function undoLastAction() {
    if (!isAdminLoggedIn) {
        alert("Please login as Admin.");
        return;
    }

    if (!undoHistory.length) {
        alert("There is no action to undo in this session.");
        return;
    }

    if (!confirm("Undo the last scoring action?")) return;

    const previous = undoHistory.pop();
    const index = tournamentMatches.findIndex(match => match.id === activeMatchId);

    if (index === -1) return;

    tournamentMatches[index] = previous.match;

    await saveScoringData();
    renderScoringPanel();
}

/* =========================================
   SCORING PANEL
========================================= */

function renderScoringPanel() {
    const container = document.getElementById("adminContent");
    if (!container) return;

    const match = getActiveMatch();

    if (!match) {
        container.innerHTML = `
            <div class="admin-card">
                <h3>No Live Match</h3>
                <p>Start a scheduled match to begin scoring.</p>
            </div>
        `;
        return;
    }

    const innings = getCurrentInnings(match);

    if (!innings) {
        container.innerHTML = `
            <h2>Live Scoring</h2>
            <div class="admin-card">
                <h3>${scoringEscape(match.team1)} vs ${scoringEscape(match.team2)}</h3>
                <p>${match.overs} overs</p>
                ${renderInningsSetup(match)}
            </div>
        `;
        return;
    }

    const battingTeam = getTeamName(innings.battingTeamId);
    const bowlingTeam = getTeamName(innings.bowlingTeamId);
    const finished = isInningsFinished(match, innings);

    container.innerHTML = `
        <h2>Live Scoring</h2>

        <div class="admin-card">
            <h3>${scoringEscape(battingTeam)} vs ${scoringEscape(bowlingTeam)}</h3>
            <div class="score-display">
                <strong>${innings.totalRuns}/${innings.wickets}</strong>
                <span>Overs: ${getInningsOvers(match, innings)} / ${match.overs}</span>
            </div>

            <p>Striker: <strong>${scoringEscape(getPlayerName(innings.strikerId))}</strong></p>
            <p>Non-striker: <strong>${scoringEscape(getPlayerName(innings.nonStrikerId))}</strong></p>
            <p>Bowler: <strong>${scoringEscape(getPlayerName(innings.bowlerId))}</strong></p>

            <div class="scoring-controls">
                <h3>Runs</h3>
                ${[0, 1, 2, 3, 4, 5, 6].map(run => `
                    <button class="btn-primary" onclick="addRuns(${run})" ${finished ? "disabled" : ""}>
                        ${run}
                    </button>
                `).join("")}

                <h3>Extras</h3>
                <button class="btn-secondary" onclick="addWide()" ${finished ? "disabled" : ""}>Wide +1</button>
                <button class="btn-secondary" onclick="addNoBall()" ${finished ? "disabled" : ""}>No-ball +1</button>

                <h3>Wicket</h3>
                <button class="btn-danger" onclick="showWicketForm()" ${finished ? "disabled" : ""}>Wicket</button>

                <div id="wicketForm" class="admin-card" style="display:none;">
                    <h3>Wicket Details</h3>

                    <label>Dismissal Type</label>
                    <select id="dismissalType">
                        <option value="BOWLED">Bowled</option>
                        <option value="CAUGHT">Caught</option>
                        <option value="LBW">LBW</option>
                        <option value="RUN_OUT">Run out</option>
                        <option value="STUMPED">Stumped</option>
                        <option value="HIT_WICKET">Hit wicket</option>
                        <option value="OTHER">Other</option>
                    </select>

                    <label>Who was dismissed?</label>
                    <select id="dismissedPlayer">
                        <option value="${scoringEscape(innings.strikerId)}">
                            ${scoringEscape(getPlayerName(innings.strikerId))} (Striker)
                        </option>
                        <option value="${scoringEscape(innings.nonStrikerId)}">
                            ${scoringEscape(getPlayerName(innings.nonStrikerId))} (Non-striker)
                        </option>
                    </select>

                    <label>Runs taken (for run-out)</label>
                    <input type="number" id="wicketRuns" min="0" value="0">

                    <label>Incoming Batsman</label>
                    <select id="incomingPlayer">
                        ${getPlayerOptions()}
                    </select>

                    <button class="btn-primary" onclick="confirmWicket()">Confirm Wicket</button>
                    <button class="btn-secondary" onclick="hideWicketForm()">Cancel</button>
                </div>
            </div>

            <div class="scoring-controls">
                <h3>Player Changes</h3>
                <button class="btn-secondary" onclick="changeStriker()">Change Striker</button>
                <button class="btn-secondary" onclick="changeBowler()">Select Bowler</button>
                <button class="btn-secondary" onclick="undoLastAction()">Undo Last Action</button>
            </div>

            ${finished ? "<p><strong>Innings limit reached. Innings transition will be added next.</strong></p>" : ""}
        </div>

        <div class="admin-card">
            <h3>Ball-by-Ball</h3>
            ${renderBallByBall(innings)}
        </div>
    `;
}
