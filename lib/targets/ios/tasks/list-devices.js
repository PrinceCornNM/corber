const spawn           = require('../../../utils/spawn');
const Device          = require('../../../objects/device');

const deserializeDevices = function(stdout) {
  let devices = [];
  if (stdout === undefined) { return devices; }

  let list = stdout.split('\n');

  //First line is always '== Devices =='
  list.shift();

  for (let item of list) {
    let line = item.trim();

    if (line === '') { continue; }
    if (line === '== Simulators ==') { break; }

    let split = item.split(/[(]|[[]/g);

    let deviceName = split[0].trim();
    //Cant exclude from device list
    if (deviceName.includes('MacBook')) {
      continue;
    }

    let apiVersion = split[1].replace(')', '').trim();
    let uuid = split[split.length - 1].replace(')', '').trim();

    let device = new Device({
      platform: 'ios',
      deviceType: 'device',
      apiVersion: apiVersion,
      name: deviceName,
      uuid: uuid
    });

    devices.push(device);
  }

  return devices;
};

module.exports = function() {
  let list = [
    '/usr/bin/xctrace',
    ['list', 'devices']
  ];

  return spawn(...list).then((output) => {
    let devices = deserializeDevices(output.stdout);
    return devices.reverse();
  });
};
