let upload = document.getElementById('upload');
let generate = document.getElementById('generate');
let repoList = document.getElementById('repos');
let tokenSection = document.getElementById('token_section');
let token = document.getElementById('token');
let tokenButton = document.getElementById('save');
let create = document.getElementById('create');
let info = document.getElementById('info');
let link = document.getElementById('link');
let loading = document.getElementById('loading');
hideLoading();
var currentRepo = '';

upload.onclick = function () {
  showLoading('Uploading...');
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {

    }, function (response) {

      if (response) {
        updateSolution(response);
      } else {
        console.log('error to get response');
        var lastError = chrome.runtime.lastError;
        console.log(lastError.message);
      }
    })
  });
}

generate.onclick = function () {
  chrome.tabs.create({
    active: true,
    url: 'https://github.com/settings/tokens/new?scopes=repo&description=LeetcodeCommit'
  });
}

tokenButton.onclick = function () {
  chrome.storage.sync.set({
    'token': token.value
  });
  tokenSection.style.display = "none";
  getRepos();
}

create.onclick = function () {
  createRepo();
}

github_link.onclick = function () {
  chrome.tabs.create({
    active: true,
    url: 'https://github.com/' + currentRepo
  });
}
option_link.onclick = function () {
  if (tokenSection.style.display == "none") {
    tokenSection.style.display = "block";
  } else {
    tokenSection.style.display = "none";
  }
}

chrome.storage.sync.get(['token'], function (items) {
  if (items['token'] && items['token'].length > 0) {
    token.value = items['token'];
    getRepos();
    tokenSection.style.display = "none";
  } else {
    tokenSection.style.display = "block";
  }
});

repoList.onchange = function () {
  currentRepo = repoList.value;
  chrome.storage.sync.set({
    'repo': currentRepo
  });
}

function delay(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}

function updateSolutionTry(path, solution, file) {
  setTimeout(() => {
    console.log("This Path --------->" + path);
    updateContent(path, {
      message: solution.speed,
      content: encode(solution.content)
    }, function () {
      setTimeout(function () {
        checkReadme(solution, file);
      }, 3000);
    });
  }, 10000);
}


async function updateSolution(solution) {
  var file = solution.title + getExtension(solution.lang);
  var paths = [];
  for (i = 0; i < solution.tags.length; i++) {
    console.log(solution.tags[i]);
    var path = '/repos/' + currentRepo + '/contents/LeetCodeSolutions/' + solution.difficulty + '/' + solution.tags[i] + '/' + solution.title + '/' + file;
    paths.push(path);
  }

  for (i = 0; i < paths.length; i++) {
    await delay(1000);
    updateSolutionTry(paths[i], solution, file);
  }
}
function checkReadme(response, file) {
  var path = '/repos/' + currentRepo + '/contents/README.md';
  getRequest(path)
    .then(result => {
      if (!result.sha) {
        result.sha = '';
      }
      if (!result.content) {
        result.content = '';
      }

      updateREADME(path, {
        content: decode(result.content),
        url: response.url,
        sha: result.sha,
        title: response.title,
        lang: response.lang,
        speed: response.speed,
        file: file
      });
    });
}

function updateREADME(path, source) {
  var readme = generateREADME(source);
  if (source.content == readme) {
    console.log('same data');
    hideLoading();
    return;
  }
  var data = {}
  data.message = source.title + ', ' + source.speed
  data.content = encode(readme);
  data.sha = source.sha;
  post(path, 'PUT', data)
    .then(hideLoading())
}

function generateREADME(data) {
  if (!data.content || !data.content.includes('| # | Title |')) {
    data.content =
      '# Leetcode Solutions\n' +
      '\n' +
      '| # | Title | Solution | Runtime |\n' +
      '|---| ----- | -------- | ------- |\n';
  }
  var list = data.content.split('\n');
  var record = data.title.split('.');
  var number = parseInt(record[0], 10);
  var desc = genDesc(number, record[1], data);
  for (var i = 4; i < list.length; i++) { //TODO binary search
    var line = list[i].substring(1);
    var current = parseInt(line.substring(0, line.indexOf('|')), 10);
    if (current == number) {
      return data.content.replace(list[i] + '\n', desc); //TODO add multi-lang
    } else if (current > number) {
      return insertString(data.content, list[i], desc);
    }
  }
  return data.content + desc;
}

