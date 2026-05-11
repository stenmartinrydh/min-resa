export function requestLogger(req, res, next) {
  const start = Date.now()
  const { method, url } = req

  res.on('finish', () => {
    const ms = Date.now() - start
    const status = res.statusCode
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'
    console.log(`${color}${method} ${url} ${status}\x1b[0m — ${ms}ms`)
  })

  next()
}
