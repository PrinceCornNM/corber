const Command         = require('./-command');
const CreateProject   = require('../tasks/create-project');
const PlatformTask    = require('../targets/cordova/tasks/platform');
const CorberError     = require('../utils/corber-error');
const logger          = require('../utils/logger');
const fsUtils         = require('../utils/fs-utils');
const getOS           = require('../utils/get-os');
const getVersions     = require('../utils/get-versions');
const Promise         = require('rsvp').Promise;
const lodash          = require('lodash');
const _get            = lodash.get;
const _pick           = lodash.pick;

/* eslint-disable max-len */
const corberInPackageJsonMessage = 'You cannot use \'corber init\' if corber is already present in your project\'s package.json';
const corberFolderExistsMessage = 'You cannot use \'corber init\' if your project already contains a corber folder';
/* eslint-enable max-len */

module.exports = Command.extend({
  name: 'init',
  aliases: ['i'],

  // init has special scope handling in `validateAndRun`
  scope: 'everywhere',

  availableOptions: [
    { name: 'name',                 type: String },
    { name: 'cordova-id',           type: String },
    { name: 'template-path',        type: String },
    { name: 'platform',             type: String },
    { name: 'crosswalk',            type: Boolean,  default: false },
    { name: 'uiwebview',            type: Boolean,  default: false },
    { name: 'verbose',              type: Boolean,  default: false },
    { name: 'quiet',                type: Boolean,  default: false },
  ],

  validateAndRun() {
    let versions = getVersions(this.project.root);
    let version = _get(versions, 'corber.project.required');

    if (version !== undefined) {
      logger.error(corberInPackageJsonMessage);
      return Promise.resolve();
    }

    if (fsUtils.existsSync('corber')) {
      logger.error(corberFolderExistsMessage);
      return Promise.resolve();
    }

    return this._super(...arguments);
  },

  deserializePlatforms(platformStr) {
    return platformStr.split(',');
  },

  buildPromptOptions() {
    let platform = getOS();
    let promptOpts = {
      type: 'checkbox',
      name: 'platforms',
      message: 'Which platforms should we init with?',
      choices: [
        'none',
        'android'
      ]
    };

    if (platform === 'darwin') {
      promptOpts['choices'].push('ios');
    }

    return promptOpts;
  },

  promptForPlatforms() {
    let promptOpts = this.buildPromptOptions();

    return this.ui.prompt(promptOpts).then((selected) => {
      let { platforms } = selected;

      if (platforms.length === 0 || platforms[0] === 'none') {
        return [];
      }

      return platforms;
    });
  },

  installPlatforms(platforms, options) {
    let installOpts = _pick(options, 'crosswalk', 'uiwebview');
    installOpts.save = true;

    let addPlatform = new PlatformTask({ project: this.project });

    if (platforms.length === 1) {
      return addPlatform.run('add', platforms[0], installOpts);
    } else if (platforms.length === 2) {
      return addPlatform.run('add', platforms[0], installOpts)
        .then(() => { addPlatform.run('add', platforms[1], installOpts) });
    }
  },

  run(opts = {}) {
    let create = new CreateProject({
      project: this.project,
      ui: this.ui,
      cordovaId: opts.cordovaId,
      name: opts.name,
      templatePath: opts.templatePath
    });

    return this._super(...arguments)
      .then(() => create.run())
      .then(() => {
        if (opts.platform) {
          return this.deserializePlatforms(opts.platform);
        }

        return this.promptForPlatforms();
      })
      .then((platforms) => {
        if (platforms.length === 0) {
          logger.warn('No platforms selected');
          return;
        }

        return this.installPlatforms(platforms, opts);
      })
      .then(() => logger.success('Project created'))
      .catch((e) => {
        if (e instanceof CorberError) {
          logger.error(e);
        } else {
          throw e;
        }
      });
  }
});
