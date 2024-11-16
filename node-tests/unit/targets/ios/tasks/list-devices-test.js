const td              = require('testdouble');
const expect          = require('../../../../helpers/expect');
const Device          = require('../../../../../lib/objects/device');
const Promise         = require('rsvp').Promise;

const spawnArgs       = ['/usr/bin/xctrace', ['list', 'devices']];

//yes - isleofcode.com is my actual device name
//(turn on the hotspot and be branding all conference long!)
const deviceList = `== Devices ==
MacBook Pro (Tomasz) (uuid)
isleofcode.com (12.1.2) (uuid)

== Simulators ==
Apple TV Simulator (12.1) (uuid)
iPhone X Simulator (12.1) (uuid)`

describe('iOS List Emulator Task', () => {
  let listDevices;
  let spawn;

  beforeEach(() => {
    spawn = td.replace('../../../../../lib/utils/spawn');
    td.when(spawn(...spawnArgs))
      .thenReturn(Promise.resolve({ stdout: deviceList }));

    listDevices = require('../../../../../lib/targets/ios/tasks/list-devices');
  });

  afterEach(() => {
    td.reset();
  });

  it('calls spawn with correct arguments', () => {
    td.config({ ignoreWarnings: true });

    td.when(spawn(), { ignoreExtraArgs: true })
      .thenReturn(Promise.resolve({ stdout: '' }));

    return listDevices().then(() => {
      td.verify(spawn(...spawnArgs));

      td.config({ ignoreWarnings: false });
    });
  });

  it('lints out ios device, ignoring emulators & non ios devices', () => {
    return expect(listDevices()).to.eventually.deep.equal([
      new Device({
        apiVersion: '12.1.2',
        name: 'isleofcode.com',
        uuid: 'uuid',
        platform: 'ios',
        deviceType: 'device'
      })
    ]);
  });

  it('bubbles up error message when spawn rejects', () => {
    td.when(spawn(...spawnArgs)).thenReturn(Promise.reject('spawn error'));
    return expect(listDevices()).to.eventually.be.rejectedWith('spawn error');
  });
});

