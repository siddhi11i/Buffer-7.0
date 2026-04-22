# 🌱 Smart Waste Routing & Optimization AI
**Team:** `Ctrl+Alt+Defeat` | **Domain:** `GreenTech`

![GreenTech](https://img.shields.io/badge/Domain-GreenTech-10b981?style=for-the-badge&logo=plant)
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Algorithms & DSA](https://img.shields.io/badge/Focus-DSA_%26_Algorithms-3b82f6?style=for-the-badge)

A highly optimized, Data Structures & Algorithms (DSA) driven web application designed to solve chaotic waste collection infrastructure. We treat decentralized waste pickup as a dynamically expanding **Travelling Salesman Problem (TSP)**, organizing efficient truck routes to minimize fuel consumption, driver time, and carbon emissions.

---

## 🎯 The Problem
Standard waste collection uses static routes. As cities grow, random accumulation sites and requested bulk pick-ups disrupt these paths, resulting in inefficient zig-zagging, massive emissions footprints, and wasted resources. 

## 🚀 The Solution
Our solution bridges pure mathematical graph algorithms with Real-World Navigation logic. 
By utilizing a **role-based distributed system**, residents queue pick-up requests which act as individual **Graph Nodes**. When a driver initiates a route, the AI backend dynamically assigns edge-weights based on geospatial boundaries, chooses the best optimization algorithm based on mathematical feasibility bounds, and then maps the theoretical path to real-world road networks.

---

## 👥 Role Management System

### 1. The Resident Role
- Submits bulk-waste or overflowing bin coordinates to the central database.
- Anchors locations easily using HTML5 Live Geolocation or by dropping a pin on an interactive map.

### 2. The Driver Role
- Operates the Central Dashboard, visualizing all unassigned, active waste coordinates in the immediate network.
- Declares the Truck's origin "Depot" marker.
- Triggers the **Analyze & Render Route** function, initiating algorithmic sorting followed by Turn-by-Turn GPS navigation overlapping the physical road mapping via Leaflet.

---

## 🧠 Core DSA Architecture

Algorithms were entirely custom-written in Node.js to prioritize processing speed and logic evaluation.

### 1. Distance Calculation (Edge Weights)
We use the **Haversine Formula** over traditional euclidean distances coordinate mapping. This accurately computes the "as the crow flies" straight-line distance across the Earth's curvature in **$O(1)$** time per edge calculation. By mapping all nodes against each other, we construct a Complete Adjacency Graph in **$O(V^2)$**.

### 2. The AI Toggle: Balancing Complexity
Because computing TSP is notoriously heavy, our optimization endpoint automatically toggles behaviors depending on Graph size ($N$):

*   🟢 **When N ≤ 15 (Dynamic Programming TSP)**
    *   *Implementation:* Recursive DP combined with Bitmasking.
    *   *Why:* Subproblems overlapping in $O(V!)$ permutations are constrained and memoized.
    *   *Complexity:* **$Time: O(V^2 \cdot 2^V)$** | **$Space: O(V \cdot 2^V)$**
    *   *Result:* The engine resolves the mathematically absolute shortest path globally prior to sending coordinates back to the UI.

*   🟡 **When N > 15 (Nearest Neighbor Heuristic)**
    *   *Implementation:* A Greedy search matrix.
    *   *Why:* At $N > 15$, state-space explosion crashes node servers. The AI recognizes this threshold and switches to the greedy approach to protect thread blocking memory.
    *   *Complexity:* **$Time: O(V^2)$** | **$Space: O(V)$**
    *   *Result:* Extremely fast resolving time ($<2ms$) with minimal global distance compromises. 

---

## ⚙️ How to Run Locally

1. **Clone & Boot**
```bash
git clone https://github.com/your-repo/smart-waste-routing.git
cd smart-waste-routing
npm install
node server.js
```
2. **Launch Application**
Open `http://localhost:3000` in your browser.

*Pro-Tip for testing: Open two tabs! Use Tab 1 as a "Resident" to deploy 5 pins across the map. Use Tab 2 as the "Driver" to pull those pins and trace the optimal roadmap.* 
