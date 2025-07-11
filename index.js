const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 8000;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/ping', (req, res) => {
    res.send("ok");
})

let USERS = {};
let ROOMS = {};
let ROOM_INFO = {};

const isPresent = (data) => {
    let result = false;
    ROOMS[data.roomID].forEach((user) => {
        if (USERS[user].name === data.name) {
            result = true;
        }
    })
    return result;
}

io.on('connection', (socket) => {
    console.log('1 client connected');

    socket.on('join', (data) => {
        try {
            USERS[socket.id] = { name: data.name, roomID: data.roomID };
            let onMember = 0;
            let exist = false;
            if (data.roomID in ROOMS) {
                if (isPresent(data)) {
                    io.to(socket.id).emit('userExist', data);
                    exist = true;
                } else {
                    ROOMS[data.roomID].push(socket.id);
                }
            } else {
                ROOMS[data.roomID] = [socket.id];
                ROOM_INFO[data.roomID] = {
                    cur: '#000000',
                    can: '#ffffff',
                    size: 1,
                };
            };

            if (!exist) {
                const dt = { cur: ROOM_INFO[data.roomID].cur, can: ROOM_INFO[data.roomID].can, size: ROOM_INFO[data.roomID].size }
                io.to(socket.id).emit('notExist', dt);
                onMember = ROOMS[data.roomID].length;
                ROOMS[data.roomID].forEach(id => {
                    const dt = { count: onMember, name: data.name };
                    if (id !== socket.id) {
                        io.to(id).emit('newMember', dt);
                    } else {
                        io.to(id).emit('roomCount', dt);
                    };
                });
            }
        } catch (e) {
            console.log(e);
        }
    });

    socket.on('mouseDown', (data) => {
        try {
            ROOMS[data.roomID].forEach(id => {
                if (socket.id !== id) {
                    io.to(id).emit('mouseDown', data);
                };
            });
        } catch (e) {
            console.log(e);
        };
    });

    socket.on('mouseMove', (data) => {
        try {
            ROOMS[data.roomID].forEach(id => {
                if (socket.id !== id) {
                    io.to(id).emit('mouseMove', data);
                };
            });
        } catch (e) {
            console.log(e);
        }
    });

    socket.on('clear', (data) => {
        try {
            ROOMS[data.roomID].forEach(id => {
                if (!(socket.id === id)) {
                    io.to(id).emit('clearCanvas', data);
                };
            });
        } catch (e) {
            console.log(e);
        }
    });

    socket.on('themeChange', (data) => {
        try {
            ROOM_INFO[data.roomID].cur = data.colorCur;
            ROOM_INFO[data.roomID].can = data.colorCan;
            ROOM_INFO[data.roomID].size = data.size;
            ROOMS[data.roomID].forEach(id => {
                if (socket.id !== id) {
                    io.to(id).emit('newTheme', data);
                }
            })
        } catch (e) {
            console.log(e);
        }
    })

    socket.on('disconnecting', () => {
        try {
            const roomID = USERS[socket.id].roomID;
            ROOMS[roomID] = ROOMS[roomID].filter(user => user !== socket.id);
            if (ROOMS[roomID].length === 0) {
                delete ROOM_INFO[roomID];
                delete USERS[socket.id];
                delete ROOMS[roomID];
            } else {
                onMember = ROOMS[roomID].length;
                ROOMS[roomID].forEach(id => {
                    const dt = { count: onMember };
                    io.to(id).emit('roomCount', dt);
                });
            }
            console.log('1 client disconnected');
        } catch (e) {
            console.log(e);
        }
    })
})

server.listen(port, () => {
    console.log('server started on http://localhost:' + port);
});