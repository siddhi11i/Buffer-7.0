// --- Map Initialization ---
const map = L.map('map').setView([12.9716, 77.5946], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 20
}).addTo(map);

// --- Application State ---
let currentUser = null;
let selectedLocation = null; // Used as Bin for User, Depot for Driver
let networkPickups = []; // Exclusively for Driver
let markers = [];
let routeControl = null; // Leaflet Routing Machine instance
let isPinMode = false;

// Custom Icons
const depotIcon = L.divIcon({ html: '<div style="background:var(--success);width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(16,185,129,0.8)"></div>', className: '' });
const binIcon = L.divIcon({ html: '<div style="background:var(--primary);width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>', className: '' });
const userBinIcon = L.divIcon({ html: '<div style="background:var(--warning);width:16px;height:16px;border-radius:50%;border:2px solid white;"></div>', className: '' });

// --- DOM Elements ---
const loginOverlay = document.getElementById('login-overlay');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('usernameInput');
const roleInput = document.getElementById('roleInput');
const displayUsername = document.getElementById('displayUsername');
const roleSubtitle = document.getElementById('roleSubtitle');
const logoutBtn = document.getElementById('logoutBtn');
const sidebar = document.getElementById('sidebar');

const locLabel = document.getElementById('locLabel');
const locStatus = document.getElementById('locStatus');
const liveLocBtn = document.getElementById('liveLocBtn');
const pinLocBtn = document.getElementById('pinLocBtn');

const residentView = document.getElementById('resident-view');
const driverView = document.getElementById('driver-view');
const requestPickupBtn = document.getElementById('requestPickupBtn');
const refreshNetworkBtn = document.getElementById('refreshNetworkBtn');
const networkState = document.getElementById('networkState');
const optimizeBtn = document.getElementById('optimizeBtn');

const resultContainer = document.getElementById('resultContainer');
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');

// --- Auth Handling ---
function checkAuth() {
    const saved = localStorage.getItem('waste_auth');
    if (saved) {
        currentUser = JSON.parse(saved);
        activateDashboard();
    }
}

loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    if (!username) return;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, role: roleInput.value })
        });
        const data = await res.json();
        currentUser = data.user;
        localStorage.setItem('waste_auth', JSON.stringify(currentUser));
        activateDashboard();
    } catch(err) { console.error(err); }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('waste_auth');
    location.reload(); // Hard reset
});

function activateDashboard() {
    loginOverlay.style.display = 'none';
    displayUsername.textContent = currentUser.username;
    sidebar.classList.add('active');
    
    clearMap(true);

    if (currentUser.role === 'user') {
        roleSubtitle.textContent = 'Resident Mode';
        locLabel.textContent = '1. Identify Your Garbage location';
        residentView.style.display = 'block';
        driverView.style.display = 'none';
    } else {
        roleSubtitle.textContent = 'Driver Navigation Mode';
        locLabel.textContent = '1. Set Your Truck Start Depot';
        residentView.style.display = 'none';
        driverView.style.display = 'block';
        fetchNetworkPickups(); // Auto sync
    }
    
    // Default location view if nothing is set
    map.setView([12.9716, 77.5946], 13);
}

// --- Location Handling ---
function setLocation(lat, lng, desc) {
    selectedLocation = { lat, lng };
    locStatus.innerHTML = `<strong>Located:</strong> ${desc}<br><span style="color:#94a3b8;font-size:0.8rem">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>`;
    
    // Remove only main marker if exists
    if(markers.mainPin) map.removeLayer(markers.mainPin);

    // Differentiate marker icon based on role
    const icon = currentUser.role === 'driver' ? depotIcon : userBinIcon;
    const tooltipText = currentUser.role === 'driver' ? 'HQ/Depot' : 'Your Bin';

    markers.mainPin = L.marker([lat, lng], { icon }).addTo(map);
    markers.mainPin.bindTooltip(tooltipText, { permanent: true, direction: 'top' });
    map.setView([lat, lng], 14);
}

liveLocBtn.addEventListener('click', () => {
    locStatus.textContent = "Fetching GPS coordinates...";
    isPinMode = false; map.getContainer().style.cursor = 'grab';
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation(pos.coords.latitude, pos.coords.longitude, "Live GPS Location"),
            () => locStatus.textContent = "GPS Access Denied."
        );
    }
});

