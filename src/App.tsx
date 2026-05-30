import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, RefreshCw, X, Shuffle, ArrowRight, MousePointerClick } from 'lucide-react';
import { GridNode, NodeType } from './types';
import { dijkstra, aStar, bfs, bidirectional } from './algorithms';

const ROWS = 20;
const COLS = 45;

const algos = {
  dijkstra: { name: "Dijkstra's", func: dijkstra },
  astar: { name: "A* Search", func: aStar },
  bfs: { name: "Breadth-First (BFS)", func: bfs },
  bidirectional: { name: "Bidirectional", func: bidirectional },
};

const speedMap = { Slow: 100, Normal: 25, Fast: 5, Instant: 0 };

export default function App() {
  const [grid, setGrid] = useState<GridNode[][]>([]);
  const [algo, setAlgo] = useState<keyof typeof algos>('dijkstra');
  const [speed, setSpeed] = useState<keyof typeof speedMap>('Fast');
  const [drawMode, setDrawMode] = useState<'wall' | 'heavy'>('wall');
  
  const [startPos, setStartPos] = useState({ r: 9, c: 8 });
  const [targetPos, setTargetPos] = useState({ r: 9, c: 36 });
  
  const [isDragging, setIsDragging] = useState<'start' | 'target' | 'wall' | 'heavy' | null>(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [stats, setStats] = useState({ explored: 0, distance: 0 });

  // Initialize Grid
  useEffect(() => {
    initializeGrid();
  }, []);

  const initializeGrid = (clearAll = true) => {
    const initialGrid: GridNode[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: GridNode[] = [];
      for (let c = 0; c < COLS; c++) {
        let type: NodeType = 'empty';
        if (r === startPos.r && c === startPos.c) type = 'start';
        else if (r === targetPos.r && c === targetPos.c) type = 'target';
        
        row.push({
          row: r, col: c, type, isVisited: false, distance: Infinity, previousNode: null, f: Infinity, g: Infinity, h: 0
        });
      }
      initialGrid.push(row);
    }
    if (!clearAll && grid.length) {
      // Preserve existing walls/heavy nodes if not full clear
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c].type === 'wall' || grid[r][c].type === 'heavy') {
            initialGrid[r][c].type = grid[r][c].type;
          }
        }
      }
    }
    setGrid(initialGrid);
    clearPathStyles();
    setStats({ explored: 0, distance: 0 });
  };

  const clearPathStyles = () => {
    document.querySelectorAll('.node-visited, .node-path').forEach(el => {
      el.classList.remove('node-visited', 'node-path');
    });
    setStats({ explored: 0, distance: 0 });
  };

  const handleMouseDown = (r: number, c: number) => {
    if (isVisualizing) return;
    const node = grid[r][c];
    if (node.type === 'start') setIsDragging('start');
    else if (node.type === 'target') setIsDragging('target');
    else {
      setIsDragging(drawMode);
      toggleDrawNode(r, c);
    }
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!isDragging || isVisualizing) return;
    if (isDragging === 'start') {
      updateGridType(startPos.r, startPos.c, 'empty');
      updateGridType(r, c, 'start');
      setStartPos({ r, c });
    } else if (isDragging === 'target') {
      updateGridType(targetPos.r, targetPos.c, 'empty');
      updateGridType(r, c, 'target');
      setTargetPos({ r, c });
    } else {
      toggleDrawNode(r, c);
    }
  };

  const updateGridType = (r: number, c: number, type: NodeType) => {
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[r][c] = { ...newGrid[r][c], type };
      return newGrid;
    });
  };

  const toggleDrawNode = (r: number, c: number) => {
    if (r === startPos.r && c === startPos.c) return;
    if (r === targetPos.r && c === targetPos.c) return;
    updateGridType(r, c, grid[r][c].type === drawMode ? 'empty' : drawMode);
  };

  const generateMaze = () => {
    if (isVisualizing) return;
    initializeGrid();
    setGrid(prev => {
      const g = prev.map(row => row.map(node => ({ ...node })));
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (g[r][c].type === 'empty' && Math.random() < 0.28) {
            g[r][c].type = 'wall';
          }
        }
      }
      return g;
    });
  };

  // The core animation loop consuming the Generator function
  const visualize = () => {
    if (isVisualizing) return;
    setIsVisualizing(true);
    clearPathStyles();

    // Reset purely algorithmic state properties
    const processingGrid = grid.map(row => row.map(n => ({
      ...n, isVisited: false, distance: Infinity, previousNode: null, f: Infinity, g: Infinity, h: 0
    })));

    const startNode = processingGrid[startPos.r][startPos.c];
    const targetNode = processingGrid[targetPos.r][targetPos.c];
    
    const generator = algos[algo].func(processingGrid, startNode, targetNode);
    let isDone = false;

    const runStep = () => {
      if (isDone) return;
      const { value, done } = generator.next();

      if (done) {
        setIsVisualizing(false);
        return;
      }

      if (value.type === 'visit') {
        const el = document.getElementById(`node-${value.node.row}-${value.node.col}`);
        if (el) el.classList.add('node-visited');
        setStats(s => ({ ...s, explored: value.exploredCount }));

        const delay = speedMap[speed];
        if (delay === 0) runStep(); // Instant loop
        else setTimeout(runStep, delay);
      } else if (value.type === 'path') {
        animatePath(value.path, value.distance);
      }
    };

    runStep();
  };

  const animatePath = (path: GridNode[], distance: number) => {
    path.forEach((node, idx) => {
      setTimeout(() => {
        if (node.type !== 'start' && node.type !== 'target') {
          const el = document.getElementById(`node-${node.row}-${node.col}`);
          if (el) el.classList.add('node-path');
        }
        if (idx === path.length - 1) {
          setStats(s => ({ ...s, distance }));
          setIsVisualizing(false);
        }
      }, speedMap[speed] === 0 ? 0 : 30 * idx); // Slightly faster path animation
    });
  };

  const getNodeClass = (n: GridNode) => {
    if (n.type === 'start') return 'bg-green-500 z-10 cursor-grab node-start shadow-md';
    if (n.type === 'target') return 'bg-red-500 z-10 cursor-grab node-target shadow-md';
    if (n.type === 'wall') return 'node-wall';
    if (n.type === 'heavy') return 'node-heavy';
    return 'bg-white cursor-crosshair';
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header Controls */}
      <header className="bg-slate-900 text-white p-4 shadow-lg flex flex-wrap items-center gap-4 justify-between select-none">
        <div className="flex items-center gap-2 font-bold text-xl">
          <ArrowRight className="text-blue-400" /> Path Visualizer
        </div>
        
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <select value={algo} onChange={(e) => setAlgo(e.target.value as keyof typeof algos)} disabled={isVisualizing} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 outline-none focus:border-blue-500">
            {Object.entries(algos).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>

          <select value={speed} onChange={(e) => setSpeed(e.target.value as keyof typeof speedMap)} disabled={isVisualizing} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 outline-none">
            {Object.keys(speedMap).map(s => <option key={s} value={s}>{s} Speed</option>)}
          </select>

          <div className="flex bg-slate-800 rounded border border-slate-700 p-1">
            <button onClick={() => setDrawMode('wall')} className={`px-3 py-1 rounded ${drawMode === 'wall' ? 'bg-slate-600' : ''}`} disabled={isVisualizing}>
              Wall
            </button>
            <button onClick={() => setDrawMode('heavy')} className={`px-3 py-1 rounded flex items-center gap-1 ${drawMode === 'heavy' ? 'bg-orange-600' : ''}`} disabled={isVisualizing}>
              Traffic <span className="text-xs opacity-70">(Cost: 5)</span>
            </button>
          </div>

          <button onClick={generateMaze} disabled={isVisualizing} className="hover:bg-slate-800 flex items-center gap-1 px-3 py-2 rounded transition-colors border border-slate-700">
            <Shuffle size={16} /> Random Maze
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => initializeGrid(false)} disabled={isVisualizing} className="text-slate-300 hover:text-white px-3 py-2">
            Clear Path
          </button>
          <button onClick={() => initializeGrid(true)} disabled={isVisualizing} className="text-slate-300 hover:text-white px-3 py-2 flex items-center gap-1">
            <X size={16} /> Clear Board
          </button>
          <button onClick={visualize} disabled={isVisualizing} className={`bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded shadow flex items-center gap-2 transition-transform ${isVisualizing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
            <Play size={18} /> Visualize!
          </button>
        </div>
      </header>

      {/* Analytics Dashboard */}
      <div className="bg-white border-b shadow-sm py-3 px-6 flex justify-around text-slate-700 font-medium tracking-wide">
        <div className="flex items-center gap-2">
           <span className="w-4 h-4 rounded-full bg-blue-400"></span>
           Total Nodes Explored: <span className="font-bold text-slate-900 text-lg">{stats.explored}</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="w-4 h-4 rounded-full bg-yellow-400"></span>
           Final Path Distance: <span className="font-bold text-slate-900 text-lg">{stats.distance === 0 ? '--' : stats.distance}</span>
        </div>
      </div>

      {/* Grid Matrix Container */}
      <main className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-50" onMouseLeave={() => setIsDragging(null)} onMouseUp={() => setIsDragging(null)}>
        <div className="inline-grid border border-slate-300 shadow-sm" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {grid.map((row, r) =>
            row.map((node, c) => (
              <div
                key={`${r}-${c}`}
                id={`node-${r}-${c}`}
                className={`node w-6 h-6 border-r border-b border-slate-200 ${getNodeClass(node)}`}
                onMouseDown={(e) => { e.preventDefault(); handleMouseDown(r, c); }}
                onMouseEnter={() => handleMouseEnter(r, c)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
