const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game State
const rooms = {};

function createDeck() {
    const suits = ['♠', '♥', '♣', '♦'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push({ suit: s, value: v });
        }
    }
    return deck.sort(() => Math.random() - 0.5); // Shuffle
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a room
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = { players: [], deck: [], turn: 0 };
        }

        // Add player if room not full (Max 4 for Call Break)
        if (rooms[roomId].players.length < 4) {
            rooms[roomId].players.push(socket.id);
            console.log(`User ${socket.id} joined room ${roomId}`);
            
            // Notify everyone in room
            io.to(roomId).emit('updatePlayers', rooms[roomId].players.length);
        } else {
            socket.emit('roomFull');
        }
    });

    // Start Game (Deal Cards)
    socket.on('startGame', (roomId) => {
        if (rooms[roomId] && rooms[roomId].players.length === 4) {
            const deck = createDeck();
            
            // Deal 13 cards to each player
            rooms[roomId].players.forEach((playerId, index) => {
                const hand = deck.slice(index * 13, (index + 1) * 13);
                io.to(playerId).emit('dealCards', hand);
            });
            
            io.to(roomId).emit('gameStarted');
        }
    });
    
    // Handle Disconnect
    socket.on('disconnect', () => {
        // Basic cleanup logic would go here
        console.log('User disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
