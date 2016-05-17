var toString = Object.prototype.toString

module.exports = depsSet

function depsSet (data) {
  var depsSet = new Set()

  if (toString.call(data) === '[object Object]') {
    data = [data]
  }

  data.forEach(function (rootDep) {
    recursive(depsSet, rootDep)
  })

  return depsSet
}

function recursive (set, obj) {
  set.add(obj.name)

  if (obj.dependencies && ~Object.keys(obj.dependencies).length) {
    for (var dep in obj.dependencies) {
      recursive(obj.dependencies[dep])
    }
  }
}
