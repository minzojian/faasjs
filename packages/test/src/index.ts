import { Logger } from '@faasjs/logger'
import {
  Func, ExportedHandler, Plugin, Config
} from '@faasjs/func'
import { loadConfig } from '@faasjs/load'
import { Http } from '@faasjs/http'
import { deepMerge } from '@faasjs/deep_merge'

// 输出 func 的定义以便于测试用例的引用
export * from '@faasjs/func'

/**
 * 自动化测试用的云函数实例
 */
export class FuncWarper {
  [key: string]: any;
  public readonly file: string
  public readonly staging: string
  public readonly logger: Logger
  public readonly func: Func
  public readonly config: Config
  public readonly plugins: Plugin[]
  private readonly _handler: ExportedHandler

  /**
   * 创建测试实例
   * @param file {string} 文件名，必须是完整文件名，建议使用 require.resolve() 来传入
   * @param func {Func} 云函数实例
   * @example new TestCase(require.resolve('../demo.flow.ts'))
   */
  constructor (initBy: Func)
  constructor (initBy: string)
  constructor (initBy: Func | string) {
    this.staging = process.env.FaasEnv
    this.logger = new Logger('TestCase')

    if (typeof initBy === 'string') {
      this.file = initBy
      this.logger.info('Func: [%s] %s', this.staging, this.file)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.func = require(this.file).default
      this.func.config = loadConfig(process.cwd(), this.file)[this.staging]
      this.config = this.func.config
    } else {
      this.func = initBy
      if (initBy.filename)
        this.func.config = deepMerge(
          loadConfig(process.cwd(), initBy.filename)[this.staging],
          initBy.config
        )
    }

    this.plugins = this.func.plugins || []
    for (const plugin of this.plugins) {
      if ([
        'handler',
        'config',
        'plugins',
        'logger',
        'mount'
      ].includes(plugin.type)) continue
      this[plugin.type] = plugin
    }

    this._handler = this.func.export().handler
  }

  public async mount (handler?: ((func: FuncWarper) => Promise<void> | void)): Promise<void> {
    if (!this.func.mounted)
      await this.func.mount({
        event: {},
        context: {}
      })

    if (handler) await handler(this)
  }

  public async handler<TResult = any> (
    event: any = Object.create(null),
    context: any = Object.create(null)
  ): Promise<TResult> {
    await this.mount()

    const response = await this._handler(event, context)
    this.logger.debug('response: %j', response)

    return response
  }

  public async JSONhandler<TData = any> (body?: { [key: string]: any }, options: {
    headers?: { [key: string]: any }
    cookie?: { [key: string]: any }
    session?: { [key: string]: any }
  } = Object.create(null)): Promise<{
      statusCode: number
      headers: {
        [key: string]: string
      }
      body: any
      data?: TData
      error?: {
        message: string
      }
    }> {
    await this.mount()

    const headers = (options.headers) || Object.create(null)

    const http: Http = this.http
    if (http) {
      if (options.cookie)
        for (const key in options.cookie) http.cookie.write(key, options.cookie[key])

      if (options.session) {
        for (const key in options.session) http.session.write(key, options.session[key])
        http.session.update()
      }
      const cookie = http.cookie.headers()['Set-Cookie']?.map(c => c.split(';')[0]).join(';')
      if (cookie)
        if (headers.cookie) headers.cookie += ';' + cookie
        else headers.cookie = cookie
    }

    const response = await this._handler({
      httpMethod: 'POST',
      headers: Object.assign({ 'content-type': 'application/json' }, headers),
      body: typeof body === 'string' ? body : JSON.stringify(body)
    })

    if (response && response.headers && response.body && response.headers['Content-Type']?.includes('json')) {
      const parsedBody = JSON.parse(response.body)
      response.data = parsedBody.data
      response.error = parsedBody.error
    }

    this.logger.debug('response: %j', response)

    return response
  }
}

export function test (initBy: Func | string): FuncWarper {
  const warper = new FuncWarper(initBy as string)

  warper.mount = warper.mount.bind(warper)
  warper.handler = warper.handler.bind(warper)
  warper.JSONhandler = warper.JSONhandler.bind(warper)

  return warper
}
