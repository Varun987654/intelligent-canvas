import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  // Good for production - prevents memory leaks
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3001;

// Health check endpoint (useful for monitoring)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// Store active users per canvas
const canvasUsers = new Map<string, Set<string>>();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
  // Track which canvas this user is currently in
  let currentCanvas: string | null = null;
  
  // Join a canvas room
  socket.on('join-canvas', (canvasId: string) => {
    // Leave previous canvas if any
    if (currentCanvas) {
      socket.leave(`canvas:${currentCanvas}`);
      
      // Remove from user tracking
      const users = canvasUsers.get(currentCanvas);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          canvasUsers.delete(currentCanvas);
        }
      }
      
      // Notify others in old room
      socket.to(`canvas:${currentCanvas}`).emit('user-left', {
        userId: socket.id,
        canvasId: currentCanvas
      });
    }
    
    // Join new canvas
    socket.join(`canvas:${canvasId}`);
    currentCanvas = canvasId;
    
    // Add to user tracking
    if (!canvasUsers.has(canvasId)) {
      canvasUsers.set(canvasId, new Set());
    }
    canvasUsers.get(canvasId)!.add(socket.id);
    
    console.log(`👤 User ${socket.id} joined canvas:${canvasId}`);
    console.log(`   Total users in canvas: ${canvasUsers.get(canvasId)!.size}`);
    
    // Notify others in the room
    socket.to(`canvas:${canvasId}`).emit('user-joined', {
      userId: socket.id,
      canvasId: canvasId,
      timestamp: new Date().toISOString()
    });
    
    // Send current users list to the new user
    socket.emit('canvas-users', {
      users: Array.from(canvasUsers.get(canvasId) || []),
      canvasId: canvasId
    });
  });
  
  // Leave canvas room
  socket.on('leave-canvas', () => {
    if (currentCanvas) {
      socket.leave(`canvas:${currentCanvas}`);
      
      // Remove from user tracking
      const users = canvasUsers.get(currentCanvas);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          canvasUsers.delete(currentCanvas);
        }
      }
      
      console.log(`👤 User ${socket.id} left canvas:${currentCanvas}`);
      
      // Notify others
      socket.to(`canvas:${currentCanvas}`).emit('user-left', {
        userId: socket.id,
        canvasId: currentCanvas
      });
      
      currentCanvas = null;
    }
  });
  
  // Test echo (for initial testing)
  socket.on('test-echo', (data) => {
    console.log('📨 Test echo received:', data);
    socket.emit('test-response', {
      ...data,
      serverTime: new Date().toISOString()
    });
  });

  // Handle drawing events
socket.on('canvas-draw', (data: { canvasId: string; line: any }) => {
       console.log(`🎨 Drawing received for canvas:${data.canvasId}`)
       
       // Broadcast to everyone in the room EXCEPT the sender
       socket.to(`canvas:${data.canvasId}`).emit('remote-draw', {
         userId: socket.id,
         line: data.line,
         timestamp: new Date().toISOString()
       })
     })
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    
    // Clean up if user was in a canvas
    if (currentCanvas) {
      const users = canvasUsers.get(currentCanvas);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          canvasUsers.delete(currentCanvas);
        }
      }
      
      // Notify others
      io.to(`canvas:${currentCanvas}`).emit('user-left', {
        userId: socket.id,
        canvasId: currentCanvas
      });
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on http://localhost:${PORT}`);
  console.log(`📡 Accepting connections from: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});