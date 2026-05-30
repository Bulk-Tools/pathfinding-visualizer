import { GridNode, Step } from './types';

// Helper to calculate Manhattan distance heuristic for A*
const heuristic = (node: GridNode, endNode: GridNode) => 
  Math.abs(node.row - endNode.row) + Math.abs(node.col - endNode.col);

const getNeighbors = (node: GridNode, grid: GridNode[][]) => {
  const neighbors = [];
  const { row, col } = node;
  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);
  return neighbors;
};

// 1. DIJKSTRA'S ALGORITHM
export function* dijkstra(grid: GridNode[][], start: GridNode, end: GridNode): Generator<Step> {
  const unvisitedNodes: GridNode[] = [];
  grid.forEach(row => row.forEach(node => unvisitedNodes.push(node)));
  
  start.distance = 0;
  let exploredCount = 0;

  while (unvisitedNodes.length) {
    unvisitedNodes.sort((a, b) => a.distance - b.distance);
    const closestNode = unvisitedNodes.shift()!;

    if (closestNode.type === 'wall') continue;
    if (closestNode.distance === Infinity) break; // Trapped

    closestNode.isVisited = true;
    exploredCount++;
    if (closestNode !== start && closestNode !== end) {
      yield { type: 'visit', node: closestNode, exploredCount };
    }

    if (closestNode === end) {
      yield { type: 'path', path: getPath(end), distance: end.distance };
      return;
    }

    for (const neighbor of getNeighbors(closestNode, grid)) {
      if (!neighbor.isVisited && neighbor.type !== 'wall') {
        const weight = neighbor.type === 'heavy' ? 5 : 1;
        if (closestNode.distance + weight < neighbor.distance) {
          neighbor.distance = closestNode.distance + weight;
          neighbor.previousNode = closestNode;
        }
      }
    }
  }
}

// 2. A* SEARCH
export function* aStar(grid: GridNode[][], start: GridNode, end: GridNode): Generator<Step> {
  const openSet: GridNode[] = [start];
  start.g = 0;
  start.f = heuristic(start, end);
  let exploredCount = 0;

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.type === 'wall') continue;

    current.isVisited = true;
    exploredCount++;
    if (current !== start && current !== end) {
      yield { type: 'visit', node: current, exploredCount };
    }

    if (current === end) {
      yield { type: 'path', path: getPath(end), distance: end.g };
      return;
    }

    for (const neighbor of getNeighbors(current, grid)) {
      if (neighbor.type === 'wall' || neighbor.isVisited) continue;
      
      const weight = neighbor.type === 'heavy' ? 5 : 1;
      const tentativeG = current.g + weight;

      if (tentativeG < neighbor.g) {
        neighbor.previousNode = current;
        neighbor.g = tentativeG;
        neighbor.f = neighbor.g + heuristic(neighbor, end);
        if (!openSet.includes(neighbor)) openSet.push(neighbor);
      }
    }
  }
}

// 3. BREADTH-FIRST SEARCH (BFS)
export function* bfs(grid: GridNode[][], start: GridNode, end: GridNode): Generator<Step> {
  const queue: GridNode[] = [start];
  start.isVisited = true;
  let exploredCount = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.type === 'wall') continue;

    exploredCount++;
    if (current !== start && current !== end) {
      yield { type: 'visit', node: current, exploredCount };
    }

    if (current === end) {
      yield { type: 'path', path: getPath(end), distance: exploredCount };
      return;
    }

    for (const neighbor of getNeighbors(current, grid)) {
      if (!neighbor.isVisited && neighbor.type !== 'wall') {
        neighbor.isVisited = true;
        neighbor.previousNode = current;
        queue.push(neighbor);
      }
    }
  }
}

// 4. BIDIRECTIONAL SEARCH
export function* bidirectional(grid: GridNode[][], start: GridNode, end: GridNode): Generator<Step> {
  const queueA: GridNode[] = [start];
  const queueB: GridNode[] = [end];
  
  const parentA = new Map<string, GridNode | null>();
  const parentB = new Map<string, GridNode | null>();
  
  parentA.set(`${start.row},${start.col}`, null);
  parentB.set(`${end.row},${end.col}`, null);
  
  let exploredCount = 0;

  while (queueA.length > 0 && queueB.length > 0) {
    // Frontier A
    const currA = queueA.shift()!;
    exploredCount++;
    if (currA !== start && currA !== end) yield { type: 'visit', node: currA, exploredCount };

    if (parentB.has(`${currA.row},${currA.col}`)) {
      yield { type: 'path', path: buildBiPath(currA, parentA, parentB), distance: exploredCount };
      return;
    }

    for (const n of getNeighbors(currA, grid)) {
      if (n.type !== 'wall' && !parentA.has(`${n.row},${n.col}`)) {
        parentA.set(`${n.row},${n.col}`, currA);
        queueA.push(n);
      }
    }

    // Frontier B
    const currB = queueB.shift()!;
    exploredCount++;
    if (currB !== start && currB !== end) yield { type: 'visit', node: currB, exploredCount };

    if (parentA.has(`${currB.row},${currB.col}`)) {
      yield { type: 'path', path: buildBiPath(currB, parentA, parentB), distance: exploredCount };
      return;
    }

    for (const n of getNeighbors(currB, grid)) {
      if (n.type !== 'wall' && !parentB.has(`${n.row},${n.col}`)) {
        parentB.set(`${n.row},${n.col}`, currB);
        queueB.push(n);
      }
    }
  }
}

// Helpers
function getPath(endNode: GridNode): GridNode[] {
  const path = [];
  let curr: GridNode | null = endNode;
  while (curr !== null) {
    path.push(curr);
    curr = curr.previousNode;
  }
  return path.reverse();
}

function buildBiPath(meetNode: GridNode, parentA: Map<string, GridNode|null>, parentB: Map<string, GridNode|null>) {
  const path = [];
  let curr: GridNode | null | undefined = meetNode;
  while (curr) { path.push(curr); curr = parentA.get(`${curr.row},${curr.col}`); }
  path.reverse();
  
  curr = parentB.get(`${meetNode.row},${meetNode.col}`);
  while (curr) { path.push(curr); curr = parentB.get(`${curr.row},${curr.col}`); }
  return path;
}
