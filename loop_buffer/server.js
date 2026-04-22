const express = require('express');
const cors = require('cors');
const path = require('path');
const { nearestNeighbor, optimalRouteDP } = require('./src/algorithms');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory storage 
const users = {};
let globalPickups = []; 
let pickupCounter = 1;

// Auth endpoint
app.post('/api/login', (req, res) => {
    const { username, role } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    
    if (!users[username]) {
        users[username] = { username, role };
    } else {
        // Update role if changed
        users[username].role = role;
    }
    res.json({ user: users[username] });
});

// Endpoint for Users to submit a pickup request
app.post('/api/request-pickup', (req, res) => {
    const { username, lat, lng } = req.body;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Location required' });
    }

    const newBin = {
        id: `bin_${pickupCounter++}`,
        name: username || 'Unknown',
        lat,
        lng,
        isDepot: false,
        timestamp: new Date().toISOString()
    };
    
    globalPickups.push(newBin);
    res.json({ success: true, bin: newBin, activePickups: globalPickups.length });
});

// Endpoint for Drivers to get all pickups
app.get('/api/pickups', (req, res) => {
    res.json({ pickups: globalPickups });
});

// Endpoint to dynamically optimize path
app.post('/api/optimize', (req, res) => {
    try {
        const { bins } = req.body; // Driver sends [depot, ...all_pickups]

        if (!bins || !Array.isArray(bins) || bins.length < 2) {
            return res.status(400).json({ error: 'Not enough nodes to optimize.' });
        }

        let result;
        let algorithmUsed;
        let reasoning;
        
        const DP_THRESHOLD = 15;

        // Our DSA algorithms do the heavy lifting of sorting the waypoints optimally
        if (bins.length <= DP_THRESHOLD) {
            result = optimalRouteDP(bins);
            algorithmUsed = 'Dynamic Programming (TSP)';
            reasoning = `Graph size (N=${bins.length}) is ≤ 15. The system selected DP Bitmasking to calculate the absolute shortest visit sequence in O(V²·2^V) time.`;
        } else {
            result = nearestNeighbor(bins);
            algorithmUsed = 'Greedy NN (Nearest Neighbor)';
            reasoning = `Graph size (N=${bins.length}) exceeds DP limit. The system selected the Greedy heuristic to organize the sequence in ultra-fast O(V²) time.`;
        }

        res.json({ result, algorithmUsed, reasoning });

    } catch (error) {
        console.error('Optimization error:', error);
        res.status(500).json({ error: error.message || 'Internal server error.' });
    }
});

// Optional: Admin endpoint to clear picks
app.post('/api/clear-pickups', (req, res) => {
    globalPickups = [];
    pickupCounter = 1;
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Smart Waste Collection System initialized with Role capabilities.`);
});