pinLocBtn.addEventListener('click', () => {
    isPinMode = true;
    locStatus.textContent = "Click anywhere on the map to set location.";
    map.getContainer().style.cursor = 'crosshair';
});

map.on('click', (e) => {
    if (isPinMode) {
        isPinMode = false; map.getContainer().style.cursor = 'grab';
        setLocation(e.latlng.lat, e.latlng.lng, "Manual Map Pin");
    }
});

function clearMap(full = false) {
    if(routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }
    if (full) {
        if(markers.mainPin) map.removeLayer(markers.mainPin);
        selectedLocation = null;
    }
    if(markers.bins) markers.bins.forEach(m => map.removeLayer(m));
    markers.bins = [];
    resultContainer.style.display = 'none';
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
}

// --- Resident Mode ---
requestPickupBtn.addEventListener('click', async () => {
    if (!selectedLocation) return showError("Set a location for your bin first.");
    
    try {
        requestPickupBtn.textContent = '⏳ Sending...';
        const res = await fetch('/api/request-pickup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                username: currentUser.username, 
                lat: selectedLocation.lat, 
                lng: selectedLocation.lng 
            })
        });
        const data = await res.json();
        if(data.success) {
            successMsg.style.display = 'block';
            setTimeout(() => successMsg.style.display = 'none', 3000);
        }
    } catch(err) { showError(err.message); }
    finally { requestPickupBtn.textContent = '📥 Send Pickup Request'; }
});


// --- Driver Mode ---
async function fetchNetworkPickups() {
    try {
        const res = await fetch('/api/pickups');
        const data = await res.json();
        networkPickups = data.pickups || [];
        
        networkState.textContent = `Pending Requests: ${networkPickups.length}`;
        
        // Draw them on map
        if(markers.bins) markers.bins.forEach(m => map.removeLayer(m));
        markers.bins = [];
        
        networkPickups.forEach(bin => {
            const m = L.marker([bin.lat, bin.lng], { icon: binIcon }).addTo(map);
            m.bindTooltip(`${bin.name}'s Bin`, { permanent: false });
            markers.bins.push(m);
        });

    } catch(err) { console.error("Sync failed", err); }
}

refreshNetworkBtn.addEventListener('click', fetchNetworkPickups);


optimizeBtn.addEventListener('click', async () => {
    if (!selectedLocation) return showError("Driver must set Startup Depot location.");
    if (networkPickups.length === 0) return showError("No pickups in network.");

    try {
        optimizeBtn.textContent = '🚀 Analyzing Graph...';
        optimizeBtn.disabled = true;
        errorMsg.style.display = 'none';
        
        if(routeControl) { map.removeControl(routeControl); routeControl = null; }

        // Construct graph payload: [Depot, ...Pickups]
        const graphPayload = [
            { id: 'depot_0', name: 'HQ', lat: selectedLocation.lat, lng: selectedLocation.lng, isDepot: true },
            ...networkPickups
        ];

        // Step 1: Algorithmic Routing (DSA Backend over Haversine Graph)
        const response = await fetch('/api/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bins: graphPayload })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        const { result, algorithmUsed, reasoning } = data;
        const orderedSequence = result.route;

        // Step 2: Render Real-World Directions using Leaflet Routing
        optimizeBtn.textContent = '🗺️ Mapping Streets...';
        
        const waypoints = orderedSequence.map(node => L.latLng(node.lat, node.lng));

        routeControl = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: false,
            showAlternatives: false,
            addWaypoints: false, // Prevent driver from ruining algorithm
            lineOptions: { styles: [{ color: '#3b82f6', opacity: 0.9, weight: 6 }] },
            createMarker: () => null // We handle markers ourselves
        }).addTo(map);

        // UI Diagnostics update
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `
            <h3>DSA Optimization Log</h3>
            <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 15px;">
                ${reasoning}
            </p>
            <div class="stat"><span>Graph Nodes:</span> <span class="badge">${orderedSequence.length-1}</span></div>
            <div class="stat"><span>Algorithm:</span> <span>${algorithmUsed}</span></div>
            <div class="stat"><span>Sequence Calculated:</span> <span style="color:var(--success)">${result.executionTime.toFixed(4)} ms</span></div>
        `;

    } catch (err) {
        showError(err.message);
    } finally {
        optimizeBtn.textContent = '🚀 Analyze & Render Route';
        optimizeBtn.disabled = false;
    }
});

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
}

checkAuth();
