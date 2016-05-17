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
      localData.sloc = message.sloc
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
