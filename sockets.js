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
            getDistance(user.lat, user.lng, partner.lat, partner.lng) < 0.5 &&
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

    //photo, location
    socket.on('hideData', data => {
      socket.broadcast.to(roomList[socket.id]).emit('hideData', {
        photo: data.photo,
        location: data.location
      });
    });

    //real location
    socket.on('seekData', data => {
      // console.log(data);
      socket.broadcast.to(roomList[socket.id]).emit('seekData', {
        location: data
      });
    });

    socket.on('notice', data => {
      const endTime = new Date().getTime() + 10*60000;
      io.sockets.in(roomList[socket.id]).emit('notice', {
        time: endTime
      })
    })

    socket.on('message', data => {
      socket.broadcast.to(roomList[socket.id]).emit('message', {
        message: data.message
      });
    });

    socket.on('end', data => {
      socket.leave(roomList[socket.id]);
      delete users[socket.id];
      delete roomList[socket.id];
    });
  });
};
