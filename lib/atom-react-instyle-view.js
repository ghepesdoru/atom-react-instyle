'use babel';

import packageJSON from './../package.json';

export class AtomReactInstyleView {
  constructor(titleText, contents) {
    this.parentContainer = null;

    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('atom-react-instyle');

    // Create title bar
    const title = document.createElement('div');
    title.classList.add('title');
    title.textContent = titleText;

    const btnGroup = document.createElement('div');
    btnGroup.classList.add('btn-group');

    const copyButton = document.createElement('button');
    copyButton.classList.add('btn', 'btn-default', 'icon', 'icon-clippy');
    copyButton.onclick = () => {
      message.setSelectionRange(0, message.value.length);

      var succeed;
      try {
      	  succeed = document.execCommand("copy");
      } catch(e) {
          succeed = false;
      }

      if (succeed) {
        atom.notifications.addInfo(`${packageJSON.name}: converted style copy in clipboard`);
      }

      this.destroy();
    };

    const closeButton = document.createElement('button');
    closeButton.classList.add('btn', 'btn-default', 'icon', 'icon-x');
    closeButton.onclick = () => this.destroy();

    btnGroup.appendChild(copyButton);
    btnGroup.appendChild(closeButton);
    title.appendChild(btnGroup);

    // Create message element
    const message = document.createElement('textarea');
    message.value = contents;
    message.classList.add('message');
    this.element.appendChild(title);
    this.element.appendChild(message);
  }

  attached() {
    return true;
  }

  setParent(parent) {
    this.parentContainer = parent;
  }

  // Returns an object that can be retrieved when package is activated
  serialize() { return {}; }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
    this.parentContainer.destroy();
  }

  getElement() {
    return this.element;
  }

}

export default AtomReactInstyleView;
