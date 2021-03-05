chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
   
      var data = {
        url: extractUrl(),
        title: extractTitle(),
        content: extractCode(),
        speed: extractSpeed(),
        difficulty : extractDifficulty(),
        description : extractDescription(),
        tags : extractTags(),
        lang: extractLang()
      };
      sendResponse(data);
    
  });

function extractUrl() {
  var base = 'https://leetcode.com/problems/';
  var url = window.location.href;
  var end = url.substring(base.length).indexOf('/') + 1 + base.length;
  url = url.substring(0, end);
  return url;
}

function extractTitle() {
  return document.querySelectorAll('div[data-cy="question-title"]')[0].innerText;
}

function extractLang() {
  return document.querySelectorAll('div[data-cy="lang-select"]')[0].innerText;
}

function extractCode() {
  var code = document.getElementsByClassName('CodeMirror-code')[0];
  var list = code.innerText.split('\n');
  var text = '';
  for (var i = 1; i < list.length; i += 2) {
    text += list[i];
    text += '\n';
  }
  return text;
}

function extractTags() {
  var tags = document.getElementsByClassName('tag__2PqS');
  var tagList = [];
  for(i=0; i < tags.length; i++) {
    tagList.push(tags[i].textContent);
  }
  return tagList;
}

function extractDifficulty() {
  var difficultyElement = document.getElementsByClassName('css-10o4wqw')[0];
  var difficultyText =  difficultyElement.getElementsByTagName("div")[0].textContent;
  return difficultyText;
}

function extractDescription() {
  var descriptionElement = document.getElementsByClassName("content__u3I1 question-content__JfgR")[0];
  var descriptionHTML = descriptionElement.outerHTML;
  return descriptionHTML;
}


function extractSpeed() {
  var result = document.getElementsByClassName('ant-table-tbody')[0];
  if (result) {
    var speed = result.childNodes[0].childNodes[2].innerText;
    return speed;
  } else {
    return '';
  }
}
