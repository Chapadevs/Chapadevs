// Not found middleware
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`)
  res.status(404)
  next(error)
}

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Use error's statusCode if set, otherwise use response status, default to 500
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500)
  res.status(statusCode)

  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  })
}

