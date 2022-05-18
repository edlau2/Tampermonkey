
const handleClick = function(ev) {console.log('[handleClick] ev: ', ev);};
let checkboxes = document.getElementsByTag('input');
for (let i=0; i < checkboxes.length; i++) {
  checkboxes[i].addEventListener('click', handleClick);
}
