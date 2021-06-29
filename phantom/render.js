var system = require('system')
var page = require('webpage').create()
var fs = require('fs')
var os = require('system').os
const replace = require('buffer-replace');

// Read in arguments
var args = ['in', 'out', 'cwd', 'runningsPath', 'jsonPath', 'cssPath', 'highlightCssPath', 'paperFormat', 'paperOrientation', 'paperBorder', 'renderDelay', 'loadTimeout'].reduce(function (args, name, i) {
  args[name] = system.args[i + 1]
  return args
}, {})

var html5bpPath = page.libraryPath + '/../html5bp'

// Resources don't load in windows with file protocol
var isWin = os.name === 'windows'
var protocol = isWin ? 'file:///' : 'file://'

var html = fs.read(html5bpPath + '/index.html')
  .replace(/\{\{baseUrl\}\}/g, protocol + html5bpPath)
  .replace('{{content}}', fs.read(args.in))

page.setContent(html, protocol + args.cwd + '/markdown-pdf.html')

// Add custom CSS to the page
page.evaluate(function (cssPaths) {
  var head = document.querySelector('head')

  cssPaths.forEach(function (cssPath) {
    var css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = cssPath

    head.appendChild(css)
  })
}, [args.cssPath, args.highlightCssPath].map(function (cssPath) {
  return (isWin ? protocol : '') + cssPath
}))

// Set the PDF paper size
page.paperSize = paperSize(args.runningsPath, { format: args.paperFormat, orientation: args.paperOrientation, border: isJson(args.paperBorder) ? JSON.parse(args.paperBorder) : args.paperBorder })

args.renderDelay = parseInt(args.renderDelay, 10)

if (args.renderDelay) {
  setTimeout(render, args.renderDelay)
} else {
  var loadTimeout = setTimeout(render, parseInt(args.loadTimeout, 10))
  page.onLoadFinished = function () {
    clearTimeout(loadTimeout)
    render()
  }
}

function render () {
  page.render(args.out)
  page.close()
  window.phantom.exit(0)
}
var runnings = require(args.runningsPath)

function preProcessHeader(pageNum, numPages) {
  var contents = runnings['header'].contents(pageNum, numPages)
  var config = JSON.parse(fs.readFileSync(args.jsonPath, 'utf8'));

  for (const [ key, value ] of Object.entries(config)) {
    contents = replace(contents,`{{${key}}}`, value);
  }
  return contents;
}

function preProcessHeader(pageNum, numPages) {
  var contents = runnings['header'].contents(pageNum, numPages)
  var config = JSON.parse(fs.readFileSync(args.jsonPath, 'utf8'));

  for (const [ key, value ] of Object.entries(config)) {
    contents = replace(contents,`{{${key}}}`, value);
  }
  return contents;
}

function preProcessFooter(pageNum, numPages) {
  var contents = runnings['footer'].contents(pageNum, numPages)
  var config = JSON.parse(fs.readFileSync(args.jsonPath, 'utf8'));

  for (const [ key, value ] of Object.entries(config)) {
    contents = replace(contents,`{{${key}}}`, value);
  }
  return contents;
}

function paperSize (runningsPath, obj) {
  
  if (runnings['header'] && runnings['header'].contents && typeof runnings['header'].contents === 'function'){
    obj['header'] = {
      contents: window.phantom.callback(preProcessHeader)
    }
    if (runnings['header'].height) {
      obj['header'].height = runnings['header'].height
    }
  }
  if (runnings['footer'] && runnings['footer'].contents && typeof runnings['footer'].contents === 'function'){
    obj['footer'] = {
      contents: window.phantom.callback(preProcessFooter)
    }
    if (runnings['footer'].height) {
      obj['footer'].height = runnings['footer'].height
    }
  }
  return obj
}

function isJson (str) { try { JSON.parse(str) } catch (e) { return false } return true }
