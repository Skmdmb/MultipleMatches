
// ============================================
// CRICKET TOURNAMENT - API CONNECTION
// ============================================

const API_URL = "https://api.npoint.io/251259003781a5d9f5cd";


// ============================================
// 1. LOAD TOURNAMENT DATA
// ============================================

async function getTournamentData() {

    try {

        const response = await fetch(API_URL, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`Unable to load data. HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Invalid tournament data received.");
        }

        console.log("Tournament data loaded successfully.");

        return data;

    } catch (error) {

        console.error("GET API Error:", error);

        throw new Error(`Could not load tournament data: ${error.message}`);
    }
}


// ============================================
// 2. SAVE TOURNAMENT DATA
// ============================================

async function saveTournamentData(data) {

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Invalid tournament data. Save cancelled.");
    }

    const dataToSave = {
        ...data,
        updatedAt: new Date().toISOString()
    };

    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(dataToSave)

        });

        if (!response.ok) {

            const errorText = await response.text();

            throw new Error(
                `Save failed. HTTP ${response.status}. ${errorText}`
            );
        }

        console.log("Tournament data saved successfully.");

        return true;

    } catch (error) {

        console.error("POST API Error:", error);

        throw new Error(`Could not save tournament data: ${error.message}`);
    }
}


// ============================================
// 3. TEST API CONNECTION
// ============================================

async function testAPIConnection() {

    try {

        await getTournamentData();

        console.log("API GET connection successful.");

        return true;

    } catch (error) {

        console.error("API connection test failed:", error);

        return false;
    }
}
