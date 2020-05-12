const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const http = require('http').Server(app);
const sassMiddleware = require('node-sass-middleware');
const io = require('socket.io')(http);

const TITLE = 'WebRTC meeting app example (https://github.com/abhinavgunwant/WebRTC-meeting-app-example)';
const VERSION = '0.01';
const PORT = 4545;

let users = [];
let usersIter = 0;

const addUser = (socketID, displayName) => {
    return new Promise((resolve, reject) => {
        const user = {
            userID: `user-${ ++usersIter }`,
            displayName: displayName,
            socketID: socketID,
        };

        users.push(user);

        resolve(user);
    });
};

const socketExits = (socket) => {
    return users.find(sock => sock.socketID === socket.id);
}

const userExists = (userid) => {
    return users.find(user => user.userID === userid);
} 

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

const updateParticipants = (socket) => {
    console.log('Updating participants:');
    console.table(users)
    io.sockets.emit('update-participants', {
        users: users,
        selfSocketID: socket.id,
    });
};

io.use(async (socket, next) => {
    let data = socket.request;
    // console.log('data:', data);
    console.log('query: ', data._query);

    if (data._query.displayName) {
        await addUser(socket.id, data._query.displayName);
    }

    next();
});

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    console.log('Current Users: ');

    // if (!socketExits(socket)) {
    //     users.push({
    //         socketID: socket.id,
    //         displayName: null,
    //         userID: null
    //     });
    // } else {
    //     console.log('new socket!');
    // }

    updateParticipants(socket);

    // socket.emit('update-participants', {
    //     users: [users.find(sock => sock.socketID !== socket.id)],
    //     selfSocketID: socket.id,
    // });

    socket.on('set-displayname', (data) => {
        console.log('─> setting displayName!');

        if (data.userID && data.userID.trim() && data.displayName && data.displayName.trim()) {
            const userID = data.userID.trim();
            const displayName = data.displayName.trim();

            users = users.filter(usr => usr.userID !== userID);
            
            if (!userExists(userID)) {
                console.log(`   └─> User sent userID: '${userID}', displayName: ${displayName}\n   └─> Updating user list`);
                // if(socketExits(socket)) {

                // } else {
                users.push({
                    socketID: socket.id,
                    displayName: displayName,
                    userID: userID,
                });
                // }
            }
        } else {
            users.forEach(user => {
                if (user.socketID === socket.id) {
                    console.log(`   └─> found socket, now changing displayName of socket '${socket.id}' to ${data.displayName}!`);
                    user.displayName = data.displayName;

                    if (!user.userID) {
                        ++usersIter;
                        user.userID = `user-${usersIter}`;

                        // io.emit('set-user-id', {userID: sock.userID});
                    }
                }
            });
        }

        updateParticipants(socket);
    });

    socket.on('disconnect', (reason) => {
        console.log(`Socket ${socket.id} Disconnected, reason: ${reason}`);

        users = users.filter(sock => sock !== socket.id);

        socket.broadcast.emit('remove-participant', {
            socketId: socket.id
        });
    });
});

// start listening to the port
http.listen(PORT, () => {
    console.log(`\n${TITLE}\nVersion: ${VERSION}\n\nServer listening at port: ${PORT}`);
});