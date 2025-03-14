import { compareBuilds, printChangelog } from "./compareSheets.js";

(function handleForm() {
  const outputEl = document.querySelector("#output");
  const alerts = document.querySelector('.alerts');

  document.querySelector("#selectAll").addEventListener("click", () => {
    outputEl.focus();
    outputEl.select();
    outputEl.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(outputEl.value);

    console.log(`Copied:\n${outputEl.value}`);

    const alert = document.createElement('div');
    alert.classList.add('alert');
    alert.innerHTML = `<p>Copied to  clipboard!</p>`;
    alerts.insertAdjacentElement("beforeend", alert);

    // after 2 secs transition out, and then delete
    setTimeout(() => {
      alert.classList.add('is-exiting');

      setTimeout( () => {
        alerts.removeChild(alert)
      }, 500)
    }, 2000);

  });

  function parseSheet({value, id}) {
    try {
      const isValid = value.match(/^{\s*?"success":\s?true/gim);
      if (!isValid) throw new Error("Must provide Pathbuilder JSON!");
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`Issue parsing ${id}`)
    }
  }

  document.querySelector("#input").addEventListener("submit", (e) => {
    e.preventDefault();

    try {
      const preSheet = parseSheet(document.querySelector("#preSheet"));
      const postSheet = parseSheet(document.querySelector("#postSheet"));

      const output = printChangelog(compareBuilds(preSheet, postSheet));

      outputEl.classList.add("loading");
      outputEl.value = "Generating";

      for (let index = 1; index <= 3; index++) {
        setTimeout(() => {
          outputEl.value = `Generating${".".repeat(index)}`;
        }, 100 * index);
      }

      setTimeout(() => {
        outputEl.classList.remove("loading");
        outputEl.value = output;
      }, 500);
    } catch (error) {
      console.error(error);
      alert("Looks like there was an issue generating your changelog. Are you sure both fields have JSON from Pathbuilder?");
    }
  });
})();

(function handleKeybind() {
  document.documentElement.addEventListener("keypress", (e) => {
    if (e.shiftKey && e.key.toUpperCase() === "D") {
      if (e.target.id === "output") e.preventDefault();

      if (e.target.id === "postSheet" || e.target.id === "preSheet") return;

      manageMode.toggle(e);
    }
  });
})();

(function autoSaveContent() {
  // saves data
  const labelInput = (value, target) => {
    let text;
    try {
      const hasData = value.match(/"build":\s*?{\s*?"name":\s*?"(.*?)",\s*?"class":\s*?"(.*?)",\s*?.*?\s*?"level":\s*?(\d+)/i);

      if (hasData) {
        JSON.parse(value);
        const [match, charName, charClass, charLevel] = hasData;
        text = `${charName}, ${charClass} ${charLevel}`;
      } else if (value === "") {
        text = "";
      } else {
        throw new Error("Invalid input");
      }
    } catch (error) {
      console.error(error, "on " + target.id)
      text = "<span class='invalid'></span>invalid input"
    }

    target.parentElement.querySelector("span small").innerHTML = text;
  }

  const save = (target) => {
    const { id: key, value } = target;

    labelInput(value, target);

    localStorage.setItem(key, value);
  };

  function load() {
    const preSheet = localStorage.getItem("preSheet");
    const postSheet = localStorage.getItem("postSheet");
    if (preSheet) {
      let target = document.querySelector("#preSheet");
      target.value = preSheet;
      labelInput(preSheet, target);
    }
    if (postSheet) {
      let target = document.querySelector("#postSheet");
      target.value = postSheet
      labelInput(postSheet, target);
    }
  }

  load();

  // auto save debounce
  let timers = { pre: null, post: null };

  [...document.querySelectorAll(".inputs textarea")].forEach((el) =>
    el.addEventListener("input", (e) => {
      let key = e.target.id;

      clearTimeout(timers[key]);

      timers[key] = setTimeout(() => {
        save(e.target);
        // console.log(`Saved ${e.target.value} at ${e.target.id}`);
      }, 400);
    })
  );
})();

const manageMode = (() => {
  const target = document.documentElement;

  (function load() {
    const mode = localStorage.getItem("theme");
    if (mode) target.classList.add(mode);
  })();

  const save = (mode) => {
    localStorage.setItem("theme", mode);
  };

  const toggle = (e) => {
    const shouldBeLight = window.matchMedia("(prefers-color-scheme: dark)") && !target.classList.contains("light");

    target.classList.toggle("light", shouldBeLight);
    target.classList.toggle("dark", !shouldBeLight);

    save(shouldBeLight ? "light" : "dark");
  };

  return { toggle };
})();

const handleUI = () => {};

export { handleUI };
