'use strict';
// Находим элемент добавить
const menuNew = document.querySelector('.new');

// Создаем инпут файл для загрузки картинки и прячем его
const input = document.createElement('input');
input.type = 'file';
input.accept = "image/x-png,image/jpeg";
input.style.display = 'none';
input.id = 'uploadInput';

menuNew.appendChild(input);





const dragMenu = new DragMenu(document.querySelector('.menu'));
const bgImageLoader = new BgImageLoader(document.querySelector('.wrap'));
const commentsHandler = new CommentsHandler(bgImageLoader.commentsTools);
const canvasPainting = new CanvasPainting(bgImageLoader.drawTools);
const webSocketConnection = new WebSocketConnection();

canvasPainting.create();
dragMenu.registerEvents();

function throttle(callback) {
	let isWaiting = false;
	return function () {
		if (!isWaiting) {
			callback.apply(this, arguments);
			isWaiting = true;
			requestAnimationFrame(() => {
				isWaiting = false;
			});
		}
	}
}

