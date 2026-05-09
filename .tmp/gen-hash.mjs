import bcrypt from 'bcryptjs'
const hash = await bcrypt.hash('admin123', 12)
console.log(hash)
const valid = await bcrypt.compare('admin123', hash)
console.log('verify:', valid)
