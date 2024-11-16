const Promise          = require('rsvp').Promise;
const Task             = require('./-task');
const CreateCordova    = require('../targets/cordova/tasks/create-project');
const UpdateGitIgnore  = require('../tasks/update-gitignore');
const ESLintIgnore     = require('../tasks/eslintignore');
const InstallCorber    = require('../tasks/install-project-corber');
const camelize         = require('../utils/string').camelize;
const path             = require('path');
const fsUtils          = require('../utils/fs-utils');
const frameworkType    = require('../utils/framework-type');
const requireFramework = require('../utils/require-framework');
const logger           = require('../utils/logger');

const createProjectId = function(projectName) {
  return 'io.corber.' + projectName;
};

module.exports = Task.extend({
  project: undefined,
  ui: undefined,
  cordovaId: undefined,
  name: undefined,
  templatePath: '',

  initDirs(project) {
    let emberCdvPath = path.join(project.root, 'corber');
    let projectConfig = path.resolve(emberCdvPath, 'config/framework.js');
    let configPath;

    return this.getFramework(project.root).then((framework) => {
      if (framework === 'custom') {
        this.warnCustomFramework();
      }

      configPath = path.join(
        __dirname,
        '../templates/frameworks',
        `${framework}.js`
      );

      return fsUtils.mkdir(emberCdvPath);
    }).then(() => fsUtils.mkdir(path.join(emberCdvPath, 'config')))
      .then(() => fsUtils.copy(configPath, projectConfig));
  },

  getFramework(root) {
    let detectedFrameworks = frameworkType.detectAll(root);

    if (detectedFrameworks.length === 1) {
      return Promise.resolve(detectedFrameworks[0]);
    }

    return this.ui.prompt({
      type: 'list',
      name: 'framework',
      message: 'Select your framework type:',
      choices: detectedFrameworks
    }).then(({ framework }) => framework);
  },

  warnCustomFramework() {
    logger.warn(
      'Your framework type (e.g. Ember/Vue/Glimmer) was not identified; ' +
      'initializing with a custom framework type. Required framework ' +
      'functions are located in corber/config/framework.js--you will need to ' +
      'implement these shell functions yourself.\n\n' +
      'If you expected a framework type to be identified, please open an issue.'
    );
  },

  run() {
    let projectName = camelize(this.project.name());

    let create = new CreateCordova({
      id: this.cordovaId || createProjectId(projectName),
      name: this.name || projectName,
      templatePath: this.templatePath,
      project: this.project,
      ui: this.ui
    });

    let updateGitIgnore = new UpdateGitIgnore({
      project: this.project,
      ui: this.ui
    });

    let eslintIgnore = new ESLintIgnore({
      project: this.project,
      ui: this.ui
    });

    let installCorber = new InstallCorber({
      rootPath: this.project.root,
    });

    return this.initDirs(this.project)
    .then(() => create.run())
    .then(() => updateGitIgnore.run())
    .then(() => eslintIgnore.run())
    .then(() => installCorber.run())
    .then(() => {
      let framework = requireFramework(this.project);
      return framework.afterInstall();
    })
  }
});
