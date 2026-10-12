// Local preview defaults. Netlify builds read UNFRAME_DATA_MODE and FIREBASE_* variables.
// Enable firebase mode only after deploying rules and authorizing Google sign-in.
export const CONFIG = {
  mode: 'demo',
  mediaBaseUrl: 'https://unframe-media.gallerykuns.workers.dev',
  homeUrl: '/',
  siteUrl: 'https://unframe.kr',
  firebase: {
    apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
  },
  // Add confirmed Imweb menu destinations here. No guessed URLs.
  menuLinks: [{label:'ABOUT',url:'/#about'},{label:'PROJECT',url:'/#projects'},{label:'U.A.U',url:'https://unframe.kr/uau'},{label:'JOIN',url:'https://join.unframe.kr'},{label:'SHOP',url:'https://unframe.kr/shop'}]
};
