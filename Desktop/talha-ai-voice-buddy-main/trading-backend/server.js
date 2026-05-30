const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Express App
const app = express();
app.use(cors());
app.use(express.json());

// Dynamic import for SmartAPI due to older/newer syntax possibilities
let SmartAPI;
try {
    const smartApiPkg = require('smartapi-javascript');
    SmartAPI = smartApiPkg.SmartAPI;
} catch (err) {
    console.error("SmartAPI package not fully installed yet. Run npm i smartapi-javascript");
}

let smart_api = null;
if (SmartAPI) {
    smart_api = new SmartAPI({
        api_key: process.env.ANGEL_API_KEY
    });
}

let sessionToken = null;

// Endpoint to connect to Angel One
app.post('/api/angel/connect', async (req, res) => {
    try {
        if (!smart_api) {
            return res.status(500).json({ success: false, message: "SmartAPI module not loaded." });
        }

        if (!process.env.CLIENT_CODE || !process.env.CLIENT_PASSWORD || !process.env.TOTP) {
            return res.status(400).json({ 
                success: false, 
                message: "INCOMPLETE CREDENTIALS: You provided the API Key & Secret, but Angel One also requires CLIENT_CODE, CLIENT_PASSWORD, and TOTP. Please add them to trading-backend/.env." 
            });
        }

        const loginData = await smart_api.generateSession(
            process.env.CLIENT_CODE, 
            process.env.CLIENT_PASSWORD, 
            process.env.TOTP
        );
        
        if (loginData && loginData.status) {
            sessionToken = loginData.data.jwtToken;
            return res.json({ success: true, message: "Successfully connected to Angel One SmartAPI!" });
        } else {
            return res.status(401).json({ success: false, message: "Angel One Authentication failed. Check your Client Code, Password, or TOTP.", details: loginData });
        }
    } catch (error) {
        console.error("Angel One Connection Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// Endpoint to fetch AI Analysis (Mocked for now since live data needs proper login)
app.post('/api/angel/analyze', async (req, res) => {
    if(!sessionToken) {
        return res.status(401).json({ success: false, message: "Not connected. Please connect first." });
    }

    // A real implementation would fetch live quotes using smart_api.getLTPData() 
    // and run quantitative algorithms.
    res.json({
        success: true,
        signal: "STRONG BUY",
        asset: "NIFTY 50",
        confidence: "92%",
        entry: "CURRENT MARKET PRICE",
        target: "+45 Points",
        stopLoss: "-15 Points",
        reason: "Institutional order flow detected alongside options max pain divergence."
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n===========================================`);
    console.log(`🤖 TRADING AI BACKEND RUNNING ON PORT ${PORT}`);
    console.log(`===========================================\n`);
});
