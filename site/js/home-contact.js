const dialog=document.querySelector('#home-contact-dialog');
const topics={
 rental:{title:'대관문의',description:'전시·행사·촬영 등 공간 사용을 위한 문의입니다. 희망 일정, 사용 목적과 예상 인원을 준비해주세요.'},
 collaboration:{title:'협업·제안',description:'언프레임과 함께할 프로젝트와 협업을 위한 문의입니다. 제안 내용, 희망 일정과 관련 자료를 준비해주세요.'}
};
document.querySelectorAll('[data-contact-kind]').forEach(button=>button.addEventListener('click',()=>{
 const topic=topics[button.dataset.contactKind];if(!topic)return;
 document.querySelector('#home-contact-title').textContent=topic.title;
 document.querySelector('#home-contact-description').textContent=topic.description;
 dialog.showModal();
}));
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
