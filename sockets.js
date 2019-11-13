const { getDistance } = require('./utils');
const uuidv4 = require('uuid/v4');

module.exports = server => {
  const io = require('socket.io')(server);
  io.set('heartbeat interval', 100000);
  io.set('heartbeat timeout', 100000);

  const users = {};
  const userWaitingList = [];
  const roomList = {};

  io.on('connection', socket => {
    const user = {
      socketId: socket.id,
      id: null,
      lng: null,
      lat: null
    };
    users[socket.id] = socket;
    userWaitingList.push(user);
    socket.on('userInfo', info => {
      user.id = info.id;
    });
    socket.on('userLocation', loaction => {
      user.lng = loaction.lng;
      user.lat = loaction.lat;

      if (userWaitingList.indexOf(user) !== -1 && user.id) {
        const partner = userWaitingList.find(partner => {
          return (
            getDistance(user.lat, user.lng, partner.lat, partner.lng) < 500 &&
            user !== partner &&
            partner.id
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

          io.sockets.in(roomId).emit('start', {
            hide: user.id,
            seek: partner.id
          });
        }
      }
    });

    socket.on('hideData', data => {
      socket.broadcast.to(roomList[socket.id]).emit('hideData', {
        photo: data.photo,
        location: data.location
      });
    });

    socket.on('seekData', data => {
      socket.broadcast.to(roomList[socket.id]).emit('seekData', {
        location: data
      });
    });

    socket.on('notice', data => {
      const endTime = new Date().getTime() + 10 * 60000;
      io.sockets.in(roomList[socket.id]).emit('notice', {
        time: endTime
      });
    });

    socket.on('message', data => {
      socket.broadcast.to(roomList[socket.id]).emit('message', {
        message: data.message
      });
    });

    socket.on('seekFinish', ({ result, finishMessage }) => {
      if (result === 'success') {
        io.sockets.in(roomList[socket.id]).emit('seekFinish', {
          result: 'success',
          finishMessage: finishMessage
        });
      }
      if (result === 'timeover') {
        io.sockets.in(roomList[socket.id]).emit('seekFinish', {
          result: 'timeover',
          finishMessage: finishMessage
        });
      }
      if (result === 'giveup') {
        io.sockets.in(roomList[socket.id]).emit('seekFinish', {
          result: 'giveup',
          finishMessage: finishMessage
        });
      }
      socket.leave(roomList[socket.id]);
      delete roomList[socket.id];
    });

    socket.on('hideFinish', ({ result, finishMessage }) => {
      if (result === 'noPhoto') {
        io.sockets.in(roomList[socket.id]).emit('hideFinish', {
          result: 'noPhoto',
          finishMessage: finishMessage
        });
      }
      socket.leave(roomList[socket.id]);
      delete roomList[socket.id];
    });

    socket.on('end', () => {
      if (!socket.adapter.rooms[roomList[socket.id]]) {
        return;
      }
      socket.leave(roomList[socket.id]);
      delete roomList[socket.id];
    });

    socket.on('disconnect', () => {
      if (!socket.adapter.rooms[roomList[socket.id]]) {
        return;
      }
      if (socket.adapter.rooms[roomList[socket.id]]) {
        socket.leave(roomList[socket.id]);
        socket.broadcast.to(roomList[socket.id]).emit('disconnected', {
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
