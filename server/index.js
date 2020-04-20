const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const http = require('http').Server(app);
const sassMiddleware = require('node-sass-middleware');
const io = require('socket.io')(http);

const TITLE = 'WebRTC Streaming';
const VERSION = '0.01';
const PORT = 4545;

let userSockets = [];

app.use(sassMiddleware({
    src: path.resolve('../client/scss'),
    dest: path.resolve('../client/css'),
    outputStyle: "compressed",
    prefix: '/css',
}));

app.use(express.static(path.resolve('../client/')));

app.get('/', function (req, res) {
    res.sendFile(path.resolve('../client/index.html'));
});

io.on('connection', (socket) => {
    console.log(`socket connected: ${socket}`);

    const existingSocket = userSockets.find(sock => sock === socket.id);

    if (!existingSocket) {
        userSockets.push(socket.id);

        socket.emit('update-participants', {
            users: [userSockets.find(sock => sock !== socket.id)],
        }); 

        socket.broadcast.emit('update-participants', {
            users: [socket.id],
        });
    }

    socket.on('connect', (participant) => {
        participants.push(participant);

        console.log('SOCKET(connect): A new participant connected: ', participant);
    })

    io.on('disconnect', () => {
        userSockets = userSockets.filter(sock => sock !== socket.id);

        socket.broadcast.emit('remove-participant', {
            socketId: socket.id
        });
    })
})



http.listen(PORT, function () {
    console.log('\n' + TITLE, '\nv' + VERSION, '\n\nServer listening at port: ', PORT);
});