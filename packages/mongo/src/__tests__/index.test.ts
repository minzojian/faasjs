import { Mongo } from '../index'
import { Func } from '@faasjs/func'

describe('mongo', function () {
  it('with filename', async function () {
    const mongo = new Mongo({
      config: {
        url: 'mongodb://localhost',
        database: 'test'
      }
    })

    const func = new Func({
      plugins: [mongo],
      async handler () {
        return await mongo.collection('test').find().toArray()
      }
    })
    const handler = func.export().handler

    expect(await handler({})).toEqual([])

    await mongo.client.close()
  })
})