function insertString(source, target, obj) {
  var index = source.indexOf(target);
  return [source.slice(0, index), obj, source.slice(index)].join('');
}

function genDesc(number, title, data) {
  // | # | Title | Solution | Runtime |
  return '|' + number + '|' +
    '[' + title + ']' + '(' + data.url + ')|' +
    '[' + data.lang + '](./solutions/' + encodeURIComponent(data.file) + ')|' +
    data.speed + '|\n';
}

function getRepos() {
  showLoading('Get Repo...');
  chrome.storage.sync.get(['repo'], function (items) {
    while (repoList.options.length > 1) {
      repoList.removeChild(repoList.lastChild);
    }
    currentRepo = items['repo'];
    var opt = document.createElement('option');
    opt.appendChild(document.createTextNode(currentRepo));
    opt.value = currentRepo;
    repoList.appendChild(opt);
    repoList.value = currentRepo;
  });
  getRequest('/user/repos?affiliation=owner')
    .then(result => {
      while (repoList.options.length > 1) {
        repoList.removeChild(repoList.lastChild);
      }
      repoList.selectedIndex = 0;
      for (var i = 0; i < result.length; i++) {
        var repo = result[i];
        var opt = document.createElement('option');
        opt.appendChild(document.createTextNode(repo.full_name));
        opt.value = repo.full_name;
        repoList.appendChild(opt);
        if (repo.name == 'leetcode') {
          create.disabled = true;
        }
      }
      chrome.storage.sync.get(['repo'], function (items) {
        if (validRepo(items['repo'])) {
          currentRepo = items['repo'];
          repoList.value = currentRepo;
        }
      });
      hideLoading();
    });
}

function validRepo(repo) {
  for (var i = 0; i < repoList.length; i++) {
    if (repo == repoList[i].text) {
      return true;
    }
  }
  return false;
}

function createRepo() {
  showLoading('Create repo...')
  var name = 'Leetcode-Solutions';
  post('/user/repos', 'POST', {
    name: name,
    private: true
  })
    .then(obj => {
      chrome.storage.sync.set({
        'repo': obj['full_name']
      }, function (result) {
        getRepos();
      });
    });
}

function updateContent(path, data, callback) {
  getRequest(path)
    .then(result => {
      if (result['sha']) {
        data.sha = result['sha'];
        if (data.content == result['content'].split('\n').join('')) {
          console.log('same data');
          callback();
          return;
        }
      }
      post(path, 'PUT', data)
        .then(callback());
    });
}

function getExtension(lang) {
  switch (lang) {
    case 'C++':
      return '.cpp';
    case 'C#':
      return '.cs';
    case 'JavaScript':
      return '.js';
    case 'Kotlin':
      return '.ks'
    case 'MySQL', 'MS SQL', 'Oracle':
      return '.sql';
    case 'Python', 'Python3':
      return '.py';
    case 'Ruby':
      return '.rb';
    case 'Rust':
      return '.rs';
    case 'TypeScript':
      return '.ts';
    default:
      return '.' + lang.toLowerCase();
  }
}

// function createQuestionReadme(path, title, description) {
//   console.log(description);
//   getRequest(path).then(result => {
//     if (!result.sha) {
//       result.sha = '';
//     }
//     if (!result.content) {
//       result.content = '';
//     }
//     const turndownService = new TurndownService();

//     // convert HTML to Markdown
//     var descriptionMD = turndownService.turndown(description);

//     var data = {}
//     data.message = title;
//     data.content = encode(descriptionMD);
//     data.sha = result.sha;
//     post(path, 'PUT', data).then(hideLoading())
//   });

// }
