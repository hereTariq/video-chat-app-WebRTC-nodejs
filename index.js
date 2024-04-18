const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.set('view engine', 'ejs');

app.use('/', require('./routes'));

server.listen(3000, () =>
    console.log('server is running on http://localhost:3000')
);

const io = new Server(server);
io.on('connection', (socket) => {
    console.log('user connected', socket.id);

    socket.on('join', (roomName) => {
        const rooms = io.sockets.adapter.rooms;

        const roomExist = rooms.get(roomName);

        if (!roomExist) {
            socket.join(roomName);
            socket.emit('created');
        } else if (roomExist.size == 1) {
            socket.join(roomName);
            socket.emit('joined');
        } else {
            socket.emit('room-full');
        }
    });

    socket.on('ready', (roomName) => {
        socket.broadcast.to(roomName).emit('ready');
    });

    socket.on('candidate', (candidate, roomName) => {
        socket.broadcast.to(roomName).emit('candidate', candidate);
    });

    socket.on('offer', (offer, roomName) => {
        socket.broadcast.to(roomName).emit('offer', offer);
    });

    socket.on('answer', (answer, roomName) => {
        socket.broadcast.to(roomName).emit('answer', answer);
    });
});
