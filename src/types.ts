export type NodeType = 'empty' | 'wall' | 'heavy' | 'start' | 'target';

export interface GridNode {
  row: number;
  col: number;
  type: NodeType;
  // Algorithmic state (kept in pure JS, decoupled from React UI renders)
  isVisited: boolean;
  distance: number;
  previousNode: GridNode | null;
  f: number;
  g: number;
  h: number;
}

export type Step = 
  | { type: 'visit'; node: GridNode; exploredCount: number }
  | { type: 'path'; path: GridNode[]; distance: number };
