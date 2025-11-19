export class AuthError extends Error {
  public statusCode: number
  
  constructor(message: string, statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized - authentication required') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = 'Forbidden - admin access required') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}
