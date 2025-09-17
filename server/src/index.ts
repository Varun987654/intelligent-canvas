import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuid } from 'uuid';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

// --- TYPE DEFINITIONS ---
interface BaseElement { id: string; tempId?: string; userId: string; createdAt: number; }
interface LineData extends BaseElement { points: number[]; color: string; strokeWidth: number; tool: 'pen' | 'eraser'; }
interface ShapeData extends BaseElement { type: 'rectangle' | 'circle' | 'arrow' | 'line'; points: number[]; color: string; strokeWidth: number; fill?: string; }
interface TextData extends BaseElement { x: number; y: number; text: string; fontSize: number; fontFamily: string; color: string; }

interface CanvasData {
  lines: LineData[];
  shapes: ShapeData[];
  texts: TextData[];
}

// --- NEW STATE STRUCTURE FOR SHARED HISTORY ---
interface RoomState {
  history: CanvasData[];
  currentIndex: number;
}
const canvasState = new Map<string, RoomState>();
const canvasUsers = new Map<string, Set<string>>();

// --- HELPER FUNCTION TO GET CURRENT STATE AND BROADCAST ---
const updateAndBroadcast = (canvasId: string, roomState: RoomState) => {
  const currentState = roomState.history[roomState.currentIndex];
  io.to(`canvas:${canvasId}`).emit('server-state-update', {
    elements: currentState,
    canUndo: roomState.currentIndex > 0,
    canRedo: roomState.currentIndex < roomState.history.length - 1,
  });
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', connections: io.engine.clientsCount, activeCanvases: canvasState.size });
});

io.on('connection', (socket) => {
  let currentCanvas: string | null = null;
  
  socket.on('join-canvas', async (canvasId: string) => {
    if (currentCanvas) {
      socket.leave(`canvas:${currentCanvas}`);
      const users = canvasUsers.get(currentCanvas);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          canvasUsers.delete(currentCanvas);
          canvasState.delete(currentCanvas);
        }
      }
    }
    
    socket.join(`canvas:${canvasId}`);
    currentCanvas = canvasId;
    
    if (!canvasUsers.has(canvasId)) canvasUsers.set(canvasId, new Set());
    canvasUsers.get(canvasId)!.add(socket.id);
    
    if (!canvasState.has(canvasId)) {
      // Load the saved state from database
      let initialCanvasData: CanvasData = { lines: [], shapes: [], texts: [] };
      
      try {
        const response = await fetch(`${process.env.NEXTJS_URL || 'http://localhost:3000'}/api/canvas/${canvasId}/data`);
        if (response.ok) {
          const result = await response.json() as { data: CanvasData };
          if (result.data && typeof result.data === 'object') {
            // Ensure the data has the correct structure
            initialCanvasData = {
              lines: Array.isArray(result.data.lines) ? result.data.lines : [],
              shapes: Array.isArray(result.data.shapes) ? result.data.shapes : [],
              texts: Array.isArray(result.data.texts) ? result.data.texts : []
            };
          }
        }
      } catch (error) {
        console.error('Failed to load canvas data:', error);
        // Use empty canvas data on error
      }
      
      canvasState.set(canvasId, { 
        history: [initialCanvasData], 
        currentIndex: 0 
      });
    }
    
    const roomState = canvasState.get(canvasId)!;
    const currentState = roomState.history[roomState.currentIndex];
    socket.emit('server-state-update', {
      elements: currentState,
      canUndo: roomState.currentIndex > 0,
      canRedo: roomState.currentIndex < roomState.history.length - 1,
    });
    
    io.to(`canvas:${canvasId}`).emit('canvas-users', { 
      users: Array.from(canvasUsers.get(canvasId) || []) 
    });
});


  const handleEdit = (canvasId: string, editFunction: (currentData: CanvasData) => CanvasData) => {
    const roomState = canvasState.get(canvasId);
    if (!roomState) return;
    const currentData = roomState.history[roomState.currentIndex];
    const newCanvasData = JSON.parse(JSON.stringify(currentData)); 
    const updatedData = editFunction(newCanvasData);
    const newHistory = roomState.history.slice(0, roomState.currentIndex + 1);
    newHistory.push(updatedData);
    roomState.history = newHistory;
    roomState.currentIndex = newHistory.length - 1;
    updateAndBroadcast(canvasId, roomState);
  };

  socket.on('client-create-element', (data: { canvasId: string; type: string; elementData: any }) => {
    handleEdit(data.canvasId, (currentData) => {
      const element = {
        ...data.elementData,
        id: `${data.type}-${uuid()}`,
        userId: socket.id,
      };

      if (data.type === 'line') currentData.lines.push(element as LineData);
      else if (data.type === 'shape') currentData.shapes.push(element as ShapeData);
      else if (data.type === 'text') currentData.texts.push(element as TextData);
      return currentData;
    });
  });
  
  socket.on('client-delete-element', (data) => {
    handleEdit(data.canvasId, (currentData) => {
      currentData.lines = currentData.lines.filter(l => l.id !== data.elementId);
      currentData.shapes = currentData.shapes.filter(s => s.id !== data.elementId);
      currentData.texts = currentData.texts.filter(t => t.id !== data.elementId);
      return currentData;
    });
  });

  socket.on('client-undo', (canvasId: string) => {
    const roomState = canvasState.get(canvasId);
    if (roomState && roomState.currentIndex > 0) {
      roomState.currentIndex--;
      updateAndBroadcast(canvasId, roomState);
    }
  });

  socket.on('client-redo', (canvasId: string) => {
    const roomState = canvasState.get(canvasId);
    if (roomState && roomState.currentIndex < roomState.history.length - 1) {
      roomState.currentIndex++;
      updateAndBroadcast(canvasId, roomState);
    }
  });

  socket.on('cursor-move', (data) => {
    socket.to(`canvas:${data.canvasId}`).emit('remote-cursor', { userId: socket.id, ...data });
  });

  socket.on('cursor-leave', (canvasId: string) => {
    socket.to(`canvas:${canvasId}`).emit('remote-cursor-leave', { userId: socket.id });
  });
  
  socket.on('disconnect', () => {
    if (currentCanvas) {
      const users = canvasUsers.get(currentCanvas);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          canvasUsers.delete(currentCanvas);
          canvasState.delete(currentCanvas);
        }
        io.to(`canvas:${currentCanvas}`).emit('canvas-users', { users: Array.from(users) });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});