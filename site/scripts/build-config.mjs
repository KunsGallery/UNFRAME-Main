export const FIREBASE_ENV_KEYS = {
 apiKey: 'FIREBASE_API_KEY',
 authDomain: 'FIREBASE_AUTH_DOMAIN',
 projectId: 'FIREBASE_PROJECT_ID',
 storageBucket: 'FIREBASE_STORAGE_BUCKET',
 messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
 appId: 'FIREBASE_APP_ID'
};
export function resolveBuildConfig(source,env={}) {
 const mode=env.UNFRAME_DATA_MODE?.trim() || source.mode;
 if(!['demo','firebase'].includes(mode))throw new Error('UNFRAME_DATA_MODE must be demo or firebase.');
 const firebase={...source.firebase};
 for(const [field,key]of Object.entries(FIREBASE_ENV_KEYS))if(env[key]?.trim())firebase[field]=env[key].trim();
 if(mode==='firebase'){
  const missing=Object.entries(FIREBASE_ENV_KEYS).filter(([field])=>!firebase[field]).map(([,key])=>key);
  if(missing.length)throw new Error('Missing Firebase build settings: '+missing.join(', '));
 }
 return {...source,mode,firebase};
}
