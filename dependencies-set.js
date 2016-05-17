var toString = Object.prototype.toString

module.exports = depsSet

function depsSet (data) {
  var depsSet = {}

  if (toString.call(data) !== '[object Object]') {
    throw new Error('Data should be an object.')
  }

  Object.keys(data).forEach(function (rootDep) {
    recursive(depsSet, data[rootDep])
  })

  for (var dep in depsSet) {
    depsSet[dep] = Array.from(depsSet[dep])
  }

  return depsSet
}

function recursive (set, obj) {
  if (!set[obj.name]) {
    set[obj.name] = new Set()
  }
  set[obj.name].add(obj.version)

  if (obj.dependencies && ~Object.keys(obj.dependencies).length) {
    for (var dep in obj.dependencies) {
      recursive(set, obj.dependencies[dep])
    }
  }
}
