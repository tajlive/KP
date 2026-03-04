import fs from 'fs'
import path from 'path'

const messagesDir = path.join(process.cwd(), 'messages')

interface Messages {
  [key: string]: any
}

function deepMerge(target: Messages, source: Messages, path = ''): void {
  for (const key of Object.keys(source)) {
    const fullPath = path ? `${path}.${key}` : key
    
    if (!(key in target)) {
      console.log(`➕ Legger til i target: ${fullPath}`)
      target[key] = source[key]
    } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      if (typeof target[key] !== 'object' || target[key] === null) {
        console.log(`⚠️  Erstatter i target (var ikke objekt): ${fullPath}`)
        target[key] = source[key]
      } else {
        deepMerge(target[key], source[key], fullPath)
      }
    }
  }
}

function findMissingKeys(source: Messages, target: Messages, prefix = ''): string[] {
  const missing: string[] = []
  
  for (const key of Object.keys(source)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    
    if (!(key in target)) {
      missing.push(fullKey)
    } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      if (typeof target[key] === 'object' && target[key] !== null) {
        missing.push(...findMissingKeys(source[key], target[key], fullKey))
      }
    }
  }
  
  return missing
}

async function main() {
  console.log('🌍 Synkroniserer i18n-filer...\n')
  
  const noPath = path.join(messagesDir, 'no.json')
  const enPath = path.join(messagesDir, 'en.json')
  
  const noJson: Messages = JSON.parse(fs.readFileSync(noPath, 'utf-8'))
  const enJson: Messages = JSON.parse(fs.readFileSync(enPath, 'utf-8'))
  
  console.log('📋 Sjekker manglende keys...\n')
  
  const missingInEn = findMissingKeys(noJson, enJson)
  const missingInNo = findMissingKeys(enJson, noJson)
  
  if (missingInEn.length > 0) {
    console.log('❌ Mangler i EN (eksisterer i NO):')
    missingInEn.forEach(k => console.log(`   - ${k}`))
    console.log()
  }
  
  if (missingInNo.length > 0) {
    console.log('❌ Mangler i NO (eksisterer i EN):')
    missingInNo.forEach(k => console.log(`   - ${k}`))
    console.log()
  }
  
  if (missingInEn.length === 0 && missingInNo.length === 0) {
    console.log('✅ Ingen manglende keys!\n')
    return
  }
  
  console.log('🔧 Fikser manglende keys...\n')
  
  // Legg til manglende keys i EN fra NO (med "TODO" markering)
  for (const key of missingInEn) {
    const value = getNestedValue(noJson, key)
    if (value !== undefined) {
      setNestedValue(enJson, key, typeof value === 'string' ? `[TODO] ${value}` : value)
    }
  }
  
  // Legg til manglende keys i NO fra EN (med "TODO" markering)
  for (const key of missingInNo) {
    const value = getNestedValue(enJson, key)
    if (value !== undefined) {
      setNestedValue(noJson, key, typeof value === 'string' ? `[TODO] ${value}` : value)
    }
  }
  
  // Skriv tilbake
  fs.writeFileSync(noPath, JSON.stringify(noJson, null, 2) + '\n', 'utf-8')
  fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2) + '\n', 'utf-8')
  
  console.log(`✅ Synkronisering fullført!`)
  console.log(`   NO: ${Object.keys(noJson).length} toppnivå-keys`)
  console.log(`   EN: ${Object.keys(enJson).length} toppnivå-keys`)
  console.log(`\n⚠️  Søk etter "[TODO]" i filene og oversett manuelt.`)
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj)
}

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((curr, key) => {
    if (!(key in curr)) curr[key] = {}
    return curr[key]
  }, obj)
  target[lastKey] = value
}

main().catch(console.error)
