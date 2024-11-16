const td             = require('testdouble');
const expect         = require('../../helpers/expect');
const mockProject    = require('../../fixtures/corber-mock/project');
const Promise        = require('rsvp');
const GitIgnore      = require('../../../lib/tasks/update-gitignore');
const InstallCorber  = require('../../../lib/tasks/install-project-corber');


const isAnything     = td.matchers.anything;
const fsUtils        = require('../../../lib/utils/fs-utils');
const path           = require('path');
const frameworkType  = require('../../../lib/utils/framework-type');

let CreateCordova    = require('../../../lib/targets/cordova/tasks/create-project');

describe('Create Project', function() {
  let createTask;
  let tasks;

  function initTask(options = {}) {
    tasks = [];

    td.replace('../../../lib/utils/require-framework', function() {
      return {
        afterInstall() {
          tasks.push('framework-after-install');
          return Promise.resolve();
        }
      }
    });

    let CreateProject = require('../../../lib/tasks/create-project');

    createTask = new CreateProject({
      project: mockProject.project,
      ui: mockProject.ui,
      cordovaId: options.cordovaId,
      name: options.name
    });

    td.replace(CreateCordova.prototype, 'run', function() {
      tasks.push('create-cordova-project');
      return Promise.resolve();
    });

    td.replace(GitIgnore.prototype, 'run', function() {
      tasks.push('update-gitignore');
      return Promise.resolve();
    });

    td.replace(InstallCorber.prototype, 'run', function() {
      tasks.push('install-corber');
      return Promise.resolve();
    });

    const mockInitDirs = 'mockInitDirs' in options ? options.mockInitDirs : true;
    if (mockInitDirs) {
      td.replace(createTask, 'initDirs', function() {
        tasks.push('create-dirs');
        return Promise.resolve();
      });
    }
  }

  beforeEach(function() {
    td.replace(fsUtils, 'mkdir', function() {
      return Promise.resolve();
    });

    td.replace(fsUtils, 'copy', function() {
      return Promise.resolve();
    });
  });

  afterEach(function() {
    td.reset();
  });

  it('runs tasks in the correct order', function() {
    initTask();

    return createTask.run().then(function() {
      expect(tasks).to.deep.equal([
        'create-dirs',
        'create-cordova-project',
        'update-gitignore',
        'install-corber',
        'framework-after-install'
      ]);
    });
  });

  it('inits CreateCordova with id, name & templatePath', function() {
    let taskPath = '../../../lib/targets/cordova/tasks/create-project';
    CreateCordova = td.replace(taskPath);
    initTask();
    createTask.templatePath = 'passedTemplatePath';

    return createTask.run().then(function() {
      td.verify(new CreateCordova({
        id: 'io.corber.corberMock',
        name: 'corberMock',
        templatePath: 'passedTemplatePath',
        project: isAnything(),
        ui: isAnything()
      }));
    });
  });

  it('inits CreateCordova with id, name & templatePath when a custom id and name are provided', function() {
    let taskPath = '../../../lib/targets/cordova/tasks/create-project';
    CreateCordova = td.replace(taskPath);
    initTask({ cordovaId: 'io.corber.app', name: 'anAppName' });
    createTask.templatePath = 'passedTemplatePath';

    return createTask.run().then(function() {
      td.verify(new CreateCordova({
        id: 'io.corber.app',
        name: 'anAppName',
        templatePath: 'passedTemplatePath',
        project: isAnything(),
        ui: isAnything()
      }));
    });
  });

  it('warns if framework type is custom', function() {
    td.replace(frameworkType, 'detectAll', function() {
      return ['custom'];
    });

    initTask({ mockInitDirs: false });
    let warnDouble = td.replace(createTask, 'warnCustomFramework');

    return createTask.run().then(function() {
      td.verify(warnDouble());
    });
  });

  context('initDirs', function() {
    let emberCdvPath = path.resolve(
      __dirname, '..', '..',
      'fixtures',
      'corber-mock',
      'corber'
    );

    let emberCdvConfigPath = path.resolve(emberCdvPath, 'config');

    beforeEach(function() {
      td.replace(frameworkType, 'detectAll', function() {
        return ['ember'];
      });
    });

    afterEach(function() {
      td.reset();
    });

    it('inits corber && config directories', function() {
      let mkDirPaths = [];

      td.replace(fsUtils, 'mkdir', function(corberPath) {
        mkDirPaths.push(corberPath);
        return Promise.resolve();
      });

      initTask({ mockInitDirs: false });
      return createTask.run().then(function() {
        expect(mkDirPaths).to.include(emberCdvPath);
        expect(mkDirPaths).to.include(emberCdvConfigPath);
      });
    });

    it('attempts to copy the frameworks config', function() {
      let sourcePath, destPath;

      td.replace(fsUtils, 'copy', function(source, dest) {
        sourcePath = source;
        destPath = dest;
        return Promise.resolve();
      });

      initTask({ mockInitDirs: false });

      return createTask.run().then(function() {
        let emberPath = path.join(
          'lib',
          'templates',
          'frameworks',
          'ember.js'
        );

        expect(sourcePath).to.include(emberPath);
        expect(destPath).to.equal(path.join(emberCdvPath, 'config', 'framework.js'));
      });
    });
  });
});
