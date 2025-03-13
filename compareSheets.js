function titleCase(value) { return String(value).charAt(0).toUpperCase() + String(value).slice(1) }
function getProf([key, value]) {
  let profs = ["Untrained", "Trained", "Expert", "Master", "Legendary"];
  let name = titleCase(key);

  return { [name]: profs[value / 2] };
}

function addKeyIfUnassigned(key, obj) {
  key in obj || (obj[key] = {});
}

function addNested(pre, post, objKey, obj) {
  for (const key in post) {
    if (pre[key] !== post[key]) {
      addKeyIfUnassigned(objKey, obj);
      obj[objKey][key] = { pre: pre[key], post: post[key] };
    }
  }
}

/* GOALS: compare sheets and list out differences;; listing out up to the level listed in the NEW sheet
   things to compare:
   - level
   - class
   - ancestry
   - heritage
   - background
   - deity
   - languages
   - ability score
     - ancestry/background/class boosts
     - per level boosts
   - proficiencies (skill + lores)
   - feats [ name, ??, type feat, level, ??, "standard/parent/child", "parent"]

   ! TO DO
   - Rewrite stat increase comparison logic. Pathbuilder provides stat increases in different orders, i.e. +DEX, +INT -> +INT, +DEX
     - Sort it as follows: [STR, DEX, CON, INT, WIS, CHA]
   - Rewrite comparison logics; instead of forin post, compare length of pre and post, and then do a for loop with the larger length.

*/

function compareBuilds({ build: preBuild }, { build: postBuild }) {
  const changelog = {};

  function compareStat(type) {
    let pre = preBuild[type];
    let post = postBuild[type];

    if (type === "languages") {
      pre = pre.join(", ");1
      post = post.join(", ");
    }

    if (pre !== post) {
      changelog[type] = { pre, post };
    }
  }

  function compareAbilities() {
    const { breakdown: preBreakdown, ...preStatline } = preBuild["abilities"];
    const { breakdown: postBreakdown, ...postStatline } = postBuild["abilities"];

    // mods statline
    (() => {
      function getMods(x) {
        return Array.from(Object.entries(x), ([stat, score]) => `${stat.toUpperCase()} ${(score - 10) / 2}`).join(", ");
      }

      const [pre, post] = [preStatline, postStatline].map((x) => getMods(x));

      if (pre !== post) {
        addKeyIfUnassigned("stats", changelog);
        changelog.stats.final = { pre, post };
      }
    })();

    // breakdown
    (() => {
      function getBreakdown({ ancestryFree, ancestryBoosts, ancestryFlaws, backgroundBoosts, classBoosts, mapLevelledBoosts }) {
        // expected output
        // Ancestry: +CHA, +INT, -DEX
        // Background: +INT, +CHA
        // Class: +INT
        // LVL 1: +DEX, +INT, +CHA, +CON
        // so on so forth

        const merge = (arg) => arg.map((x) => `+${x.toUpperCase()}`).join(", ");

        const ancestry = [...ancestryFree.map((x) => `+${x.toUpperCase()}`), ...ancestryBoosts.map((x) => `+${x.toUpperCase()}`), ...ancestryFlaws.map((x) => `-${x.toUpperCase()}`)].join(", ");

        const background = merge(backgroundBoosts);
        const classB = merge(classBoosts);

        let data = { ancestry, background, class: classB };

        for (const level in mapLevelledBoosts) {
          data[`lvl${level}`] = merge(mapLevelledBoosts[level]);
        }

        return data;
      }

      const [pre, post] = [preBreakdown, postBreakdown].map((x) => getBreakdown(x));

      addNested(pre, post, "stats", changelog);
    })();
  }

  function compareproficiencies() {
    const tracking = ["acrobatics", "arcana", "athletics", "crafting", "deception", "diplomacy", "intimidation", "medicine", "nature", "occultism", "performance", "religion", "society", "stealth", "survival", "thievery"];

    const pre = Object.entries(preBuild["proficiencies"]).reduce((obj, [x, y] = val) => (tracking.includes(x) ? { ...obj, ...getProf([x, y]) } : obj), {});
    const post = Object.entries(postBuild["proficiencies"]).reduce((obj, [x, y] = val) => (tracking.includes(x) ? { ...obj, ...getProf([x, y]) } : obj), {});

    addNested(pre, post, "proficiencies", changelog);
  }

  function compareLores() {
    let diff = {};

    [preBuild["lores"], postBuild["lores"]].forEach((loreSet, index) => {
      loreSet.forEach( lore => {
        let key = `Lore (${lore[0]})`;
        addKeyIfUnassigned(key, diff);

        const obj = { pre: diff[key]?.pre ?? "Untrained", post: diff[key]?.post ?? "Untrained" };

        obj[index === 0 ? "pre" : "post"] = getProf(lore)[lore[0]];

        diff[key] = obj;
      })
    });

    for (const key in diff) {
      if (diff[key].pre == diff[key].post) {
        delete diff[key];
      }
    }

    if (Object.entries(diff).length > 0)
    {
      changelog["proficiencies"] = { ...changelog["proficiencies"], ...diff };
    }
  }

  function compareFeats() {
    function getFeats({ feats }) {
      let featList = [["Free Feats as granted from bg, class, race, other feats, etc. + (lvl granted at)"]];

      feats.forEach(([name, opt, type, level, fullLabel, choiceType, childOf], index) => {
        const getName = (xName, xOpt) => `${xName}${xOpt ? ` (${xOpt})` : ""}`;

        if (type === "Awarded Feat") {
          featList[0].push(`${getName(name, opt)} (${level})`);
          return;
        }

        if (type === "Heritage") {
          return;
        }

        if (childOf) {
          featList[featList.length - 1][1] += ` (${name})`;
          return;
        }

        const key = `${level} - ${type}`;
        const val = getName(name, opt);

        featList.push([key, val]);
      });

      return featList;
    }

    const preFeats = getFeats(preBuild);
    const postFeats = getFeats(postBuild);

    const feats = (function getDifferences() {
      let diff = {};

      postFeats.forEach(([key, post]) => {
        let pre = preFeats.find(([prekey]) => key === prekey);
        if (pre !== undefined) pre = pre[1];

        if (pre !== post) {
          addKeyIfUnassigned(key, diff);
          diff[key] = { pre, post };
        }
      });

      return diff;
    })();

    if (Object.keys(feats).length > 0) changelog.feats = feats;
  }

  compareStat("level");
  compareStat("class");
  compareStat("ancestry");
  compareStat("heritage");
  compareStat("background");
  compareStat("deity");
  compareStat("languages");
  compareAbilities();
  compareproficiencies();
  compareLores();
  compareFeats();

  return changelog;
}

