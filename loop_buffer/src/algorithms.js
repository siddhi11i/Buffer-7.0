/**
 * DSA Module for Graph Traversal and Optimization
 * Problem: Simplified Travelling Salesman Problem (TSP) for Waste Collection
 * 
 * Includes:
 * 1. Haversine Formula for Distance Calculation (Edge Weights)
 * 2. Greedy Nearest Neighbor (O(V^2))
 * 3. Dynamic Programming with Bitmask for TSP (O(V^2 * 2^V))
 */

// 1. Distance Calculation (Haversine Formula) O(1)
function calculateDistance(node1, node2) {
    const toRad = x => (x * Math.PI) / 180;
    const R = 6371; // Earth's radius in km

    const dLat = toRad(node2.lat - node1.lat);
    const dLon = toRad(node2.lng - node1.lng);
    const lat1 = toRad(node1.lat);
    const lat2 = toRad(node2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Helper: Build Graph Adjacency / Distance Matrix
function buildDistanceMatrix(bins) {
    const n = bins.length;
    const distMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                distMatrix[i][j] = calculateDistance(bins[i], bins[j]);
            }
        }
    }
    return distMatrix;
}

// 2. Greedy Approach: Nearest Neighbor 
// Time Complexity: O(V^2) where V is number of bins
// Space Complexity: O(V) for visited set/array
function nearestNeighbor(bins) {
    const n = bins.length;
    if (n === 0) return { path: [], distance: 0, executionTime: 0 };

    const start = process.hrtime.bigint();
    const distMatrix = buildDistanceMatrix(bins);
    
    let current = 0; // Start at depot (index 0)
    const visited = new Set([0]);
    const route = [bins[0]];
    let totalDistance = 0;

    // Traverse unvisited nodes
    while (visited.size < n) {
        let nearestDist = Infinity;
        let nearestIdx = -1;

        for (let i = 0; i < n; i++) {
            if (!visited.has(i) && distMatrix[current][i] < nearestDist) {
                nearestDist = distMatrix[current][i];
                nearestIdx = i;
            }
        }

        visited.add(nearestIdx);
        route.push(bins[nearestIdx]);
        totalDistance += nearestDist;
        current = nearestIdx;
    }

    // Return to depot to complete the cycle
    totalDistance += distMatrix[current][0];
    route.push(bins[0]);

    const end = process.hrtime.bigint();
    const executionTimeMs = Number(end - start) / 1e6; // Convert to milliseconds

    return {
        route,
        distance: totalDistance,
        executionTime: executionTimeMs,
        timeComplexity: 'O(V²)',
        spaceComplexity: 'O(V)'
    };
}

// 3. Optimal Approach: Dynamic Programming with Bitmask (TSP)
// Time Complexity: O(V^2 * 2^V)
// Space Complexity: O(V * 2^V) for DP memoization table
function optimalRouteDP(bins) {
    const n = bins.length;
    if (n === 0) return { route: [], distance: 0, executionTime: 0 };
    if (n > 20) {
        throw new Error("Dataset too large for optimal DP approach. Please use max 20 nodes.");
    }

    const start = process.hrtime.bigint();
    const distMatrix = buildDistanceMatrix(bins);
    
    const VISITED_ALL = (1 << n) - 1;
    // memo[mask][i] stores the minimum distance from node i to complete the cycle (all unvisited nodes + back to 0) given the visited set in `mask`
    const memo = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));
    const nextNode = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));
    
    // Recursive function with memoization
    function tsp(mask, pos) {
        if (mask === VISITED_ALL) {
            return distMatrix[pos][0]; // Return to depot
        }
        
        if (memo[mask][pos] !== -1) {
            return memo[mask][pos];
        }

        let ans = Infinity;
        let bestNext = -1;

        for (let city = 0; city < n; city++) {
            // If the city is unvisited
            if ((mask & (1 << city)) === 0) {
                const newCost = distMatrix[pos][city] + tsp(mask | (1 << city), city);
                if (newCost < ans) {
                    ans = newCost;
                    bestNext = city;
                }
            }
        }

        nextNode[mask][pos] = bestNext;
        return memo[mask][pos] = ans;
    }

    // Calculate minimum distance starting from depot (0) with only 0 visited
    const totalDistance = tsp(1, 0);

    // Reconstruct the optimal path
    const route = [bins[0]];
    let current_mask = 1;
    let current_pos = 0;
    
    while (current_mask !== VISITED_ALL) {
        const next_city = nextNode[current_mask][current_pos];
        if (next_city === -1) break; // Should not happen for a complete graph
        route.push(bins[next_city]);
        current_mask = current_mask | (1 << next_city);
        current_pos = next_city;
    }
    
    // Cycle back to depot
    route.push(bins[0]);

    const end = process.hrtime.bigint();
    const executionTimeMs = Number(end - start) / 1e6;

    return {
        route,
        distance: totalDistance,
        executionTime: executionTimeMs,
        timeComplexity: 'O(V² · 2^V)',
        spaceComplexity: 'O(V · 2^V)'
    };
}

module.exports = {
    calculateDistance,
    nearestNeighbor,
    optimalRouteDP,
    buildDistanceMatrix
};
