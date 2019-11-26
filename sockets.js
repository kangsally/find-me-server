const { getDistance } = require('./utils');
const uuidv4 = require('uuid/v4');
const {
  CONNECTION,
  USER_INFO,
  USER_LOCATION,
  HIDE_DATA,
  SEEK_DATA,
  NOTICE,
  MESSAGE,
  SEEK_FINISH,
  HIDE_FINISH,
  START,
  END,
  DISCONNECT,
  DISCONNECTED
} = require('./events');

module.exports = server => {
  const io = require('socket.io')(server);
  io.set('heartbeat interval', 2000);
  io.set('heartbeat timeout', 10000);

  const users = {};
  const userWaitingList = [];
  const roomList = {};

  io.on(CONNECTION, socket => {
    const user = {
      socketId: socket.id,
      id: null,
      lng: null,
      lat: null
    };
    users[socket.id] = socket;
    userWaitingList.push(user);
    socket.on(USER_INFO, info => {
      user.id = info.id;
    });
    socket.on(USER_LOCATION, loaction => {
      user.lng = loaction.lng;
      user.lat = loaction.lat;

      if (userWaitingList.indexOf(user) !== -1 && user.id) {
        const partner = userWaitingList.find(partner => {
          return (
            getDistance(user.lat, user.lng, partner.lat, partner.lng) < 500 &&
            user !== partner &&
            partner.id &&
            user.id !== partner.id
          );
        });

        if (partner) {
          const roomId = uuidv4();

          socket.join(roomId);
          users[partner.socketId].join(roomId);

          userWaitingList.splice(userWaitingList.indexOf(user), 1);
          userWaitingList.splice(userWaitingList.indexOf(partner), 1);

          roomList[socket.id] = roomId;
          roomList[partner.socketId] = roomId;

          io.sockets.in(roomId).emit(START, {
            hide: user.id,
            seek: partner.id
          });
        }
      }
    });

    socket.on(HIDE_DATA, data => {
      socket.broadcast.to(roomList[socket.id]).emit(HIDE_DATA, {
        photo: data.photo,
        location: data.location
      });
    });

    socket.on(SEEK_DATA, data => {
      socket.broadcast.to(roomList[socket.id]).emit(SEEK_DATA, {
        location: data
      });
    });

    socket.on(NOTICE, () => {
      const endTime = new Date().getTime() + 10 * 60000;
      io.sockets.in(roomList[socket.id]).emit(NOTICE, {
        time: endTime
      });
    });

    socket.on(MESSAGE, data => {
      socket.broadcast.to(roomList[socket.id]).emit(MESSAGE, {
        message: data.message
      });
    });

    socket.on(SEEK_FINISH, ({ result, finishMessage }) => {
      if (result === 'success') {
        io.sockets.in(roomList[socket.id]).emit(SEEK_FINISH, {
          result: 'success',
          finishMessage: finishMessage
        });
      }
      if (result === 'timeover') {
        io.sockets.in(roomList[socket.id]).emit(SEEK_FINISH, {
          result: 'timeover',
          finishMessage: finishMessage
        });
      }
      if (result === 'giveup') {
        io.sockets.in(roomList[socket.id]).emit(SEEK_FINISH, {
          result: 'giveup',
          finishMessage: finishMessage
        });
      }
      socket.leave(roomList[socket.id]);
      delete roomList[socket.id];
      delete users[socket.id];
    });

    socket.on(HIDE_FINISH, ({ result, finishMessage }) => {
      if (result === 'noPhoto') {
        io.sockets.in(roomList[socket.id]).emit(HIDE_FINISH, {
          result: 'noPhoto',
          finishMessage: finishMessage
        });
      }
      socket.leave(roomList[socket.id]);
      delete roomList[socket.id];
      delete users[socket.id];
    });

    socket.on(END, () => {
      if (!socket.adapter.rooms[roomList[socket.id]]) {
        return;
      }
      socket.leave(roomList[socket.id]);
      delete roomList[socket.id];
      delete users[socket.id];
    });

    socket.on(DISCONNECT, () => {
      if (socket.adapter.rooms[roomList[socket.id]]) {
        socket.leave(roomList[socket.id]);
        socket.broadcast.to(roomList[socket.id]).emit(DISCONNECTED, {
          result: 'disconnected',
          finishMessage: '상대방의 연결이 끊겼습니다.'
        });
        delete roomList[socket.id];
      }

      userWaitingList.splice(
        userWaitingList.indexOf(
          userWaitingList.find(user => {
            return user.socketId === socket.id;
          })
        ),
        1
      );
      delete users[socket.id];
    });
  });
};
