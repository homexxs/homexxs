import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');

const ENTITY_MAP = {
  Booking: 'TABLES.bookings',
  User: 'TABLES.users',
  StaffMember: 'TABLES.staff_members',
  Payment: 'TABLES.payments',
  Invoice: 'TABLES.invoices',
  Ticket: 'TABLES.tickets',
  ServiceOffering: 'TABLES.service_offerings',
  InventoryItem: 'TABLES.inventory_items',
  MaterialRequest: 'TABLES.material_requests',
  Notification: 'TABLES.notifications',
  Conversation: 'TABLES.conversations',
  ConversationMessage: 'TABLES.conversation_messages',
  Message: 'TABLES.messages',
  YearPlan: 'TABLES.year_plans',
  Client: 'TABLES.clients',
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('base44Client') && !content.includes('base44.')) return false;

  for (const [entity, table] of Object.entries(ENTITY_MAP)) {
    content = content.replaceAll(`base44.entities.${entity}.list(`, `list(${table}, `);
    content = content.replaceAll(`base44.entities.${entity}.filter(`, `filter(${table}, `);
    content = content.replaceAll(`base44.entities.${entity}.create(`, `create(${table}, `);
    content = content.replaceAll(`base44.entities.${entity}.update(`, `update(${table}, `);
    content = content.replaceAll(`base44.entities.${entity}.delete(`, `remove(${table}, `);
    content = content.replaceAll(`base44.entities.${entity}.subscribe(`, `subscribe(${table}, `);
  }

  content = content.replaceAll('base44.auth.me()', 'getMe()');
  content = content.replaceAll('base44.auth.updateMe(', 'updateMe(');
  content = content.replaceAll('base44.auth.loginViaEmailPassword(', 'signInWithPassword(');
  content = content.replaceAll('base44.auth.register(', 'signUp(');
  content = content.replaceAll('base44.auth.sendPasswordResetEmail(', 'resetPasswordForEmail(');
  content = content.replaceAll('base44.auth.verifyOtp(', 'verifyOtp(');
  content = content.replaceAll('base44.auth.resendOtp(', 'resendOtp(');
  content = content.replaceAll('base44.auth.logout(', 'signOut(');
  content = content.replaceAll("base44.auth.redirectToLogin(\"/AdminLogin\")", "window.location.href = '/SignIn'");
  content = content.replaceAll("base44.auth.redirectToLogin('/AdminLogin')", "window.location.href = '/SignIn'");
  content = content.replaceAll('base44.functions.invoke(', 'invokeFunction(');
  content = content.replaceAll('base44.users.inviteUser(', 'inviteUser(');
  content = content.replaceAll('base44.integrations.Core.UploadFile(', 'uploadFile(');
  content = content.replaceAll('base44.integrations.Core.InvokeLLM(', 'invokeLLM(');

  content = content.replace(/import \{ base44 \} from ["']@\/api\/base44Client["'];?\n?/g, '');

  const needs = {
    db: /\b(list|filter|create|update|remove|subscribe|TABLES)\b/.test(content),
    auth: /\b(getMe|updateMe|signInWithPassword|signUp|signOut|resetPasswordForEmail|verifyOtp|resendOtp)\b/.test(content),
    api: /\b(invokeFunction|inviteUser)\b/.test(content),
    integrations: /\b(uploadFile|invokeLLM)\b/.test(content),
  };

  const imports = [];
  if (needs.db) imports.push("import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';");
  if (needs.auth) {
    const authFns = ['getMe', 'updateMe', 'signInWithPassword', 'signUp', 'signOut', 'resetPasswordForEmail', 'verifyOtp', 'resendOtp']
      .filter(fn => new RegExp(`\\b${fn}\\b`).test(content));
    imports.push(`import { ${authFns.join(', ')} } from '@/lib/auth-helpers';`);
  }
  if (needs.api) {
    const apiFns = ['invokeFunction', 'inviteUser'].filter(fn => new RegExp(`\\b${fn}\\b`).test(content));
    imports.push(`import { ${apiFns.join(', ')} } from '@/lib/api';`);
  }
  if (needs.integrations) {
    const intFns = ['uploadFile', 'invokeLLM'].filter(fn => new RegExp(`\\b${fn}\\b`).test(content));
    imports.push(`import { ${intFns.join(', ')} } from '@/lib/integrations';`);
  }

  if (imports.length) {
    const importBlock = imports.join('\n') + '\n';
    const shebangOrUse = content.match(/^(['"]use strict['"];?\n|import )/);
    if (content.startsWith('import ')) {
      content = importBlock + content;
    } else {
      content = importBlock + content;
    }
  }

  // Deduplicate identical import lines
  const lines = content.split('\n');
  const seen = new Set();
  const deduped = lines.filter(line => {
    if (line.startsWith('import ')) {
      if (seen.has(line)) return false;
      seen.add(line);
    }
    return true;
  });
  content = deduped.join('\n');

  fs.writeFileSync(filePath, content);
  return true;
}

const files = walk(srcDir);
let count = 0;
for (const file of files) {
  if (migrateFile(file)) {
    count++;
    console.log('Migrated:', path.relative(srcDir, file));
  }
}
console.log(`Done. ${count} files migrated.`);
