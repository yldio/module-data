var cluster = require('cluster')
var path = require('path')
var numCPUs = require('os').cpus().length

module.exports = SlocApi

function SlocApi (refErr) {
  var self = this
  self.work = {}

  cluster.setupMaster({
    exec: path.resolve(__dirname, 'sloc-worker.js'),
    silent: true
  })

  for (var i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  self.workers = cluster.workers
  self.roundRobin = Object.keys(self.workers)

  var exitWorkerThreshold = 5
  var workersOnline = 0
  var checkWorkersHealth = setTimeout(function () {
    cluster.disconnect(function () {
      self.work = {}
      refErr.err = new Error('Something went wrong with forking the workers required.')
    })
  }, 2000)

  cluster.on('online', function () {
    workersOnline += 1

    // If true we are ready to get work done
    if (workersOnline === numCPUs) {
      clearTimeout(checkWorkersHealth)

      cluster.on('message', self.messageHandler.bind(self))
      cluster.on('disconnect', function (worker) {
        var flag = !(worker.suicide || worker.exitedAfterDisconnect)

        // Workers has exited involuntary
        if (flag) {
          exitWorkerThreshold -= 1

          if (exitWorkerThreshold < 0) {
            refErr.err = new Error('Something is killing the workers.')
            return
          }

          cluster.fork()
        }
      })
    }
  })
}

SlocApi.prototype.messageHandler = function (message) {
  if (this.work[message.id]) {
    this.work[message.id].forEach(function (localData) {
      // Update ref with sloc
      localData.sloc = {
        pkg: message.sloc
      }
    })

    // Remove job from the work list
    delete this.work[message.id]

    // Send ack message to children
    this.workers[message.workerId].send({
      ack: true,
      id: message.id
    })
  }
}

SlocApi.prototype.done = function (cb) {
  var self = this

  var timeout = setInterval(function () {
    if (!Object.keys(self.work).length > 0) {
      cluster.disconnect(function () {
        cb()
      })
      clearInterval(timeout)
    }
  }, 100)
}

SlocApi.prototype.exec = function (localData, modulePath) {
  var jobId = localData.name + '@' + localData.version

  // check if jobs already exists, if it
  // does just push the ref
  if (this.work[jobId]) {
    this.work[jobId].push(localData)
  } else {
    // New job
    this.work[jobId] = [localData]

    // Get a worker and rotate workers
    var workerId = this.roundRobin.shift()
    this.roundRobin.push(workerId)

    // Send work to worker
    this.workers[workerId].send({
      id: jobId,
      path: modulePath
    })
  }
}

SlocApi.countReal = function countRecursively (obj, cursor, slocCursor, isBottom) {
  cursor = cursor || []
  slocCursor = slocCursor || []

  if (isBottom) {
    slocCursor.reverse()

    slocCursor.forEach(function (obj) {
      obj.sloc.real = obj.sloc.pkg

      // Sum all children sloc
      for (var dep in obj.children) {
        obj.sloc.real += obj.children[dep].real
      }
    })
  } else {
    var closestChildWithGrandChilds

    // Check if cursor is empty
    if (cursor.length < 1) {
      var childrenKeys = Object.keys(obj.dependencies)

      for (var i = 0; i < childrenKeys.length; i++) {
        if (closestChildWithGrandChilds) {
          break
        }
        var key = childrenKeys[i]
        var depsOfDeps = obj.dependencies[key].dependencies

        if (depsOfDeps && Object.keys(depsOfDeps).length > 0) {
          closestChildWithGrandChilds = obj.dependencies[key]
        }
      }

      cursor.push({obj: obj, keys: childrenKeys})
      slocCursor.push({
        sloc: obj.sloc,
        children: getSlocChildren(obj.dependencies)
      })
    } else {
      var newCursor = []

      cursor.forEach(function (pos) {
        pos.keys.forEach(function (key) {
          var depsOfDeps = pos.obj.dependencies[key].dependencies

          var childrenKeys = Object.keys(depsOfDeps)
          if (childrenKeys.length > 0) {
            if (!closestChildWithGrandChilds) {
              closestChildWithGrandChilds = pos.obj.dependencies[key]
            }

            newCursor.push({ obj: pos.obj.dependencies[key], keys: childrenKeys })
          }

          slocCursor.push({
            sloc: pos.obj.dependencies[key].sloc,
            children: getSlocChildren(depsOfDeps)
          })
        })
      })

      cursor = newCursor
    }

    if (!closestChildWithGrandChilds) {
      isBottom = true
    }

    countRecursively(closestChildWithGrandChilds, cursor, slocCursor, isBottom)
  }

  function getSlocChildren (deps) {
    var childrenSloc = {}

    Object.keys(deps).forEach(function (dep) {
      childrenSloc[dep] = deps[dep].sloc
    })

    return childrenSloc
  }
}
