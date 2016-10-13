'use babel';

import { CompositeDisposable } from 'atom';
import nodePath from 'path';
import nodeFs from 'fs';
import { Convertor } from 'react-instyle';
import packageConfig from './config-schema.json';
import packageJSON from './../package.json';
import { AtomReactInstyleView } from './atom-react-instyle-view';


export class AtomReactInstyle {
  constructor(state) {
    // Attach configuration options
    this.config = packageConfig;

    // Event subscriptions placekeeper
    this.subscriptions = null;

    // Convertor placekeeper
    this.convertor = null;

    // Settings keeper
    this.settings = null;

    this.doubleConversions = {
      scss: 'scss',
      sass: 'sass'
    };

    // Start without a results view
    this.previewView = null;
  }

  // Plugin activation time state restore
  activate(state) {
    // Instantiate the convertor
    this.convertor = new Convertor();

    // Grab a fresh copy of configuration
    this.settings = atom.config.get(packageJSON.name);

    // Enforce the settings on the new plugin instance
    this.enforceSettings();

    // Instantiate a CompositeDisposable to allow easy event listener cleaning
    this.subscriptions = new CompositeDisposable();

    // Attach listeners
    this.subscriptions.add(
      atom.config.onDidChange(packageJSON.name, ({ newValue }) => this.updateSettings(newValue))
    );

    // Attach commands
    const commands = {};
    commands[`${packageJSON.name}:convert`] = this.convertCurrentFile.bind(this);
    commands['core:save'] = this.convertAsFile.bind(this);

    this.subscriptions.add(
      atom.commands.add('atom-workspace', commands)
    );
  }

  // Plugin deactivation time clean functionality
  deactivate() {
    if (this.subscriptions) {
      // Remove all event listeners
      this.subscriptions.dispose();
      this.subscriptions = null;
    }
  }

  // Plugin state serialization function
  serialize() {
    return {};
  }

  convert(file, outputFormat, ignoreUnsupported) {
    let inputFormat = 'css';
    let supported = false;
    const ext = nodePath.extname(file.getBaseName()).toLowerCase().split('.').slice(1).join('.');
    if (this.doubleConversions[ext]) {
      // Check if sass is supported
      if (this.settings.enableSASS) {
        supported = true;
        inputFormat = this.doubleConversions[ext];
      } else {
        return atom.notifications.addWarning(`SCSS/SASS file support is disabled.`, {
          detail: `You can enable support for scss/sass file conversion from \nthe ${packageJSON.name} package settings.`,
          dismissable: true
        });
      }
    } else if (ext === 'css') {
      supported = true;
    }

    if (!supported) {
      if (!ignoreUnsupported) {
        return atom.notifications.addWarning(`Invalid conversion input style file.`, {
          detail: `${ext.slice(0, 1).toUpperCase()}${ext.slice(1)} files are not supported for conversion.\nOnly SCSS/SASS/CSS files are supported by the \n${packageJSON.name} plugin.`
        });
      }

      // Just return if unsupported should be ignored
      return;
    }

    const basePath = nodePath.dirname(file.getPath());
    const fileName = nodePath.basename(file.getBaseName(), `.${ext}`);

    // Adapt include paths to match current folder (only looking for . and ..)
    const localIncludes = this.settings.includePaths.map((p) => {
      if (p === '.') {
        return basePath;
      } else if (p === '..') {
        return nodePath.join(basePath, '..');
      }

      return p;
    });

    // Add the new basename to the list of paths
    this.convertor.setIncludePath(localIncludes);

    // Start converting the current file
    this.convertor.convert(atom.workspace.getActiveTextEditor().buffer.cachedText || atom.workspace.getActiveTextEditor().buffer.getText(), inputFormat, outputFormat).then((ret) => {
      const errors = ret.errors.map((e) => {
        if (e.file === Convertor.UNKNOWN_SOURCE) {
          e.file = file.getPath();
        }

        return e;
      });

      if (errors.length) {
        atom.notifications.addError(`${packageJSON.name}: ${errors.length} conversion errors`, {
          detail: errors.map((e, i) => {
            return `[${i + 1}] ${e.message}\n file: ${e.file}\n line: ${e.line}, column: ${e.column}`
          }).join('\n'),
          dismissable: true
        });
      }

      // Success case
      if (outputFormat.indexOf('_file') > -1) {
        if (errors.length === 0 || this.settings.onError === 'yes') {
          this.outputToFile(nodePath.join(basePath, fileName), ret.formatted);
        }
      } else if (errors.length === 0) {
        this.outputToPreview(`Conversion of ${fileName}.${ext}`, ret.formatted);
      }
    });
  }

  convertAsFile() {
    const file = this.getCurrentFile();

    if (!file) {
      throw new Error('Not in a file context');
    }

    // Do not inline convert on save for cases when a file is not required
    if (this.settings.conversion.indexOf('file') === -1) {
      return;
    }

    this.convert(file, this.settings.conversion, true);
  }

  convertCurrentFile() {
    const file = this.getCurrentFile();

    if (!file) {
      throw new Error('Not in a file context');
    }

    this.convert(file, this.settings.conversion.indexOf('react') > -1 ? 'react' : 'javascript');
  }

  outputToFile(file, contents) {
    try {
      nodeFs.writeFileSync(`${file}.js`, contents, {
        encoding: 'utf8'
      });

      atom.notifications.addInfo(`${packageJSON.name} converted style to ${nodePath.basename(file)}.js`);
    } catch (e) {
      atom.notifications.addError(`${packageJSON.name} unable to write converted style file`, {
        detail: e.message
      });
    }
  }

  outputToPreview(title, contents) {
    const item = new AtomReactInstyleView(title, contents);

    this.previewView = atom.workspace.addModalPanel({
      item,
      visible: true
    });

    item.setParent(this.previewView);
  }

  updateSettings(config) {
    this.settings = config;
    this.enforceSettings();
  }

  getCurrentFile() {
    const pane = atom.workspace.getActivePane();

    if (pane.activeItem) {
      if (pane.activeItem.buffer.file) {
        return pane.activeItem.buffer.file;
      }
    }

    return null
  }

  enforceSettings() {
    const settings = this.settings;

    this.convertor.setIndentation(parseInt(settings.indentation, 10) || 2);
    this.convertor.alwaysEscapeProperties(settings.propertyNameEscape === 'yes');
    this.convertor.setStringDelimiter(settings.stringDelimiter);
  }
}

export default AtomReactInstyle;
