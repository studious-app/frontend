const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

const cors = require("cors");


app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200 // For legacy browser support
}));

app.use(express.static(__dirname));

var media = [];
var activeRooms = [];

io.on('connection', (socket) => {

    socket.on("check-room", room => {
      if(activeRooms[room]){
        socket.emit("room-valid", room);
      }else{
        socket.emit("room-invalid");
      }
    })

    socket.on("join-room", (roomId, userId) => {
        socket.join(roomId);  // Join the room
        socket.to(roomId).emit('user-connected', userId) // Tell everyone else in the room that we joined
        activeRooms[roomId] = activeRooms[roomId] + 1;
    });

    socket.on("create-room", (roomId, userId)=>{
      activeRooms[roomId] = 1;
      socket.join(roomId)  // Join the room
      socket.to(roomId).emit('user-connected', userId) // Tell everyone else in the room that we joined
    })

    socket.on("mute", ()=>{
      rooms = Array.from(socket.rooms);
      socket.to(rooms[1]).emit("mute", socket.id);
    })

    socket.on("unmute", ()=>{
      rooms = Array.from(socket.rooms);
      socket.to(rooms[1]).emit("unmute", socket.id);
    });

    socket.on("request-mute-status", ()=>{
      rooms = Array.from(socket.rooms);
      socket.to(rooms[1]).emit("request-mute-status");
    });

    socket.on("share-screen", (shareId)=>{
      rooms = Array.from(socket.rooms);
      socket.to(rooms[1]).emit("share-screen", shareId);
    });

    socket.on('disconnecting', () => {
      rooms = Array.from(socket.rooms);
      if(socket.rooms.size > 1){
        io.to(rooms[1]).emit("user-disconnected", socket.id);

        activeRooms[rooms[1]] = activeRooms[rooms[1]] - 1;
        if(activeRooms[rooms[1]] == 0){
          activeRooms[rooms[1]] = null;
        }
      }
    });

    socket.on("leave-room", () => {
      rooms = Array.from(socket.rooms);
      if(socket.rooms.size > 1){
        io.to(rooms[1]).emit("user-disconnected", socket.id);

        activeRooms[rooms[1]] = activeRooms[rooms[1]] - 1;
        if(activeRooms[rooms[1]] == 0){
          console.log(`Room ${rooms[1]} is no longer`)
          activeRooms[rooms[1]] = null;
        }

        socket.leave(rooms[1]);
      }

      
    })

    socket.on('disconnect', () => {
      media.forEach(md => {
        if(md.seeders.includes(socket.id)){
          md.seeders.splice(md.seeders.indexOf(socket.id), 1);
          console.log("Removed " + socket.id + " from media")
          if(md.seeders.length == 0){
            console.log("Media " + md.magnet + " is no longer available")
            media.splice(media.indexOf(md), 1);
          }
        }
      });

      io.emit("update_media", media)
    });

});

server.listen(4444, () => {
  console.log('socket server listening on *:4444');
});
