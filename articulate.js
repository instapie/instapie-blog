function getContainerElement(node) {
  var element = node;
  while (element.nodeType !== 1) {
    element = element.parentNode;
  }
  return element;
}

function getCurrentElement() {
  var selection = window.getSelection();
  return getContainerElement(selection.anchorNode);
}

function focus(element) {
  setTimeout(function() { element.focus(); }, 0);
}

function dirty() {
  document.getElementById('save').textContent = 'Save*';
}

function showElement(element) {
  element.className = 'autohide visible';
}

function hideElement(element) {
  element.className = 'autohide';
}

function createElement(name, attributes) {
  var element = document.createElement(name);
  for (var attribute in (attributes || {})) {
    element.setAttribute(attribute, attributes[attribute]);
  }
  return element;
}

function ensureListExists(element) {
  if ((/^UL|OL$/).test(element.parentNode.nodeName)) {
    return;
  }

  var list = createElement('UL');
  element.parentNode.insertBefore(list, element);
  list.appendChild(element);
}

function getCssStyle(selector) {
  var stylesheet = document.styleSheets[0];
  var ruleList = stylesheet.cssRules || stylesheet.rules;

  for (var i = 0; i < ruleList.length; ++i) {
    if (ruleList[i].selectorText === selector) {
      return ruleList[i].style;
    }
  }

  return null;
}

function moveAfterList(element) {
  if (!(/^UL|OL$/).test(element.parentNode.nodeName)) {
    return;
  }

  var list = element.parentNode;
  list.parentNode.insertBefore(element, list.nextSibling);
}

function changeElementTo(oldElement, name, attributes) {
  if (name === 'LI') {
    ensureListExists(oldElement);
  } else {
    moveAfterList(oldElement);
  }

  var newElement = createElement(name, attributes);
  newElement.setAttribute('contenteditable', true);
  newElement.textContent = oldElement.textContent;
  oldElement.parentNode.replaceChild(newElement, oldElement);
  focus(newElement);

  if (isHeading(name)) {
    updateNav();
  }

  dirty();
}

function changeCurrentElementTo(name, attributes) {
  changeElementTo(getCurrentElement(), name, attributes);
}

function changeSelectionTo(element, range, name, attributes) {
  if (!element) {
    return;
  }

  var container = getContainerElement(element);
  var html = container.innerHTML;

  var newElement = createElement(name, attributes);
  newElement.innerHTML = html.substring(range[0], range[1]);

  container.innerHTML = html.substring(0, range[0]) +
    newElement.outerHTML + html.substring(range[1]);

  dirty();
}

function changeCurrentSelectionTo(name, attributes) {
  var selection = window.getSelection();
  changeSelectionTo(selection.anchorNode, getRange(selection), name, attributes);
}

function getRange(selection) {
  var range = getMinMax(selection.anchorOffset, selection.focusOffset);

  // Adjust offsets based on where the current selection is within the parent.
  var offset = getTotalOffset(selection.anchorNode);
  range[0] += offset;
  range[1] += offset;

  return range;
}

function getTotalOffset(element) {
  var offset = 0;
  while (element && element.previousSibling) {
    element = element.previousSibling;
    offset += (element.outerHTML || element.textContent).length;
  }
  return offset;
}

function createNewElement(name) {
  var oldElement = getCurrentElement();
  var newElement = createElement(name, { contenteditable: true });
  oldElement.parentNode.insertBefore(newElement, oldElement.nextSibling);
  focus(newElement);
}

function removeElement(element) {
  var name = element.nodeName;
  var previousElement = element.previousSibling;
  element.parentNode.removeChild(element);
  focus(previousElement);
  if (isHeading(name)) {
    updateNav();
  }
}

function removeCurrentElement() {
  removeElement(getCurrentElement());
}

function isHeading(name) {
  return !!name.match(/^h\d$/i);
}

function updateNav() {
  var navList = document.querySelector('nav > ul');
  navList.innerHTML = '';

  var headings = document.querySelectorAll('h1, h2, h3');
  for (var i = 0; i < headings.length; ++i) {
    setIdForHeading(headings[i]);
    addNavListItemForHeading(navList, headings[i]);
  }
}

function setIdForHeading(heading) {
  var text = heading.textContent;
  heading.id = text.replace(/[^\w]/g, '-').toLowerCase();
}

function addNavListItemForHeading(navList, heading) {
  var item = createElement('LI');
  item.className = heading.nodeName.toLowerCase();
  navList.appendChild(item);

  var link = createElement('A', { href: '#' + heading.id });
  link.textContent = heading.textContent;
  item.appendChild(link);
}

function expandArticle() {
  var articleStyle = getCssStyle('article');
  var width = parseInt(getCssStyle('article').width);
  articleStyle.width = (width + 5) + '%';
}

function contractArticle() {
  var articleStyle = getCssStyle('article');
  var width = parseInt(getCssStyle('article').width);
  articleStyle.width = (width - 5) + '%';
}

function switchTheme(theme) {
  theme = theme || getNextTheme();
  document.body.className = theme;
  localStorage.theme = theme;
}

function getNextTheme() {
  switch (document.body.className) {
    case 'default':
      return 'sky';

    case 'sky':
      return 'strict';

    default:
      return 'default';
  }
}

// ----- Utils -----

function getMinMax(x, y) {
  return x < y ? [x, y] : [y, x];
}

// Thank you, StackOverflow :)
// http://stackoverflow.com/questions/5251520/how-do-i-escape-some-html-in-javascript
function escapeHTML(html) {
  var pre = createElement('pre');
  var text = document.createTextNode(html);
  pre.appendChild(text);
  return pre.innerHTML;
}

