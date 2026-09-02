const HEADER = 'bplist00'
const TRAILER_BYTES = 32
const MAC_EPOCH_OFFSET_SECONDS = 978307200

const TYPE_SINGLETON = 0x0
const TYPE_INT = 0x1
const TYPE_REAL = 0x2
const TYPE_DATE = 0x3
const TYPE_DATA = 0x4
const TYPE_ASCII = 0x5
const TYPE_UTF16 = 0x6
const TYPE_UID = 0x8
const TYPE_ARRAY = 0xa
const TYPE_SET = 0xc
const TYPE_DICT = 0xd

const SINGLETON_FALSE = 0x8
const SINGLETON_TRUE = 0x9
const COUNT_FOLLOWS = 0xf

const readUnsigned = (buffer, offset, size) => {
  let value = 0n
  for (let i = 0; i < size; i += 1) value = (value << 8n) | BigInt(buffer[offset + i])
  return value
}

const readInt = (buffer, offset, size) => {
  const value = readUnsigned(buffer, offset, size)
  return Number(size < 8 ? value : BigInt.asIntN(size * 8, value))
}

export const parseBinaryPlist = (buffer) => {
  if (buffer.toString('latin1', 0, HEADER.length) !== HEADER) throw new Error('not a binary plist')

  const trailer = buffer.length - TRAILER_BYTES
  const offsetSize = buffer[trailer + 6]
  const refSize = buffer[trailer + 7]
  const topObject = Number(readUnsigned(buffer, trailer + 16, 8))
  const tableOffset = Number(readUnsigned(buffer, trailer + 24, 8))

  const objectOffset = (index) => Number(readUnsigned(buffer, tableOffset + index * offsetSize, offsetSize))

  const readCount = (offset, info) => {
    if (info !== COUNT_FOLLOWS) return { count: info, start: offset + 1 }
    const size = 1 << (buffer[offset + 1] & 0xf)
    return { count: Number(readUnsigned(buffer, offset + 2, size)), start: offset + 2 + size }
  }

  const readRefs = (start, count) =>
    Array.from({ length: count }, (_, i) => Number(readUnsigned(buffer, start + i * refSize, refSize)))

  const readObject = (index) => {
    const offset = objectOffset(index)
    const type = buffer[offset] >> 4
    const info = buffer[offset] & 0xf

    switch (type) {
      case TYPE_SINGLETON:
        return info === SINGLETON_TRUE ? true : info === SINGLETON_FALSE ? false : null
      case TYPE_INT:
        return readInt(buffer, offset + 1, 1 << info)
      case TYPE_REAL:
        return info === 2 ? buffer.readFloatBE(offset + 1) : buffer.readDoubleBE(offset + 1)
      case TYPE_DATE:
        return new Date((buffer.readDoubleBE(offset + 1) + MAC_EPOCH_OFFSET_SECONDS) * 1000)
      case TYPE_UID:
        return { uid: Number(readUnsigned(buffer, offset + 1, info + 1)) }
      case TYPE_DATA: {
        const { count, start } = readCount(offset, info)
        return buffer.subarray(start, start + count)
      }
      case TYPE_ASCII: {
        const { count, start } = readCount(offset, info)
        return buffer.toString('latin1', start, start + count)
      }
      case TYPE_UTF16: {
        const { count, start } = readCount(offset, info)
        return Buffer.from(buffer.subarray(start, start + count * 2)).swap16().toString('utf16le')
      }
      case TYPE_ARRAY:
      case TYPE_SET: {
        const { count, start } = readCount(offset, info)
        return readRefs(start, count).map(readObject)
      }
      case TYPE_DICT: {
        const { count, start } = readCount(offset, info)
        const keys = readRefs(start, count).map(readObject)
        const values = readRefs(start + count * refSize, count).map(readObject)
        return Object.fromEntries(keys.map((key, i) => [key, values[i]]))
      }
      default:
        throw new Error(`unsupported binary plist object type 0x${type.toString(16)}`)
    }
  }

  return readObject(topObject)
}
