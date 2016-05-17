var toString = Object.prototype.toString

module.exports = depsMap

function depsMap (data) {
  var deps = {}

  if (toString.call(data) === '[object Object]') {
    data = [data]
  }

  data.forEach(function (rootDep) {
    recursive(deps, rootDep)
  })

  return deps
}

function recursive (deps, obj) {
  if (!deps[obj.name]) {
    deps[obj.name] = [obj.version]
  } else {
    deps[obj.name].push(obj.version)
  }

  if (obj.dependencies && ~Object.keys(obj.dependencies).length) {
    for (var dep in obj.dependencies) {
      recursive(obj.dependencies[dep])
    }
  }
}
