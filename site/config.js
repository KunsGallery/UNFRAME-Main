// Set mode to "firebase" only after configuring Firebase and deploying security rules.
export const CONFIG = {
  mode: 'demo',
  homeUrl: '/',
  siteUrl: 'https://unframe.kr',
  firebase: {
    apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
  },
  // Add confirmed Imweb menu destinations here. No guessed URLs.
  menuLinks: [{label:'ABOUT',url:'/#about'},{label:'PROJECT',url:'/#projects'},{label:'U.A.U',url:'https://unframe.kr/uau'},{label:'JOIN',url:'https://join.unframe.kr'},{label:'SHOP',url:'https://unframe.kr/shop'}]
};
