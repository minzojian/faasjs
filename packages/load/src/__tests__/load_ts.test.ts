import { join } from 'path'
import { loadTs } from '../load_ts'

describe('loadTs', function () {
  test('extend', async function () {
    const res = await loadTs(require.resolve('./extend.ts'), { tmp: true })

    expect(res.module).toEqual('extended')
    expect(res.dependencies).toEqual({})
  })

  test('require', async function () {
    const res = await loadTs(require.resolve('./require.ts'), { tmp: true })

    expect(res.module.default).toEqual('required')
    expect(res.dependencies).toEqual({})
  })

  test('modules', async function () {
    const res = await loadTs(require.resolve('./extend.ts'), {
      tmp: true,
      modules: { additions: ['@faasjs/load'] }
    })

    expect(res.modules).toMatchObject({ '@faasjs/load': join(process.cwd(), 'packages/load') })
  })
})
