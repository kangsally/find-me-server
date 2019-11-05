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
      lon: null,
      lat: null
    };
    users[socket.id] = socket;
    userWaitingList.push(user);
    console.log(userWaitingList);

    socket.on('userInfo', info => {
      user.id = info.id;
    });

    socket.on('userLocation', loaction => {
      user.lon = loaction.lon;
      user.lat = loaction.lat;
      console.log(user);

      if (userWaitingList.indexOf(user) !== -1) {
        const partner = userWaitingList.find(partner => {
          return (
            getDistance(user.lat, user.lon, partner.lat, partner.lon) < 0.5
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

          console.log(socket.adapter);

          io.sockets.in(roomId).emit('start', {
            hide: user.id,
            seek: partner.id
          });
        }
      }
    });

    //photo, location
    //location에 timestamp 정보 추가
    socket.on('hideData', data => {
      socket.broadcast.to(roomList[socket.id]).emit('hideData', {
        data: data
      });
    });

    //real location
    socket.on('seekData', data => {
      socket.broadcast.to(roomList[socket.id]).emit('seekData', {
        data: data
      });
    });

    socket.on('message', data => {
      socket.broadcast.to(roomList[socket.id]).emit('message', {
        data: data
      });
    });

    socket.on('end', data => {

        socket.leave(roomList[socket.id])
    })

  });
};
