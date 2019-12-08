const F_SIG = 'ƒ'

function isf (c) {
  if (c[0] === F_SIG)
    return c.slice(F_SIG.length, c.length)
  return null
}

function f (c) {
  return F_SIG + c
}

module.exports = {
  _isf: isf,
  _f: f,
  F_SIG,
}