// I just hate how period is the second argument to setInterval.
function doPeriodically(period, callback) {
  setInterval(callback, period);
}

function inDevMode() {
  return window.location.hostname === 'localhost';
}

// ----- Boot -----

window.addEventListener('load', function() {
  var article = document.querySelector('article');
  var shortcutsTable = document.querySelector('#shortcuts table');
  var inputDialog = document.getElementById('modal-input');
  var inputField = inputDialog.querySelector('input');
  var saveButton = document.getElementById('save');

  function getInput(caption, callback) {
    inputField.setAttribute('placeholder', caption);
    showElement(inputDialog);
    focus(inputField);

    var handler = function(e) {
      if (e.keyCode === 13) {
        e.preventDefault();
        e.stopPropagation();

        try {
          hideElement(inputDialog);

          callback(inputField.value);

          // Clean up.
          inputField.removeAttribute('placeholder');
          inputField.value = '';

        } finally {
          inputField.removeEventListener('keydown', handler);
        }
      }
    };

    inputField.addEventListener('keydown', handler);
  }

  function save() {
    localStorage.article = article.innerHTML;
    saveButton.textContent = 'Save';
  }

  function load() {
    if (!localStorage) {
      return;
    }

    if (localStorage.theme) {
      switchTheme(localStorage.theme);
    }

    if (localStorage.article) {
      article.innerHTML = localStorage.article;
    }
  }

  function bind(callbacks) {
    for (var sequence in callbacks) {
      (function(descriptionAndCallback) {
        var callback    = descriptionAndCallback.pop();
        var description = descriptionAndCallback.pop();

        Mousetrap.bindGlobal(sequence, function(e) {
          var cancel = true;
          try {
            cancel = !callback.apply(this, arguments);
          } finally {
            if (cancel) {
              e.preventDefault();
            }
          }
        });

        if (!description) {
          return;
        }

        // Populate the shortcuts list
        var shortcutEntry = createElement('tr');
        shortcutsTable.appendChild(shortcutEntry);

        var shortcutSequence = createElement('th');
        shortcutSequence.innerHTML = '<kbd>' + sequence + '</kbd>';
        shortcutEntry.appendChild(shortcutSequence);

        var shortcutDescription = createElement('td');
        shortcutDescription.textContent = description;
        shortcutEntry.appendChild(shortcutDescription);

      }(callbacks[sequence]));
    }
  }

  bind({
    'esc': [function() {
      var autohideElements = document.querySelectorAll('.autohide');
      for (var i = 0; i < autohideElements.length; ++i) {
        hideElement(autohideElements[i]);
      }
    }],

    'enter': ['creates a new element', function(e) {
      if (!e.shiftKey) {
        createNewElement(getCurrentElement().nodeName);
      }
    }],

    'backspace': ['deletes the current element (if empty)', function() {
      if (getCurrentElement().textContent === '') {
        removeCurrentElement();
        return;
      }
      return true;
    }],

    'ctrl+1': ['changes the current element to a top-level heading (<h1>)', function() {
      changeCurrentElementTo('H1');
    }],

    'ctrl+2': ['changes the current element to a subheading (<h2>)', function() {
      changeCurrentElementTo('H2');
    }],

    'ctrl+3': ['changes the current element to a secondary subheading (<h3>)', function() {
      changeCurrentElementTo('H3');
    }],

    'ctrl+p': ['changes the current element to a paragraph (<p>)', function() {
      changeCurrentElementTo('P');
    }],

    'ctrl+l': ['changes the current element to a list item (<li>)', function() {
      changeCurrentElementTo('LI');
    }],

    'ctrl+q': ['changes the current element to a blockquote (<blockquote>)', function() {
      changeCurrentElementTo('BLOCKQUOTE');
    }],

    'ctrl+=': ['increases the width of the article', function() {
      expandArticle();
    }],

    'ctrl+-': ['decreases the width of the article', function() {
      contractArticle();
    }],

    'ctrl+t': ['switches the current theme', function() {
      switchTheme();
    }],

    'ctrl+s': ['saves the article locally', function() {
      save();
    }],

    'ctrl+i': ['makes the selected text italic', function() {
      changeCurrentSelectionTo('EM');
    }],

    'ctrl+b': ['makes the selected text bold', function() {
      changeCurrentSelectionTo('STRONG');
    }],

    'ctrl+r': ['add a reference/hyperlink (<a>)', function() {
      var selection = window.getSelection();
      var anchorNode = selection.anchorNode;
      var range = getRange(selection);

      getInput('Enter a URL', function(url) {
        changeSelectionTo(anchorNode, range, 'A', { href: url });
      });
    }]
  });

  // Whenever the user makes changes...
  article.addEventListener('input', function(e) {

    // ...mark the Save button...
    dirty();

    // ...and update the nav menu (if applicable).
    if (isHeading(e.target.nodeName)) {
      updateNav();
    }
  });

  // Allow the user to save what he/she's written to localStorage.
  saveButton.addEventListener('click', function() {
    save();
  });

  load();
  updateNav();
});

// Helpful stuff for local development
if (inDevMode()) {
  doPeriodically(500, function() {
    var selection = window.getSelection();
    document.getElementById('anchor-offset').textContent = selection.anchorOffset;
    document.getElementById('focus-offset').textContent = selection.focusOffset;
    document.getElementById('total-offset').textContent = getTotalOffset(selection.anchorNode);
  });
}
