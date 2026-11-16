// slider chalao to bhara hua hissa (gulabi) bhi saath chale
const bar = document.querySelector('.progress-bar');
function updateFill() {
    bar.style.setProperty('--fill', bar.value + '%');
}
bar.addEventListener('input', updateFill);
updateFill();