function printChangelog(changelog) {
  let output = "## Changelog";

  if (Object.keys(changelog).length === 0) {
    return output += `\nYou have no changes!`
  }

  const outputChange = (key, obj) => `\n*${titleCase(key)}*: ${obj.pre} -> ${obj.post}`;

  for (const key in changelog) {
    switch (key) {
      case 'stats':
        outputStats();
        break;

      case 'proficiencies':
        outputProficiences();
        break;

      case 'feats':
        outputFeats();
        break;

      default:
        output += outputChange(key, changelog[key])
        break;
    }
  }

  function outputStats() {
    output += `\n### Stats`

    if (changelog['stats']['final']) {
      output += `\n     ${changelog['stats']['final']['pre']}\n-> ${changelog['stats']['final']['post']}`;
    }

    for (const type in changelog['stats']) {
      if (type === 'final') { continue; }
      let data = changelog['stats'][type];
      output += outputChange(type, data)
    }
  }

  function outputProficiences() {
    output += `\n### Skills`

    let changesToLore = false;

    for (const type in changelog['proficiencies']) {
      const data = changelog['proficiencies'][type];

      if (changesToLore === false && type.includes('Lore')) {
        output += `\n`;
        changesToLore = true;
      }

      output += outputChange(type, data, {linebreak: false})
    }
  }

  function outputFeats() {
    output += `\n### Feats`

    for (const key in changelog['feats']) {
      const data = changelog['feats'][key];

      if (key.includes('Free Feats')) {
        continue;
      }

      output += outputChange(key, data)
    }

    const freeFeats = Object.keys(changelog['feats']).find( i => i.includes('Free Feats'))
    if (freeFeats) {
      output += `\n\n${freeFeats}\n     ${changelog['feats'][freeFeats]['pre']}\n-> ${changelog['feats'][freeFeats]['post']}`
    }
  }

  output = output.replaceAll('undefined', 'NONE SELECTED');
  output = output.replaceAll('None selected', 'NONE SELECTED');
  output = output.replaceAll('Not set', 'NONE SELECTED');

  return output;
}

export {compareBuilds, printChangelog};