function getCurrentElement() {
  var selection = window.getSelection();
  var element = selection.anchorNode;

  while (element.nodeType !== 1) {
    element = element.parentNode;
  }

  return element;
}

function focus(element) {
  setTimeout(function() { element.focus(); }, 0);
}

function showElement(element) {
  element.style.display = 'block';
}

function hideElement(element) {
  element.style.display = 'none';
}

function ensureListExists(element) {
  if ((/^UL|OL$/).test(element.parentNode.nodeName)) {
    return;
  }

  var list = document.createElement('UL');
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

function changeElementTo(oldElement, name) {
  if (name === 'LI') {
    ensureListExists(oldElement);
  } else {
    moveAfterList(oldElement);
  }

  var newElement = document.createElement(name);
  newElement.textContent = oldElement.textContent;
  newElement.setAttribute('contenteditable', true);
  oldElement.parentNode.replaceChild(newElement, oldElement);
  focus(newElement);
}

// This isn't working at the moment.
// function changeSelectionTo(name) {
//   var selection = window.getSelection();
//   var range = getMinMax(selection.anchorOffset, selection.focusOffset);
//   var html = getCurrentElement().innerHTML;

//   getCurrentElement().innerHTML = [
//     html.substring(0, range[0]),
//     '<' + name + '>',
//     html.substring(range[0], range[1]),
//     '</' + name + '>',
//     html.substring(range[1])
//   ].join('');
// }

function changeCurrentElementTo(name) {
  changeElementTo(getCurrentElement(), name);
  if (isHeading(name)) {
    updateNav();
  }
}

function createNewElement(name) {
  var oldElement = getCurrentElement();
  var newElement = document.createElement(name);
  newElement.setAttribute('contenteditable', true);
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
  var item = document.createElement('LI');
  item.className = heading.nodeName.toLowerCase();
  navList.appendChild(item);

  var link = document.createElement('A');
  link.textContent = heading.textContent;
  link.setAttribute('href', '#' + heading.id);
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

// Utils
function getMinMax(x, y) {
  return x < y ? [x, y] : [y, x];
}

function doPeriodically(period, callback) {
  setInterval(callback, period);
}

window.addEventListener('load', function() {
  var article = document.querySelector('article');
  var shortcutsTable = document.querySelector('#shortcuts table');
  var saveButton = document.getElementById('save');

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
        var callback    = descriptionAndCallback[1];
        var description = descriptionAndCallback[0];

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

        // Populate the shortcuts list
        var shortcutEntry = document.createElement('tr');
        shortcutsTable.appendChild(shortcutEntry);

        var shortcutSequence = document.createElement('th');
        shortcutSequence.innerHTML = '<kbd>' + sequence + '</kbd>';
        shortcutEntry.appendChild(shortcutSequence);

        var shortcutDescription = document.createElement('td');
        shortcutDescription.innerHTML = description;
        shortcutEntry.appendChild(shortcutDescription);

      }(callbacks[sequence]));
    }
  }

  bind({
    'enter': ['creates a new element', function(e) {
      if (!e.shiftKey) {
        createNewElement(getCurrentElement().nodeName);
      }
    }],

    'backspace': ['deletes the current element (if empty)', function() {
      if (getCurrentElement().textContent === '') {
        removeCurrentElement();
      }
      return true;
    }],

    'ctrl+1': ['changes the current element to a top-level heading', function() {
      changeCurrentElementTo('H1');
    }],

    'ctrl+2': ['changes the current element to a subheading', function() {
      changeCurrentElementTo('H2');
    }],

    'ctrl+3': ['changes the current element to a secondary subheading', function() {
      changeCurrentElementTo('H3');
    }],

    'ctrl+p': ['changes the current element to a paragraph', function() {
      changeCurrentElementTo('P');
    }],

    'ctrl+l': ['changes the current element to a list item', function() {
      changeCurrentElementTo('LI');
    }],

    'ctrl+q': ['changes the current element to a blockquote', function() {
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
    }]

    // Let's not worry about these just yet.
    // 'ctrl+i': function() {
    //   changeSelectionTo('EM');
    // },

    // 'ctrl+b': function() {
    //   changeSelectionTo('STRONG');
    // }
  });

  // Whenever the user makes changes...
  article.addEventListener('input', function(e) {
    // ...mark the Save button...
    saveButton.textContent = 'Save*';

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

doPeriodically(500, function() {
  var aside = document.getElementById('selection');
  var selection = window.getSelection();
  aside.textContent = 'Anchor offset: ' + selection.anchorOffset + ', focus offset: ' + selection.focusOffset;
});
