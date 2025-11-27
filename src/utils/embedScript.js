export function generateEmbedScript(serverUrl) {
  const envContext = serverUrl.includes('localhost') ? 'Development' : 'Production';

  console.log('\n\x1b[32m%s\x1b[0m', '✅ Сборка успешно завершена!');
  console.log('\n\x1b[35m%s\x1b[0m', `=== ${envContext} Environment ===`);
  console.log('\x1b[90m%s\x1b[0m', `Server URL: ${serverUrl}`);
  
  console.log('\n\x1b[36m%s\x1b[0m', '📄 Где смотреть:');
  console.log('\x1b[33m%s\x1b[0m', `   • Полноэкранный чат: ${serverUrl}/fullchat.html`);
  console.log('\x1b[33m%s\x1b[0m', `   • Popup чат: ${serverUrl}/index.html`);
  console.log('\x1b[33m%s\x1b[0m', `   • Web модуль: ${serverUrl}/dist/web.js`);
  console.log('\n');
}
