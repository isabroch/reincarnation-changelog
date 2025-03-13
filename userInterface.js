import { compareBuilds, printChangelog } from "./compareSheets.js";

(function handleForm () {
  const outputEl = document.querySelector('#output');

  document.querySelector('#selectAll').addEventListener('click', () => {
    outputEl.focus();
    outputEl.select();
  })

  function parseSheet(value) {
    const isValid = value.match(/^{"success":true/gmi);

    if (!isValid) throw new Error ("Must provide Pathbuilder JSON!")

    return JSON.parse(value);
  }

  document.querySelector('#input').addEventListener('submit', (e) => {
    e.preventDefault();

   try {
    const preSheet = parseSheet(document.querySelector('#preSheet').value);
    const postSheet = parseSheet(document.querySelector('#postSheet').value);

    const output = printChangelog(compareBuilds(preSheet, postSheet));

    outputEl.classList.add('loading');
    outputEl.value = "Generating";

    for (let index = 1; index <= 3; index++) {
      setTimeout(() => {
        outputEl.value = `Generating${'.'.repeat(index)}`
      }, 100 * index)
    }

    setTimeout(() => {
      outputEl.classList.remove('loading');
      outputEl.value = output;
    }, 500);
   } catch (error) {
    console.error(error);
    alert('Looks like there was an issue generating your changelog. Are you sure both fields have JSON from Pathbuilder?')
   }
  })
})();

(function handleKeybind () {
  document.documentElement.addEventListener('keypress', (e) => {
    if (e.shiftKey && e.key.toUpperCase() === 'D') {
      if (e.target.id === "output") e.preventDefault();

      if (e.target.id === "postSheet" || e.target.id === "preSheet") return;

      manageMode.toggle(e);
    }
  })
})();

(function autoSaveContent () {
  // saves data
  const save = (key, value) => {
    localStorage.setItem(key, value)
  };

  function load () {
    const preSheet = localStorage.getItem('preSheet');
    const postSheet = localStorage.getItem('postSheet');
    if (preSheet) document.querySelector('#preSheet').value = preSheet;
    if (postSheet) document.querySelector('#postSheet').value = postSheet;
  }

  load();

  // auto save debounce
  let timers = {pre: null, post: null};

  [...document.querySelectorAll('.inputs textarea')].forEach( el => el.addEventListener('input', (e) => {
      let key = e.target.id;

      clearTimeout(timers[key]);

      timers[key] = setTimeout(() => {
        save(e.target.id, e.target.value);
        console.log(`Saved ${e.target.value} at ${e.target.id}`);
      }, 400);
  }));

})();

const manageMode = ( () => {
  const target = document.documentElement;

  (function load() {
    const mode = localStorage.getItem('theme');
    if (mode) target.classList.add(mode);
  })();

  const save = (mode) => {
    localStorage.setItem('theme', mode);
  }

  const toggle = (e) => {
    const shouldBeLight = window.matchMedia('(prefers-color-scheme: dark)') && !target.classList.contains('light');

    target.classList.toggle('light', shouldBeLight);
    target.classList.toggle('dark', !shouldBeLight);

    save(shouldBeLight ? 'light' : 'dark');
  }

  return {toggle}
})();

const handleUI = () => {
};

export { handleUI }