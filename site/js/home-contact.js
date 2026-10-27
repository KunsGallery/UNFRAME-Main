import {t} from './i18n.js';
const dialog=document.querySelector('#home-contact-dialog');
const topics={
 rental:{title:t('contact.rental'),description:t('contact.rentalText')},
 collaboration:{title:t('contact.collab'),description:t('contact.collabText')}
};
document.querySelectorAll('[data-contact-kind]').forEach(button=>button.addEventListener('click',()=>{
 const topic=topics[button.dataset.contactKind];if(!topic)return;
 document.querySelector('#home-contact-title').textContent=topic.title;
 document.querySelector('#home-contact-description').textContent=topic.description;
 dialog.showModal();
}));
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
