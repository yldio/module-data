var fs = require('fs')
var cluster = require('cluster')
var sloc = require('sloc')
var async = require('async')
var path = require('path')
var recursive = require('recursive-readdir')

if (!cluster.isWorker) {
  process.exit(1)
}

var confirm = {}

process.on('message', function (worker, message) {
  if (arguments.length === 2) {
    message = worker
    worker = undefined
  }

  if (message.ack) {
    clearInterval(confirm[message.id])
    delete confirm[message.id]
    return
  }

  return async.waterfall([
    scanPath(message.path),
    getContentFromFiles,
    countSloc,
    sendMessageBack(message.id)
  ], function (err) {
    if (err) {
      throw err
    }
  })
})

// Get all .js files from a path
function scanPath (mdlPath) {
  return function (next) {
    return recursive(mdlPath, [onlySrcFiles], function (err, files) {
      if (err) {
        return next(err)
      }

      files = files.filter(onlyJsFiles)

      return next(null, files)
    })
  }

  function onlySrcFiles (file) {
    file = file.replace(mdlPath, '')

    return !!file.match(/node_modules|examples|test|\.git/g)
  }

  function onlyJsFiles (file) {
    file = path.basename(file)
    return !!file.match(/\.js$|\.json$/g)
  }
}

function getContentFromFiles (filesPath, next) {
  filesPath = filesPath || []

  return async.map(filesPath, readFileUTF8, next)

  function readFileUTF8 (item, next) {
    return fs.readFile(item, 'utf8', next)
  }
}

function countSloc (filesContent, next) {
  filesContent = filesContent || []

  var totalSloc = filesContent.map(count)

  if (totalSloc.length > 0) {
    totalSloc = totalSloc.reduce(sum)
  } else {
    totalSloc = 0
  }

  next(null, totalSloc)

  function count (content) {
    var stats = sloc(content, 'js')

    return stats.total || 0
  }

  function sum (a, b) {
    return a + b
  }
}

function sendMessageBack (id) {
  return function (sloc, next) {
    var msg = {
      id: id,
      sloc: sloc || 0,
      workerId: cluster.worker.id
    }

    confirm[id] = setInterval(function () {
      if (cluster.worker.isConnected()) {
        process.send(msg)
      } else {
        clearInterval(confirm[id])
        delete confirm[id]
      }
    }, 100)

    process.send(msg)

    next()
  }
}
