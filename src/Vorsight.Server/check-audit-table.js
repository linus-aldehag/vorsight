const db = require('./src/db/database');

console.log('=== Audit Events Table Schema ===');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='audit_events'").get();

if (schema) {
    console.log(schema.sql);
} else {
    console.log('❌ Table "audit_events" does not exist!');
}

console.log('\n=== Table Record Count ===');
const count = db.prepare('SELECT COUNT(*) as count FROM audit_events').get();
console.log(`Total audit events: ${count.count}`);

console.log('\n=== All Tables in Database ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(`  - ${t.name}`));
