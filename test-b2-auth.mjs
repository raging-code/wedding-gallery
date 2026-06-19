// test-b2-auth.mjs — run: node test-b2-auth.mjs KEY_ID APP_KEY
const [,, keyId, appKey] = process.argv;
if (!keyId || !appKey) {
  console.error('Usage: node test-b2-auth.mjs KEY_ID APP_KEY');
  process.exit(1);
}

const creds = Buffer.from(`${keyId}:${appKey}`).toString('base64');
console.log('🔑 Testing credentials...');
console.log('   keyId length :', keyId.length);
console.log('   appKey length:', appKey.length);

const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
  headers: { Authorization: `Basic ${creds}` }
});

const body = await res.json();
if (res.ok) {
  console.log('✅ Auth success!');
  console.log('   Account ID  :', body.accountId);
  console.log('   API URL     :', body.apiInfo?.storageApi?.apiUrl);
} else {
  console.log('❌ Auth failed:', res.status);
  console.log('   Reason:', body.message || JSON.stringify(body));
}
