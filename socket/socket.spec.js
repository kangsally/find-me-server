const chai = require('chai');
const expect = require('chai').expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(expect);
chai.use(sinonChai);

const io = require('socket.io-client');
const socketUrl = 'http://localhost:8080';

describe('Socket Test', () => {
  let userA, userB, userC;
  let userAId = { id: 'A' };
  let userBId = { id: 'B' };
  let userCId = { id: 'C' };
  let userALocation = { lng: 127.0507571, lat: 37.5030042 };
  let userBLocation = { lng: 127.051015210043, lat: 38.504035189746 };
  let userCLocation = { lng: 127.0509977039301, lat: 37.50323870846376 };

  const usersConnect = done => {
    userA = io(socketUrl);
    userA.on('connect', () => {
      userB = io(socketUrl);
      userB.on('connect', () => {
        userC = io(socketUrl);
        userC.on('connect', () => {
          done();
        });
      });
    });
  };
  const usersDisonnect = done => {
    userA.on('disconnect', () => {
      userB.on('disconnect', () => {
        userC.on('disconnect', () => {
          done();
        });
        userC.disconnect();
      });
      userB.disconnect();
    });
    userA.disconnect();
  };

  describe('Users start and finish games', function() {
    this.timeout(5000);
    beforeEach(done => {
      usersConnect(done);
    });

    afterEach(done => {
      usersDisonnect(done);
    });

    it('Users matched with partner should recieve the game role', done => {
      userA.emit('userInfo', userAId);
      userB.emit('userInfo', userBId);
      userC.emit('userInfo', userCId);
      userA.emit('userLocation', userALocation);
      userB.emit('userLocation', userBLocation);
      userC.emit('userLocation', userCLocation);

      userA.on('start', gameRole => {
        expect(gameRole.hide).to.be.a('string');
        expect(gameRole.seek).to.be.a('string');
      });

      userC.on('start', gameRole => {
        expect(gameRole.hide).to.be.a('string');
        expect(gameRole.seek).to.be.a('string');
        done();
      });
    });

    it('User should be matched with partner under radius 500m', done => {
      let userAMock = sinon.spy();
      let userBMock = sinon.spy();
      let userCMock = sinon.spy();

      userA.emit('userInfo', userAId);
      userB.emit('userInfo', userBId);
      userC.emit('userInfo', userCId);
      userA.emit('userLocation', userALocation);
      userB.emit('userLocation', userBLocation);
      userC.emit('userLocation', userCLocation);

      userA.on('start', function(gameRole) {
        userAMock(gameRole);
      });

      userB.on('start', function(gameRole) {
        userBMock(gameRole);
      });

      userC.on('start', function(gameRole) {
        userCMock(gameRole);
      });

      setTimeout(() => {
        expect(userAMock).to.have.been.called;
        expect(userBMock).to.have.not.been.called;
        expect(userCMock).to.have.been.called;
        done();
      }, 1000);
    });

    it('Hide user should finish the game when seek user give up the game', done => {
      let mockBeforeFinish = sinon.spy();
      let mockAfterFinish = sinon.spy();

      userA.emit('userInfo', userAId);
      userB.emit('userInfo', userBId);
      userC.emit('userInfo', userCId);
      userA.emit('userLocation', userALocation);
      userB.emit('userLocation', userBLocation);
      userC.emit('userLocation', userCLocation);

      userA.on('start', function(gameRole) {
        if (gameRole.hide === userAId.id) {
          userA.on('seekData', data => {
            mockBeforeFinish(data);
          });
        } else {
          userA.emit('seekData', { data: 'location' });

          setTimeout(() => {
            userA.emit('seekFinish', {
              result: 'success',
              finishMessage: '못찾겠다 꾀꼬리'
            });
            userC.on('seekFinish', ({ result, finishMessage }) => {
              expect(result).to.contain('success');
              expect(finishMessage).to.contain('못찾겠다 꾀꼬리');

              userC.emit('end', { data: 'finish' });
              userA.emit('seekData', { data: 'location' });
              userC.on('seekData', data => {
                mockAfterFinish(data);
              });
            });
          }, 2000);
        }
      });

      userC.on('start', function(gameRole) {
        if (gameRole.hide === userCId.id) {
          userC.on('seekData', data => {
            mockBeforeFinish(data);
          });
        } else {
          userC.emit('seekData', { data: 'location' });

          setTimeout(() => {
            userC.emit('seekFinish', {
              result: 'success',
              finishMessage: '못찾겠다 꾀꼬리'
            });
            userA.on('seekFinish', ({ result, finishMessage }) => {
              expect(result).to.contain('success');
              expect(finishMessage).to.contain('못찾겠다 꾀꼬리');

              userA.emit('end', { data: 'finish' });
              userC.emit('seekData', { data: 'location' });
              userA.on('seekData', data => {
                mockAfterFinish(data);
              });
            });
          }, 2000);
        }
      });

      setTimeout(() => {
        expect(mockBeforeFinish).to.have.been.called;
        expect(mockAfterFinish).to.have.not.been.called;
        done();
      }, 4000);
    });
  });
});
